import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import { PLAN_LIMITS, type Plan, type PlanPeriod } from "@/lib/types";

// Initialize Cashfree SDK v5
const cashfree = new Cashfree(
    process.env.CASHFREE_ENV === "PRODUCTION" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
    process.env.CASHFREE_APP_ID!,
    process.env.CASHFREE_SECRET_KEY!
);

/**
 * GET /api/cashfree/verify-payment?order_id=xxx
 *
 * Called after Cashfree checkout completes (return URL redirect).
 * Fetches order status from Cashfree and upgrades the user's plan if payment succeeded.
 *
 * Also handles POST for manual verification from frontend.
 */
async function handleVerification(request: NextRequest) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        // If not authenticated, redirect to login
        return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
    }

    // Get order_id from query params or body
    let orderId: string | null = null;

    if (request.method === "GET") {
        orderId = request.nextUrl.searchParams.get("order_id");
    } else {
        const body = await request.json();
        orderId = body.order_id;
    }

    if (!orderId) {
        if (request.method === "GET") {
            return NextResponse.redirect(new URL("/pricing?error=missing_order", request.nextUrl.origin));
        }
        return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    try {
        // Fetch order status from Cashfree
        const response = await cashfree.PGOrderFetchPayments(orderId);
        const payments = response.data;

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            if (request.method === "GET") {
                return NextResponse.redirect(new URL("/pricing?error=no_payment", request.nextUrl.origin));
            }
            return NextResponse.json({ error: "No payment found for this order" }, { status: 400 });
        }

        // Find the successful payment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const successPayment = payments.find((p: any) => p.payment_status === "SUCCESS");

        if (!successPayment) {
            if (request.method === "GET") {
                return NextResponse.redirect(new URL("/pricing?error=payment_failed", request.nextUrl.origin));
            }
            return NextResponse.json({ error: "Payment was not successful" }, { status: 400 });
        }

        // Extract plan info from order tags
        const orderResponse = await cashfree.PGFetchOrder(orderId);
        const orderData = orderResponse.data;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tags = (orderData as any)?.order_tags || {};
        const plan = (tags.plan || "creator") as Plan;
        const period = (tags.period || "monthly") as PlanPeriod;

        const planInfo = PLAN_LIMITS[plan];
        if (!planInfo) {
            return NextResponse.json({ error: "Invalid plan in order" }, { status: 400 });
        }

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

        // Upgrade user plan
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                plan,
                clips_limit: planInfo.clips,
                videos_limit: planInfo.videos,
                clips_used: 0,
                videos_used: 0,
                cashfree_order_id: orderId,
                cashfree_customer_id: orderData?.customer_details?.customer_id || null,
                subscription_status: period === "one_time" ? "none" : "active",
                plan_period: period,
                current_period_end: periodEnd.toISOString(),
            })
            .eq("id", user.id);

        if (updateError) {
            console.error("Failed to update profile:", updateError);
            if (request.method === "GET") {
                return NextResponse.redirect(new URL("/pricing?error=upgrade_failed", request.nextUrl.origin));
            }
            return NextResponse.json({ error: "Failed to upgrade plan" }, { status: 500 });
        }

        // Log payment
        const amount = period === "annual" ? planInfo.annualPrice * 12 : planInfo.monthlyPrice;
        await supabase.from("payments").insert({
            user_id: user.id,
            cashfree_order_id: orderId,
            cashfree_payment_id: successPayment.cf_payment_id?.toString() || null,
            cf_payment_id: successPayment.cf_payment_id?.toString() || null,
            amount,
            currency: "INR",
            plan,
            plan_period: period,
            status: "captured",
        });

        if (request.method === "GET") {
            return NextResponse.redirect(new URL("/dashboard?payment=success", request.nextUrl.origin));
        }

        return NextResponse.json({
            success: true,
            plan,
            period,
            message: `Successfully upgraded to ${planInfo.label} plan!`,
        });
    } catch (err) {
        console.error("Cashfree verify payment error:", err);
        if (request.method === "GET") {
            return NextResponse.redirect(new URL("/pricing?error=verification_failed", request.nextUrl.origin));
        }
        const message = err instanceof Error ? err.message : "Payment verification failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return handleVerification(request);
}

export async function POST(request: NextRequest) {
    return handleVerification(request);
}
