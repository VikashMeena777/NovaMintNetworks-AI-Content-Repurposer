import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import crypto from "crypto";
import { PLAN_LIMITS, type Plan, type PlanPeriod } from "@/lib/types";

/**
 * POST /api/razorpay/verify-payment
 *
 * Called after Razorpay Checkout success callback.
 * Verifies the payment signature and upgrades the user's plan.
 *
 * Body (one-time):
 *   { type: "order", razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, period }
 *
 * Body (subscription):
 *   { type: "subscription", razorpay_subscription_id, razorpay_payment_id, razorpay_signature, plan, period }
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
        type,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
        plan,
        period,
    } = body as {
        type: "order" | "subscription";
        razorpay_order_id?: string;
        razorpay_payment_id: string;
        razorpay_subscription_id?: string;
        razorpay_signature: string;
        plan: Plan;
        period: PlanPeriod;
    };

    if (!razorpay_payment_id || !razorpay_signature || !plan || !period) {
        return NextResponse.json(
            { error: "Missing required payment details" },
            { status: 400 }
        );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET!;

    // ─── VERIFY SIGNATURE ───
    let expectedSignature: string;

    if (type === "subscription" && razorpay_subscription_id) {
        // For subscriptions: HMAC of razorpay_payment_id + "|" + razorpay_subscription_id
        expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
            .digest("hex");
    } else if (type === "order" && razorpay_order_id) {
        // For orders: HMAC of razorpay_order_id + "|" + razorpay_payment_id
        expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");
    } else {
        return NextResponse.json(
            { error: "Invalid payment type or missing IDs" },
            { status: 400 }
        );
    }

    if (expectedSignature !== razorpay_signature) {
        console.error("Razorpay signature mismatch — possible tampered payment");
        return NextResponse.json(
            { error: "Payment verification failed" },
            { status: 400 }
        );
    }

    // ─── UPGRADE USER PLAN ───
    const planInfo = PLAN_LIMITS[plan];
    const amount =
        period === "annual" ? planInfo.annualPrice : planInfo.monthlyPrice;

    // Calculate period end for one-time payments (30 days for monthly, 365 for annual)
    const now = new Date();
    const periodEnd = new Date(now);
    if (period === "one_time") {
        periodEnd.setDate(periodEnd.getDate() + 30);
    } else if (period === "monthly") {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Update profile with new plan
    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            plan,
            clips_limit: planInfo.clips,
            videos_limit: planInfo.videos,
            clips_used: 0, // Reset usage on plan change
            videos_used: 0,
            razorpay_payment_id,
            razorpay_subscription_id: razorpay_subscription_id || null,
            subscription_status:
                type === "subscription" ? "active" : "none",
            plan_period: period,
            current_period_end: periodEnd.toISOString(),
        })
        .eq("id", user.id);

    if (updateError) {
        console.error("Failed to update profile:", updateError);
        return NextResponse.json(
            { error: "Failed to upgrade plan" },
            { status: 500 }
        );
    }

    // Log payment
    await supabase.from("payments").insert({
        user_id: user.id,
        razorpay_payment_id,
        razorpay_order_id: razorpay_order_id || null,
        razorpay_subscription_id: razorpay_subscription_id || null,
        razorpay_signature,
        amount,
        currency: "INR",
        plan,
        plan_period: period,
        status: "captured",
    });

    return NextResponse.json({
        success: true,
        plan,
        period,
        message: `Successfully upgraded to ${planInfo.label} plan!`,
    });
}
