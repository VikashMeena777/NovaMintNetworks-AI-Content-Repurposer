import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";

/**
 * POST /api/cashfree/cancel
 *
 * Cancels the user's active subscription.
 * The user retains access until the current billing period ends.
 *
 * For Cashfree subscriptions, we update the local status directly.
 * If using Cashfree Subscriptions API, the actual cancellation
 * would be done via their API.
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
        .select("cashfree_subscription_id, cashfree_order_id, subscription_status, plan")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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
        // If we have a Cashfree subscription ID, cancel via their API
        if (profile.cashfree_subscription_id) {
            try {
                const res = await fetch(
                    `https://${process.env.CASHFREE_ENV === "PRODUCTION" ? "api" : "sandbox"}.cashfree.com/pg/subscriptions/${profile.cashfree_subscription_id}/cancel`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-client-id": process.env.CASHFREE_APP_ID!,
                            "x-client-secret": process.env.CASHFREE_SECRET_KEY!,
                            "x-api-version": "2023-08-01",
                        },
                    }
                );

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.error("Cashfree cancel API error:", errData);
                    // Still proceed with local cancellation
                }
            } catch (apiErr) {
                console.error("Cashfree cancel API call failed:", apiErr);
                // Still proceed with local cancellation
            }
        }

        // Update profile status to cancelled
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
