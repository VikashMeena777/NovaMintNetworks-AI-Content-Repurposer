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
 * POST /api/cashfree/create-order
 *
 * Creates a Cashfree order for one-time or subscription payments.
 * Body: { plan: "creator" | "pro" | "agency", period: "monthly" | "annual" | "one_time" }
 *
 * Returns a payment_session_id for the Cashfree JS SDK checkout.
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

    // Get user profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    try {
        // Calculate amount in INR (convert from paise to rupees)
        const amountInPaise = period === "annual" ? planInfo.annualPrice : planInfo.monthlyPrice;
        const amountInRupees = amountInPaise / 100;

        // For annual period, charge full year upfront
        const finalAmount = period === "annual" ? amountInRupees * 12 : amountInRupees;

        const orderId = `clipmint_${plan}_${user.id.slice(0, 8)}_${Date.now()}`;

        const orderRequest = {
            order_id: orderId,
            order_amount: finalAmount,
            order_currency: "INR",
            customer_details: {
                customer_id: user.id.replace(/-/g, "").slice(0, 20),
                customer_email: user.email || "",
                customer_phone: "9999999999", // Cashfree requires phone; user can update in checkout
                customer_name: profile?.full_name || user.email || "Customer",
            },
            order_meta: {
                return_url: `${request.nextUrl.origin}/api/cashfree/verify-payment?order_id={order_id}`,
                notify_url: `${request.nextUrl.origin}/api/cashfree/webhook`,
            },
            order_note: `ClipMint ${planInfo.label} Plan — ${period === "one_time" ? "One-time" : period === "annual" ? "Annual" : "Monthly"}`,
            order_tags: {
                user_id: user.id,
                plan,
                period,
            },
        };

        const response = await cashfree.PGCreateOrder(orderRequest);
        const orderData = response.data;

        if (!orderData?.payment_session_id) {
            console.error("Cashfree order creation failed:", orderData);
            return NextResponse.json(
                { error: "Failed to create payment order" },
                { status: 500 }
            );
        }

        // Save order ID to profile
        await supabase
            .from("profiles")
            .update({
                cashfree_order_id: orderId,
            })
            .eq("id", user.id);

        return NextResponse.json({
            order_id: orderId,
            payment_session_id: orderData.payment_session_id,
            cf_order_id: orderData.cf_order_id,
            app_id: process.env.NEXT_PUBLIC_CASHFREE_APP_ID,
            plan,
            period,
            amount: finalAmount,
            environment: process.env.CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox",
        });
    } catch (err) {
        console.error("Cashfree create order error:", err);
        const message =
            err instanceof Error ? err.message : "Payment initialization failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
