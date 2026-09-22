import React from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-black text-foreground">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Last updated: September 22, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">1. Introduction</h2>
            <p>Xero Streams ("we", "us", or "our") operates the website xerostreams.com (the "Service"). This Privacy Policy explains how we collect, use, and protect your personal information when you use our Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Account information:</strong> your name, email address, and password when you register.</li>
              <li><strong className="text-foreground">Usage data:</strong> videos you watch, favourites, watchlists, download history, and viewing progress.</li>
              <li><strong className="text-foreground">Payment information:</strong> processed securely through our payment providers (PayPal). We do not store full card details.</li>
              <li><strong className="text-foreground">Device information:</strong> IP address, browser type, and device identifiers for security and analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and maintain the Service, including personalised recommendations and continue-watching.</li>
              <li>To manage your account, subscriptions, and purchases.</li>
              <li>To respond to content requests and support enquiries.</li>
              <li>To analyse usage patterns and improve the Service.</li>
              <li>To prevent fraud, abuse, and unauthorised access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">4. Cookies & Local Storage</h2>
            <p>We use browser local storage to remember your viewing progress, theme preferences, and sign-in state. You can clear this data at any time through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">5. Sharing Your Information</h2>
            <p>We do not sell your personal data. We may share information with trusted third-party service providers who help us operate the Service (such as payment processors and analytics), under strict confidentiality obligations. We may disclose information when required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">6. Data Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your data. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to access, correct, or delete your personal data. To exercise these rights, contact us through the support channels available on the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">8. Children's Privacy</h2>
            <p>The Service is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us data, please contact us for deletion.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the updated policy on this page with a revised date.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please reach out through the support options available on xerostreams.com.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}