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
            <p>
              [Registered Business Name], operating as Xero Streams ("we", "us", or "our"), operates the website
              xerostreams.com (the "Service"), a video discovery and streaming platform. This Privacy Policy
              explains in detail what personal data we collect, why we collect it, how it is used, who it is
              shared with, and the rights you have over your information. By creating an account or using the
              Service, you acknowledge and consent to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">2. Information We Collect</h2>

            <h3 className="text-base font-semibold text-foreground mt-4 mb-1">2.1 Information you provide directly</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong className="text-foreground">Account details:</strong> your full name and email address when you register or are invited to the Service. Your role (admin or user) is assigned by us.</li>
              <li><strong className="text-foreground">Profile preferences:</strong> theme colour, homepage layout preferences, and age-verification status that you choose to set on your account.</li>
              <li><strong className="text-foreground">Favourites & watchlists:</strong> the videos, series, and franchises you mark as favourites or add to personal watchlists.</li>
              <li><strong className="text-foreground">Reviews & ratings:</strong> comments and star ratings you submit on videos, series, or franchises.</li>
              <li><strong className="text-foreground">Content requests:</strong> titles and descriptions you submit when requesting new content or downloads.</li>
              <li><strong className="text-foreground">Age verification data:</strong> when you access age-restricted (18+) content, you may complete a camera-based age check through our third-party verification provider. We store the resulting verification status but not the raw camera images.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mt-4 mb-1">2.2 Information collected automatically</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong className="text-foreground">Usage & viewing data:</strong> which videos you watch, viewing progress, completed (watched) items, and the times of your sessions. This is stored both on our servers (linked to your account) and in your browser's local storage for continue-watching features.</li>
              <li><strong className="text-foreground">View counts:</strong> each time you open a video, series, or franchise, we increment its public view counter for display and ranking.</li>
              <li><strong className="text-foreground">Download history:</strong> when you download a video, episode, series, or franchise, we log your user ID, email, display name, the content type and title, the download type (single file or ZIP bundle), the number of items, and the file size where available.</li>
              <li><strong className="text-foreground">Purchase records:</strong> records of video and book purchases, including the PayPal order identifier, the item purchased, and the purchase status.</li>
              <li><strong className="text-foreground">Subscription records:</strong> your active or cancelled subscription plan, billing interval, and the associated PayPal order identifier.</li>
              <li><strong className="text-foreground">Analytics events:</strong> we track events such as searches performed, videos viewed, favourites toggled, casts initiated, sign-ins, and purchase initiations to understand how the Service is used.</li>
              <li><strong className="text-foreground">Technical data:</strong> IP address, browser type, device type, and operating system, collected through standard server logs and analytics tools.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground mt-4 mb-1">2.3 Payment information</h3>
            <p>
              Payments for subscriptions, individual video purchases, and book purchases are processed by PayPal.
              We receive a transaction/order identifier and confirmation of payment status, but we do not collect,
              view, or store your full card numbers or banking details — those are handled entirely by the payment
              provider under its own privacy policy.
            </p>

            <h3 className="text-base font-semibold text-foreground mt-4 mb-1">2.4 Authentication & sign-in data</h3>
            <p>
              When you register or sign in, we collect your email address and full name to create and identify your
              account. If you sign in through a third-party identity provider (such as Google, Microsoft, Apple, or
              Facebook single sign-on), we receive the profile information that provider shares with us — typically
              your verified email address, display name, and a profile identifier — to authenticate your session and
              link it to your Xero Streams account. We do not receive, request, or store your identity-provider
              password. We use this authentication data to verify your identity, keep you signed in, protect against
              unauthorised access, and display your name within the Service. Your email address may also be used to
              send you service notifications, security alerts, and responses to your enquiries.
            </p>

            <h3 className="text-base font-semibold text-foreground mt-4 mb-1">2.5 Google user data</h3>
            <p>
              If you choose to sign in with Google, Xero Streams accesses the following Google user data through the
              Google Sign-In API, limited to the basic profile scopes you authorise:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Email address</strong> — your Google account's primary email, used to identify and create your Xero Streams account.</li>
              <li><strong className="text-foreground">Name / basic profile</strong> — your Google display name (and, where you authorise it, basic profile information such as a profile picture URL) to personalise your account and show your name within the Service.</li>
              <li><strong className="text-foreground">OpenID / account identifier</strong> — a stable identifier returned by Google to link your Google account to your Xero Streams account.</li>
            </ul>
            <p className="mt-2">
              <strong className="text-foreground">How we use Google user data:</strong> We use Google user data
              solely to provide or improve Xero Streams' functionality — specifically to authenticate your sign-in,
              create and link your account, keep you signed in, display your name, and protect against unauthorised
              access. We do <strong className="text-foreground">not</strong> use Google user data to serve
              personalised advertising, and we do not use it for any purpose unrelated to providing or improving the
              Service.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">How we store Google user data:</strong> Your Google email address,
              name, and linked identifier are stored on our servers in your account record for as long as your
              account is active. We do not store your Google password or OAuth access tokens beyond the duration
              needed to complete authentication.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Sharing, transfer, and disclosure:</strong> We do not sell Google
              user data and do not transfer it to third parties for reasons other than providing or improving the
              Service. We may share the minimum necessary Google user data only with: (a) our hosting and
              infrastructure providers who process it on our behalf to operate the Service, and (b) authorities where
              required by law. Apart from these limited cases, Google user data is not shared, transferred, or
              disclosed.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Data protection:</strong> Google user data is protected using the
              same technical and organisational measures described in the Data Security section, including encrypted
              transmission, access controls, and row-level security that restricts each user's data to themselves and
              authorised administrators.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Retention and deletion:</strong> Google user data is retained for
              the lifetime of your account. You may request deletion of your account and all associated Google user
              data at any time by contacting us (see Contact Us). Upon deletion, we remove your Google email address,
              name, and linked identifier from our active systems within 30 days, subject to any legal retention
              obligations.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Google API Limited Use Disclosure:</strong> Xero Streams' use and
              transfer to any other app of information received from Google APIs will adhere to the{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google API Services User Data Policy</a>,
              including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and manage your account, authenticate your sign-in, and enforce account-level security (including suspending banned accounts).</li>
              <li>To deliver the Service: streaming playback, continue-watching, "up next" recommendations, watchlists, and personalised homepage layout.</li>
              <li>To process and fulfil subscriptions, one-off purchases, and premium-gated downloads.</li>
              <li>To track and display download history in your dashboard and to prevent abuse of the download feature.</li>
              <li>To respond to content and download requests submitted through the Service.</li>
              <li>To calculate and display aggregate view counts and popularity rankings across the catalogue.</li>
              <li>To verify your age before granting access to adult (18+) content.</li>
              <li>To monitor for fraud, account sharing, scraping, and other abuse, and to enforce our Terms of Service.</li>
              <li>To analyse usage trends, improve features, and develop new functionality.</li>
              <li>To comply with legal obligations and respond to lawful requests from authorities where required.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">4. Legal Basis for Processing (UK / EU Users)</h2>
            <p>
              For users in the UK and European Economic Area, we process your personal data on the following legal
              bases under the UK GDPR:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Contract:</strong> to provide the Service you signed up for, including playback, downloads, and subscriptions.</li>
              <li><strong className="text-foreground">Consent:</strong> for analytics tracking and optional features such as age verification, which you can withdraw at any time.</li>
              <li><strong className="text-foreground">Legitimate interests:</strong> to prevent fraud, secure the platform, and improve the Service, where these interests do not override your rights.</li>
              <li><strong className="text-foreground">Legal obligation:</strong> to comply with applicable laws and respond to valid legal requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">5. Cookies & Local Storage</h2>
            <p>
              We use your browser's local storage rather than traditional advertising cookies. Local storage holds
              your continue-watching progress, watched history, theme preferences, sign-in state, and onboarding
              flags. This data stays on your device unless synced to your account. You can clear local storage at
              any time through your browser settings, which will reset continue-watching and similar features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">6. How We Share Your Information</h2>
            <p>We do not sell your personal data. We share information only as described below:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Payment providers (PayPal):</strong> to process subscriptions and purchases. PayPal processes your payment under its own privacy policy.</li>
              <li><strong className="text-foreground">Age-verification provider:</strong> to verify your age for adult content. Only the verification result is retained by us.</li>
              <li><strong className="text-foreground">Service infrastructure:</strong> hosting, database, and analytics providers who process data on our behalf under confidentiality agreements.</li>
              <li><strong className="text-foreground">Public content:</strong> reviews, ratings, and watchlist names you create may be visible to other users of the Service.</li>
              <li><strong className="text-foreground">Legal compliance:</strong> where required by law, court order, or to protect the rights, property, or safety of Xero Streams, our users, or others.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">7. International Data Transfers</h2>
            <p>
              Your data may be processed and stored on servers located outside your country of residence. Where
              this occurs, we rely on appropriate safeguards such as standard contractual clauses to ensure your
              data is protected to a comparable standard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">8. Data Retention</h2>
            <p>
              We retain your account and usage data for as long as your account is active. Continue-watching and
              watched history are kept until you clear them or your account is deleted. Download logs, purchase
              records, and subscription records are retained for as long as necessary to provide the Service,
              handle disputes, and meet legal or accounting requirements. You may request deletion of your data
              at any time (see Your Rights below).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">9. Data Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data, including
              access controls, encrypted transmission, and segregation of administrative and user access. Row-level
              security restricts each user's data to themselves and authorised administrators. However, no system
              is completely secure, and we cannot guarantee absolute protection against unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">10. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Access</strong> the personal data we hold about you.</li>
              <li><strong className="text-foreground">Rectify</strong> inaccurate or incomplete data.</li>
              <li><strong className="text-foreground">Erase</strong> your data and request account deletion.</li>
              <li><strong className="text-foreground">Restrict or object to</strong> certain processing.</li>
              <li><strong className="text-foreground">Data portability</strong> — receive your data in a structured, machine-readable format.</li>
              <li><strong className="text-foreground">Withdraw consent</strong> at any time where processing relied on consent.</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us through the support options available on the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">11. Children's Privacy</h2>
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect personal information
              from them. Adult (18+) content is gated behind age verification. If you believe a child has provided
              us with personal data, please contact us so we can delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal
              requirements. We will post the updated policy on this page with a revised "Last updated" date.
              Material changes will be highlighted where practical.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">13. Contact Us</h2>
            <p>
              If you have questions, requests, or complaints about this Privacy Policy or your personal data,
              please contact our Data Protection team:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong className="text-foreground">Email:</strong> <a href="mailto:privacy@xerostreams.com" className="text-primary underline">privacy@xerostreams.com</a></li>
              <li><strong className="text-foreground">Postal address:</strong> [Registered Business Name], [Insert Registered Office Address], [City], [Country]</li>
            </ul>
            <p className="mt-2">
              We will respond in accordance with applicable data-protection law, generally within 30 days. For
              account-specific requests, please also reach out through the support options available on xerostreams.com.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}