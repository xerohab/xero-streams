import React from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-black text-foreground">Terms of Service</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">Last updated: September 22, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Xero Streams (the "Service") at xerostreams.com, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years old to use the Service. Some content is restricted to users 18 and over and requires age verification. By registering, you confirm you meet these requirements.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">3. Your Account</h2>
            <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You agree to provide accurate information and to keep it updated.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">4. Subscriptions & Payments</h2>
            <p>Premium features require an active subscription. Subscription fees are billed through our payment providers at the intervals shown at checkout. You may cancel at any time; access continues until the end of the current billing period. Refunds are handled at our discretion in line with applicable law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to access, copy, or redistribute content beyond the permissions granted by your subscription.</li>
              <li>Reverse engineer, scrape, or circumvent any technical protection measures.</li>
              <li>Share your account credentials with others.</li>
              <li>Interfere with the Service's security or operation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">6. Downloads</h2>
            <p>Downloads are available to premium subscribers for personal, non-commercial use. Downloaded content must not be redistributed, sold, or publicly shared. We reserve the right to log and limit downloads to prevent abuse.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">7. Intellectual Property</h2>
            <p>All content, branding, and software on the Service are owned by Xero Streams or its licensors and are protected by applicable laws. Your subscription grants a limited, revocable, non-exclusive licence to access the Service for personal use only.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">8. Termination</h2>
            <p>We may suspend or terminate your access if you violate these Terms or for any other reason at our discretion. You may stop using the Service at any time. Upon termination, your right to access the Service ends immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">9. Disclaimers</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free access. Content availability may change without notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Xero Streams shall not be liable for indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">11. Changes to These Terms</h2>
            <p>We may revise these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">12. Contact Us</h2>
            <p>For questions about these Terms, please reach out through the support options available on xerostreams.com.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}