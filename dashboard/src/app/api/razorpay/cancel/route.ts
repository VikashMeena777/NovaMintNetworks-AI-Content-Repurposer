import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * POST /api/razorpay/cancel
 *
 * Cancels the user's active Razorpay subscription.
 * The user retains access until the current billing period ends.
 */
export async function POST() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("razorpay_subscription_id, subscription_status, plan")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!profile.razorpay_subscription_id) {
        return NextResponse.json(
            { error: "No active subscription found" },
            { status: 400 }
        );
    }

    if (
        profile.subscription_status === "cancelled" ||
        profile.subscription_status === "none"
    ) {
        return NextResponse.json(
            { error: "Subscription is already cancelled or inactive" },
            { status: 400 }
        );
    }

    try {
        // Cancel at end of billing period (cancel_at_cycle_end = true)
        await razorpay.subscriptions.cancel(
            profile.razorpay_subscription_id,
            false // false = cancel at end of period, true = cancel immediately
        );

        // Update profile
        await supabase
            .from("profiles")
            .update({
                subscription_status: "cancelled",
            })
            .eq("id", user.id);

        return NextResponse.json({
            success: true,
            message:
                "Subscription cancelled. You'll retain access until the end of your current billing period.",
        });
    } catch (err) {
        console.error("Cancel subscription error:", err);
        const message =
            err instanceof Error ? err.message : "Failed to cancel subscription";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
