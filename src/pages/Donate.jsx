import React, { useEffect, useRef } from "react";
import Navbar from "@/components/browse/Navbar";
import { Heart, Coffee, Star } from "lucide-react";

// Update this to your actual PayPal hosted_button_id
const PAYPAL_HOSTED_BUTTON_ID = "REPLACE_WITH_YOUR_HOSTED_BUTTON_ID";

function PayPalDonateButton() {
  const containerRef = useRef(null);

  useEffect(() => {
    const scriptId = "paypal-donate-sdk";
    const initButton = () => {
      if (window.PayPal && containerRef.current) {
        containerRef.current.innerHTML = "";
        window.PayPal.Donation.Button({
          env: "production",
          hosted_button_id: PAYPAL_HOSTED_BUTTON_ID,
          image: {
            src: "https://www.paypalobjects.com/en_US/GB/i/btn/btn_donateCC_LG.gif",
            alt: "Donate with PayPal button",
            title: "PayPal - The safer, easier way to pay online!",
          },
        }).render(containerRef.current);
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
      script.charset = "UTF-8";
      script.onload = initButton;
      document.body.appendChild(script);
    } else {
      initButton();
    }
  }, []);

  return <div ref={containerRef} />;
}

export default function Donate() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        {/* Hero */}
        <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6">
          <Heart className="w-8 h-8 text-primary fill-primary/30" />
        </div>
        <h1 className="text-4xl font-black text-foreground mb-4">Support Xero Streams</h1>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          Xero Streams is a passion project brought to you for free. If you enjoy the content and want to help keep the lights on, any donation is hugely appreciated.
        </p>

        {/* Perks */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: Coffee, label: "Buy us a coffee", desc: "Keep the team fuelled" },
            { icon: Star, label: "Support quality", desc: "Help fund better content" },
            { icon: Heart, label: "Show your love", desc: "Every bit counts" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* PayPal Donate Button */}
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
          <p className="text-foreground font-semibold">Donate securely via PayPal</p>
          <p className="text-sm text-muted-foreground">Choose your own amount — one-time or recurring</p>

          {PAYPAL_HOSTED_BUTTON_ID !== "REPLACE_WITH_YOUR_HOSTED_BUTTON_ID" ? (
            <PayPalDonateButton />
          ) : (
            <a
              href="https://www.paypal.me/XeroStreams"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#003087] hover:bg-[#002070] text-white font-bold px-8 py-3 rounded-full transition-colors"
            >
              <img
                src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                alt="PayPal"
                className="w-5 h-5"
              />
              Donate with PayPal
            </a>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            Secure payments processed by PayPal. We never see your payment details.
          </p>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          Thank you for your support — it truly means the world to us. ❤️
        </p>
      </div>
    </div>
  );
}