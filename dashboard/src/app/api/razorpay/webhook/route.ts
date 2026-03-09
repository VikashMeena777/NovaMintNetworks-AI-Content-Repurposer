import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, type Plan } from "@/lib/types";

/**
 * POST /api/razorpay/webhook
 *
 * Receives Razorpay webhook events for subscription lifecycle management.
 * This route is NOT protected by auth — it uses webhook signature verification.
 *
 * Events handled:
 * - subscription.activated  → Plan activated
 * - subscription.charged    → Recurring payment successful (renew period)
 * - subscription.cancelled  → User cancelled subscription
 * - subscription.paused     → Subscription paused
 * - subscription.completed  → Subscription ended naturally
 * - payment.failed          → Payment failed
 */

// Use Supabase service role client (bypasses RLS for server-side updates)
function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: NextRequest) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error("RAZORPAY_WEBHOOK_SECRET not configured");
        return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    // Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

    if (expectedSignature !== signature) {
        console.error("Webhook signature mismatch");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event as string;
    const payload = event.payload;

    console.log(`Razorpay webhook: ${eventType}`);

    const supabase = getServiceClient();

    try {
        switch (eventType) {
            case "subscription.activated": {
                const sub = payload.subscription?.entity;
                if (!sub) break;

                const userId = sub.notes?.user_id;
                const plan = sub.notes?.plan as Plan;
                if (!userId || !plan) break;

                const planInfo = PLAN_LIMITS[plan];

                await supabase
                    .from("profiles")
                    .update({
                        plan,
                        clips_limit: planInfo.clips,
                        videos_limit: planInfo.videos,
                        razorpay_subscription_id: sub.id,
                        razorpay_customer_id: sub.customer_id || null,
                        subscription_status: "active",
                        current_period_end: sub.current_end
                            ? new Date(sub.current_end * 1000).toISOString()
                            : null,
                    })
                    .eq("id", userId);
                break;
            }

            case "subscription.charged": {
                const sub = payload.subscription?.entity;
                const payment = payload.payment?.entity;
                if (!sub || !payment) break;

                const userId = sub.notes?.user_id;
                const plan = sub.notes?.plan as Plan;
                const period = sub.notes?.period || "monthly";
                if (!userId) break;

                // Renew period end and reset usage
                await supabase
                    .from("profiles")
                    .update({
                        clips_used: 0,
                        videos_used: 0,
                        subscription_status: "active",
                        current_period_end: sub.current_end
                            ? new Date(sub.current_end * 1000).toISOString()
                            : null,
                    })
                    .eq("id", userId);

                // Log payment
                await supabase.from("payments").insert({
                    user_id: userId,
                    razorpay_payment_id: payment.id,
                    razorpay_subscription_id: sub.id,
                    amount: payment.amount,
                    currency: payment.currency || "INR",
                    plan: plan || "creator",
                    plan_period: period,
                    status: "captured",
                });
                break;
            }

            case "subscription.cancelled": {
                const sub = payload.subscription?.entity;
                if (!sub) break;

                const userId = sub.notes?.user_id;
                if (!userId) break;

                // Don't downgrade immediately — let them use till period end
                await supabase
                    .from("profiles")
                    .update({
                        subscription_status: "cancelled",
                    })
                    .eq("id", userId);
                break;
            }

            case "subscription.paused": {
                const sub = payload.subscription?.entity;
                if (!sub) break;

                const userId = sub.notes?.user_id;
                if (!userId) break;

                await supabase
                    .from("profiles")
                    .update({ subscription_status: "paused" })
                    .eq("id", userId);
                break;
            }

            case "subscription.completed":
            case "subscription.expired": {
                const sub = payload.subscription?.entity;
                if (!sub) break;

                const userId = sub.notes?.user_id;
                if (!userId) break;

                // Downgrade to free
                await supabase
                    .from("profiles")
                    .update({
                        plan: "free",
                        clips_limit: 5,
                        videos_limit: 2,
                        subscription_status: "none",
                        razorpay_subscription_id: null,
                        current_period_end: null,
                    })
                    .eq("id", userId);
                break;
            }

            case "payment.failed": {
                const payment = payload.payment?.entity;
                if (!payment) break;

                const userId = payment.notes?.user_id;
                if (!userId) break;

                // Log the failed payment
                await supabase.from("payments").insert({
                    user_id: userId,
                    razorpay_payment_id: payment.id,
                    razorpay_order_id: payment.order_id || null,
                    amount: payment.amount,
                    currency: payment.currency || "INR",
                    plan: payment.notes?.plan || "creator",
                    plan_period: payment.notes?.period || "monthly",
                    status: "failed",
                });
                break;
            }

            default:
                console.log(`Unhandled Razorpay event: ${eventType}`);
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
