import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Refund Policy — ClipMint",
    description:
        "ClipMint 7-day refund policy. Conditions for eligibility, how to request a refund, and processing timelines.",
};

export default function RefundPolicyPage() {
    return (
        <main>
            <Navbar />
            <div className="legal-content">
                <h1>Refund Policy</h1>
                <p className="legal-date">Last updated: March 9, 2026</p>

                <p>
                    At NovaMint Networks, we want you to be completely satisfied
                    with ClipMint. This Refund Policy outlines the terms under which
                    refunds may be issued for our subscription plans.
                </p>

                <h2>1. Refund Eligibility</h2>
                <p>
                    We offer a <strong>7-day refund window</strong> from the date of
                    your initial subscription purchase. To be eligible for a refund:
                </p>
                <ul>
                    <li>
                        The refund request must be made within 7 days of your first
                        payment
                    </li>
                    <li>
                        The request should indicate why the Service did not meet your
                        expectations
                    </li>
                    <li>
                        You should have genuinely attempted to use the Service (not just
                        signed up without trying it)
                    </li>
                </ul>

                <h2>2. How to Request a Refund</h2>
                <p>To request a refund, email us at:</p>
                <ul>
                    <li>
                        <a href="mailto:ClipMint.Billing@gmail.com">
                            ClipMint.Billing@gmail.com
                        </a>
                    </li>
                </ul>
                <p>Include the following in your email:</p>
                <ul>
                    <li>Your registered email address</li>
                    <li>Subscription plan name</li>
                    <li>Date of purchase</li>
                    <li>Reason for refund request</li>
                </ul>

                <h2>3. Processing Timeline</h2>
                <ul>
                    <li>
                        We will acknowledge your refund request within{" "}
                        <strong>24 hours</strong>
                    </li>
                    <li>
                        Approved refunds will be processed within{" "}
                        <strong>5-7 business days</strong>
                    </li>
                    <li>
                        The refund will be credited to the same payment method used for
                        the purchase
                    </li>
                    <li>
                        You will receive a confirmation email once the refund has been
                        processed
                    </li>
                </ul>

                <h2>4. Non-Refundable Scenarios</h2>
                <p>Refunds will <strong>not</strong> be issued in the following cases:</p>
                <ul>
                    <li>
                        Requests made after the 7-day refund window has expired
                    </li>
                    <li>
                        Significant usage of the Service during the refund period (more
                        than 50% of plan limits consumed)
                    </li>
                    <li>
                        Free plan users (no payment was made)
                    </li>
                    <li>
                        Subscription renewals (refunds apply only to the first payment)
                    </li>
                    <li>
                        Violations of our Terms &amp; Conditions
                    </li>
                    <li>
                        Change of mind without attempting to use the Service
                    </li>
                </ul>

                <h2>5. Cancellation</h2>
                <p>
                    Cancelling your subscription and requesting a refund are separate
                    actions:
                </p>
                <ul>
                    <li>
                        <strong>Cancel:</strong> You can cancel your subscription anytime
                        from the Settings page. You retain access until the end of your
                        billing cycle.
                    </li>
                    <li>
                        <strong>Refund:</strong> A refund must be explicitly requested
                        within the 7-day window via email.
                    </li>
                </ul>

                <h2>6. Partial Refunds</h2>
                <p>
                    We may, at our sole discretion, offer partial refunds in
                    exceptional circumstances (e.g., extended service outage affecting
                    your ability to use ClipMint). Partial refund amounts will be
                    calculated pro-rata for the affected period.
                </p>

                <h2>7. Contact</h2>
                <p>
                    For any questions regarding this Refund Policy, please contact us
                    at:
                </p>
                <ul>
                    <li>
                        Email:{" "}
                        <a href="mailto:ClipMint.Support@gmail.com">
                            ClipMint.Support@gmail.com
                        </a>
                    </li>
                    <li>Address: Jaipur, Rajasthan, India</li>
                </ul>
            </div>
            <Footer />
        </main>
    );
}
