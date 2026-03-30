import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy — ClipMint",
    description:
        "Learn how ClipMint handles your data, cookies, and third-party services. GDPR-compliant privacy policy.",
};

export default function PrivacyPolicyPage() {
    return (
        <main>
            <Navbar />
            <div className="legal-content">
                <h1>Privacy Policy</h1>
                <p className="legal-date">Last updated: March 9, 2026</p>

                <p>
                    NovaMint Networks (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates ClipMint
                    (the &quot;Service&quot;). This Privacy Policy explains how we collect,
                    use, disclose, and safeguard your information when you use our
                    Service.
                </p>

                <h2>1. Information We Collect</h2>
                <p>We collect information you provide directly to us:</p>
                <ul>
                    <li>
                        <strong>Account Information:</strong> Name, email address, and
                        profile picture when you create an account via email signup or
                        Google OAuth.
                    </li>
                    <li>
                        <strong>Video Content:</strong> Video URLs or uploaded video files
                        that you submit for processing. These are processed temporarily
                        and deleted after clip generation.
                    </li>
                    <li>
                        <strong>Usage Data:</strong> Information about how you use the
                        Service, including clips generated, features used, and
                        processing history.
                    </li>
                    <li>
                        <strong>Payment Information:</strong> When you subscribe to a paid
                        plan, payment details are processed securely by Razorpay. We do
                        not store your card details.
                    </li>
                </ul>

                <h2>2. How We Use Your Information</h2>
                <ul>
                    <li>To provide, maintain, and improve the Service</li>
                    <li>To process videos, generate clips, and add animated captions</li>
                    <li>
                        To communicate with you about your account, subscriptions, and
                        service updates
                    </li>
                    <li>To send notifications (email/Discord) about job status</li>
                    <li>To prevent fraud and ensure security</li>
                    <li>To comply with legal obligations</li>
                </ul>

                <h2>3. Cookies</h2>
                <p>
                    We use essential cookies to maintain your authentication session and
                    preferences. We do not use advertising or tracking cookies.
                </p>

                <h2>4. Data Retention</h2>
                <ul>
                    <li>
                        <strong>Account data:</strong> Retained as long as your account is
                        active
                    </li>
                    <li>
                        <strong>Uploaded videos:</strong> Deleted automatically after
                        processing is complete
                    </li>
                    <li>
                        <strong>Generated clips:</strong> Stored in Google Drive and
                        accessible from your dashboard until you delete them
                    </li>
                    <li>
                        <strong>Processing logs:</strong> Retained for 90 days for
                        debugging and analytics
                    </li>
                </ul>

                <h2>5. Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                    <li>Access your personal data</li>
                    <li>
                        Correct inaccurate data by updating your profile in Settings
                    </li>
                    <li>
                        Delete your account and associated data by contacting us at{" "}
                        <a href="mailto:ClipMint.Support@gmail.com">
                            ClipMint.Support@gmail.com
                        </a>
                    </li>
                    <li>Export your data in a portable format</li>
                    <li>Withdraw consent for data processing</li>
                </ul>

                <h2>6. Data Security</h2>
                <p>
                    We implement industry-standard security measures including encrypted
                    data transmission (TLS/SSL), secure authentication, and access
                    controls. While no method of transmission over the Internet is 100%
                    secure, we strive to protect your information.
                </p>

                <h2>7. Children&apos;s Privacy</h2>
                <p>
                    Our Service is not intended for children under 13. We do not
                    knowingly collect personal information from children.
                </p>

                <h2>8. Changes to This Policy</h2>
                <p>
                    We may update this Privacy Policy from time to time. We will notify
                    you of any material changes by posting the new policy on this page
                    and updating the &quot;Last updated&quot; date.
                </p>

                <h2>9. Contact Us</h2>
                <p>
                    If you have questions about this Privacy Policy, please contact us
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
                    <li>
                        Company: NovaMint Networks
                    </li>
                </ul>
            </div>
            <Footer />
        </main>
    );
}
