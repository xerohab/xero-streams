import React, { useState, useEffect } from "react";
import Navbar from "@/components/browse/Navbar";
import Footer from "@/components/browse/Footer";
import { Heart, Coffee, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

const PRESET_AMOUNTS = [3, 5, 10, 20];

export default function Donate() {
  const [amount, setAmount] = useState("5");
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") setSuccess(true);
    if (params.get("cancelled") === "true") setCancelled(true);
  }, []);

  const finalAmount = custom || amount;

  const handleDonate = async () => {
    const val = parseFloat(finalAmount);
    if (!val || val <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    base44.analytics.track({ eventName: "donation_initiated", properties: { amount: val } });
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("createPaypalOrder", { amount: val, currency: "GBP" });
      if (res.data?.approvalUrl) {
        window.location.href = res.data.approvalUrl;
      } else {
        setError(res.data?.error || "Something went wrong. Please try again.");
      }
    } catch (e) {
      setError("Failed to connect to PayPal. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="xero-container max-w-2xl mx-auto flex-1 py-24 text-center">
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

        {/* Donation Card */}
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-6">

          {success && (
            <div className="w-full bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-green-400 font-semibold">🎉 Thank you for your donation! You're amazing.</p>
            </div>
          )}

          {cancelled && !success && (
            <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p className="text-yellow-400 font-semibold">Donation cancelled. No worries — you can try again anytime.</p>
            </div>
          )}

          <p className="text-foreground font-semibold text-lg">Donate securely via PayPal</p>
          <p className="text-sm text-muted-foreground">Choose an amount below</p>

          {/* Preset amounts */}
          <div className="flex gap-3 flex-wrap justify-center">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => { setAmount(String(a)); setCustom(""); }}
                className={`px-5 py-2 rounded-full border font-semibold text-sm transition-colors ${
                  !custom && amount === String(a)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-foreground border-border hover:border-primary"
                }`}
              >
                £{a}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex items-center gap-2 w-full max-w-xs">
            <span className="text-muted-foreground font-semibold">£</span>
            <Input
              type="number"
              min="1"
              placeholder="Custom amount"
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setAmount(""); }}
              className="bg-secondary border-border text-center"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            onClick={handleDonate}
            disabled={loading || !finalAmount}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-3 h-auto rounded-full text-base gap-3"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" className="w-5 h-5" />
            )}
            {loading ? "Redirecting to PayPal..." : `Donate £${finalAmount || "0"} with PayPal`}
          </Button>

          <p className="text-xs text-muted-foreground">
            Secure payments processed by PayPal. We never see your payment details.
          </p>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          Thank you for your support — it truly means the world to us.
        </p>
      </div>
      <Footer />
    </div>
  );
}