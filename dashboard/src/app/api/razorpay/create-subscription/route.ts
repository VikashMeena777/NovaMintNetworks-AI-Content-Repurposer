import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import Razorpay from "razorpay";
import { PLAN_LIMITS, RAZORPAY_PLAN_IDS, type Plan, type PlanPeriod } from "@/lib/types";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * POST /api/razorpay/create-subscription
 *
 * Creates a Razorpay subscription (recurring) or order (one-time) for a plan.
 * Body: { plan: "creator" | "pro" | "agency", period: "monthly" | "annual" | "one_time" }
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
    const plan = body.plan as Plan;
    const period = body.period as PlanPeriod;

    if (!plan || !period || plan === "free") {
        return NextResponse.json(
            { error: "Valid plan and period required" },
            { status: 400 }
        );
    }

    const planInfo = PLAN_LIMITS[plan];
    if (!planInfo) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get user profile for email and existing customer ID
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    try {
        if (period === "one_time") {
            // ─── ONE-TIME PAYMENT via Razorpay Order ───
            const amount = planInfo.monthlyPrice; // one month's price in paise

            const order = await razorpay.orders.create({
                amount,
                currency: "INR",
                receipt: `clipmint_${plan}_${user.id.slice(0, 8)}_${Date.now()}`,
                notes: {
                    user_id: user.id,
                    plan,
                    period: "one_time",
                },
            });

            return NextResponse.json({
                type: "order",
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                plan,
                period,
                user_email: user.email,
                user_name: profile?.full_name || user.email,
            });
        } else {
            // ─── RECURRING SUBSCRIPTION ───
            const planKey = `${plan}_${period}`;
            const razorpayPlanId = RAZORPAY_PLAN_IDS[planKey];

            if (!razorpayPlanId) {
                return NextResponse.json(
                    { error: "Plan not available" },
                    { status: 400 }
                );
            }

            const subscriptionData = {
                plan_id: razorpayPlanId,
                total_count: period === "annual" ? 12 : 120, // 12 months or 10 years
                quantity: 1,
                notes: {
                    user_id: user.id,
                    plan,
                    period,
                },
            };

            // If user already has a Razorpay customer ID, reuse it
            if (profile?.razorpay_customer_id) {
                (subscriptionData as Record<string, unknown>).customer_id = profile.razorpay_customer_id;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subscription = await (razorpay.subscriptions.create as (data: any) => Promise<any>)(subscriptionData);

            // Save subscription ID to profile
            await supabase
                .from("profiles")
                .update({
                    razorpay_subscription_id: subscription.id,
                    subscription_status: "created",
                })
                .eq("id", user.id);

            return NextResponse.json({
                type: "subscription",
                subscription_id: subscription.id,
                key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                plan,
                period,
                amount: period === "annual" ? planInfo.annualPrice : planInfo.monthlyPrice,
                user_email: user.email,
                user_name: profile?.full_name || user.email,
            });
        }
    } catch (err) {
        console.error("Razorpay create error:", err);
        const message =
            err instanceof Error ? err.message : "Payment initialization failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
