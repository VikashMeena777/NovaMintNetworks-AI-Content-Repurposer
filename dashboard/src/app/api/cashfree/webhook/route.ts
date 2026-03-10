import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, type Plan } from "@/lib/types";
import { Cashfree, CFEnvironment } from "cashfree-pg";

// Initialize Cashfree SDK v5 for Webhook Verification
const cashfree = new Cashfree(
    process.env.CASHFREE_ENV === "PRODUCTION" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
    process.env.CASHFREE_APP_ID!,
    process.env.CASHFREE_SECRET_KEY!
);

/**
 * POST /api/cashfree/webhook
 *
 * Receives Cashfree webhook events for payment and subscription lifecycle.
 * This route is NOT protected by auth — it uses webhook signature verification.
 *
 * Events handled:
 * - PAYMENT_SUCCESS          → Payment captured, upgrade plan
 * - PAYMENT_USER_DROPPED     → User abandoned payment
 * - PAYMENT_FAILED           → Payment failed
 * - SUBSCRIPTION_NEW         → New subscription created
 * - SUBSCRIPTION_PAYMENT_SUCCESS → Recurring payment successful
 * - SUBSCRIPTION_CANCELLED   → Subscription cancelled
 * - SUBSCRIPTION_EXPIRED     → Subscription expired
 */

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const timestamp = request.headers.get("x-webhook-timestamp") || request.headers.get("x-cashfree-timestamp") || "";
    const signature = request.headers.get("x-webhook-signature") || request.headers.get("x-cashfree-signature") || "";

    // Verify webhook signature using Cashfree SDK
    try {
        cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    } catch (err) {
        console.error("Cashfree webhook signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type as string;
    const eventData = event.data || {};

    console.log(`Cashfree webhook: ${eventType}`);

    const supabase = getServiceClient();

    try {
        switch (eventType) {
            case "PAYMENT_SUCCESS": {
                const order = eventData.order || {};
                const payment = eventData.payment || {};
                const tags = order.order_tags || {};

                const userId = tags.user_id;
                const plan = tags.plan as Plan;
                const period = tags.period || "monthly";

                if (!userId || !plan) {
                    console.log("Missing user_id or plan in order tags");
                    break;
                }

                const planInfo = PLAN_LIMITS[plan];
                if (!planInfo) break;

                // Calculate period end
                const now = new Date();
                const periodEnd = new Date(now);
                if (period === "one_time") {
                    periodEnd.setDate(periodEnd.getDate() + 30);
                } else if (period === "monthly") {
                    periodEnd.setMonth(periodEnd.getMonth() + 1);
                } else {
                    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                }

                // Upgrade user
                await supabase
                    .from("profiles")
                    .update({
                        plan,
                        clips_limit: planInfo.clips,
                        videos_limit: planInfo.videos,
                        clips_used: 0,
                        videos_used: 0,
                        cashfree_order_id: order.order_id || null,
                        cashfree_customer_id: payment.customer_id || null,
                        subscription_status: period === "one_time" ? "none" : "active",
                        plan_period: period,
                        current_period_end: periodEnd.toISOString(),
                    })
                    .eq("id", userId);

                // Log payment
                const amount = period === "annual"
                    ? planInfo.annualPrice * 12
                    : planInfo.monthlyPrice;

                await supabase.from("payments").insert({
                    user_id: userId,
                    cashfree_order_id: order.order_id || "",
                    cashfree_payment_id: payment.cf_payment_id?.toString() || null,
                    cf_payment_id: payment.cf_payment_id?.toString() || null,
                    amount,
                    currency: payment.payment_currency || "INR",
                    plan,
                    plan_period: period,
                    status: "captured",
                });
                break;
            }

            case "PAYMENT_FAILED":
            case "PAYMENT_USER_DROPPED": {
                const order = eventData.order || {};
                const payment = eventData.payment || {};
                const tags = order.order_tags || {};

                const userId = tags.user_id;
                if (!userId) break;

                // Log failed payment
                await supabase.from("payments").insert({
                    user_id: userId,
                    cashfree_order_id: order.order_id || "",
                    cashfree_payment_id: payment.cf_payment_id?.toString() || null,
                    cf_payment_id: payment.cf_payment_id?.toString() || null,
                    amount: Math.round((order.order_amount || 0) * 100),
                    currency: order.order_currency || "INR",
                    plan: tags.plan || "creator",
                    plan_period: tags.period || "monthly",
                    status: "failed",
                });
                break;
            }

            case "SUBSCRIPTION_PAYMENT_SUCCESS": {
                const subscription = eventData.subscription || {};
                const tags = subscription.subscription_tags || {};

                const userId = tags.user_id;
                const plan = tags.plan as Plan;
                if (!userId || !plan) break;

                const planInfo = PLAN_LIMITS[plan];
                if (!planInfo) break;

                // Renew period and reset usage
                const periodEnd = new Date();
                if (tags.period === "annual") {
                    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                } else {
                    periodEnd.setMonth(periodEnd.getMonth() + 1);
                }

                await supabase
                    .from("profiles")
                    .update({
                        clips_used: 0,
                        videos_used: 0,
                        subscription_status: "active",
                        current_period_end: periodEnd.toISOString(),
                    })
                    .eq("id", userId);
                break;
            }

            case "SUBSCRIPTION_CANCELLED": {
                const subscription = eventData.subscription || {};
                const tags = subscription.subscription_tags || {};

                const userId = tags.user_id;
                if (!userId) break;

                await supabase
                    .from("profiles")
                    .update({ subscription_status: "cancelled" })
                    .eq("id", userId);
                break;
            }

            case "SUBSCRIPTION_EXPIRED": {
                const subscription = eventData.subscription || {};
                const tags = subscription.subscription_tags || {};

                const userId = tags.user_id;
                if (!userId) break;

                // Downgrade to free
                await supabase
                    .from("profiles")
                    .update({
                        plan: "free",
                        clips_limit: 5,
                        videos_limit: 2,
                        subscription_status: "none",
                        cashfree_subscription_id: null,
                        current_period_end: null,
                    })
                    .eq("id", userId);
                break;
            }

            default:
                console.log(`Unhandled Cashfree event: ${eventType}`);
        }

        return NextResponse.json({ status: "ok" });
    } catch (err) {
        console.error("Webhook processing error:", err);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}
