import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms & Conditions — ClipMint",
    description:
        "Terms of Service for ClipMint. Read about user responsibilities, acceptable use, intellectual property, and governing law.",
};

export default function TermsPage() {
    return (
        <main>
            <Navbar />
            <div className="legal-content">
                <h1>Terms &amp; Conditions</h1>
                <p className="legal-date">Last updated: March 9, 2026</p>

                <p>
                    These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of ClipMint,
                    operated by NovaMint Networks (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By accessing
                    or using the Service, you agree to be bound by these Terms.
                </p>

                <h2>1. Account Registration</h2>
                <ul>
                    <li>
                        You must provide accurate, complete information when creating an
                        account.
                    </li>
                    <li>
                        You are responsible for safeguarding your account credentials.
                    </li>
                    <li>
                        You must be at least 13 years old to use the Service.
                    </li>
                    <li>
                        One person or entity may not maintain more than one free account.
                    </li>
                </ul>

                <h2>2. Acceptable Use</h2>
                <p>When using ClipMint, you agree not to:</p>
                <ul>
                    <li>
                        Upload content that infringes on copyrights, trademarks, or
                        intellectual property of others
                    </li>
                    <li>
                        Use the Service for any unlawful purpose or in violation of any
                        applicable laws
                    </li>
                    <li>
                        Attempt to gain unauthorized access to the Service, other
                        accounts, or related systems
                    </li>
                    <li>
                        Use automated tools (bots, scrapers) to access the Service beyond
                        the provided API
                    </li>
                    <li>
                        Upload content that is harmful, abusive, obscene, or promotes
                        violence
                    </li>
                    <li>
                        Resell or redistribute the Service without authorization
                    </li>
                </ul>

                <h2>3. Intellectual Property</h2>
                <ul>
                    <li>
                        <strong>Your Content:</strong> You retain full ownership of your
                        original video content and all clips generated from it.
                    </li>
                    <li>
                        <strong>Our Service:</strong> The ClipMint platform, including its
                        design, code, caption styles, and AI models, are the intellectual
                        property of NovaMint Networks.
                    </li>
                    <li>
                        <strong>License:</strong> By uploading content, you grant us a
                        limited, non-exclusive license to process your video solely for
                        the purpose of providing the Service.
                    </li>
                </ul>

                <h2>4. Subscription Plans &amp; Payments</h2>
                <ul>
                    <li>
                        Free plan usage is subject to monthly limits (clips and videos per
                        month).
                    </li>
                    <li>
                        Paid subscriptions are billed monthly. Payments are processed
                        through Razorpay.
                    </li>
                    <li>
                        Prices are listed in Indian Rupees (₹) and are subject to
                        applicable taxes.
                    </li>
                    <li>
                        You may cancel your subscription at any time. Access continues
                        until the end of the current billing period.
                    </li>
                    <li>
                        We reserve the right to change pricing with 30 days prior notice
                        to existing subscribers.
                    </li>
                </ul>

                <h2>5. Service Availability</h2>
                <ul>
                    <li>
                        We strive for 99.9% uptime but do not guarantee uninterrupted
                        access to the Service.
                    </li>
                    <li>
                        Processing times depend on video length, server load, and your
                        subscription plan.
                    </li>
                    <li>
                        We may perform scheduled maintenance with reasonable advance
                        notice.
                    </li>
                </ul>

                <h2>6. Limitation of Liability</h2>
                <p>
                    To the fullest extent permitted by law, NovaMint Networks shall
                    not be liable for any indirect, incidental, special, consequential,
                    or punitive damages, including loss of profits, data, or business
                    opportunities, arising from your use of the Service.
                </p>
                <p>
                    Our total liability for any claim arising from or relating to the
                    Service shall not exceed the amount paid by you in the 12 months
                    preceding the claim.
                </p>

                <h2>7. Account Termination</h2>
                <ul>
                    <li>
                        You may delete your account at any time through the Settings page
                        or by contacting support.
                    </li>
                    <li>
                        We may suspend or terminate your account if you violate these
                        Terms, engage in fraudulent activity, or abuse the Service.
                    </li>
                    <li>
                        Upon termination, your data will be deleted within 30 days,
                        except as required by law.
                    </li>
                </ul>

                <h2>8. Indemnification</h2>
                <p>
                    You agree to indemnify and hold harmless NovaMint Networks from
                    any claims, damages, or expenses arising from your use of the
                    Service, your content, or your violation of these Terms.
                </p>

                <h2>9. Governing Law</h2>
                <p>
                    These Terms are governed by the laws of India. Any disputes shall
                    be subject to the exclusive jurisdiction of the courts in Jaipur,
                    Rajasthan, India.
                </p>

                <h2>10. Changes to Terms</h2>
                <p>
                    We may modify these Terms at any time. Material changes will be
                    notified via email or dashboard notification. Continued use of the
                    Service after changes constitutes acceptance of the updated Terms.
                </p>

                <h2>11. Contact</h2>
                <p>
                    For questions about these Terms, contact us at{" "}
                    <a href="mailto:ClipMint.Support@gmail.com">
                        ClipMint.Support@gmail.com
                    </a>
                </p>
            </div>
            <Footer />
        </main>
    );
}
