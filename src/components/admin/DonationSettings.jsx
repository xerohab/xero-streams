import React, { useEffect, useRef, useState } from "react";
import { Heart, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// PayPal Donate Button component using the official Donate SDK
// Set your PayPal hosted_button_id below (from paypal.com/donate/buttons)
const PAYPAL_HOSTED_BUTTON_ID = "REPLACE_WITH_YOUR_HOSTED_BUTTON_ID";
const PAYPAL_ME_LINK = "https://www.paypal.me/XeroStreams"; // update as needed

function PayPalDonateButton({ buttonId }) {
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!buttonId || buttonId === "REPLACE_WITH_YOUR_HOSTED_BUTTON_ID") return;

    // Load PayPal Donate SDK
    const scriptId = "paypal-donate-sdk";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
      script.charset = "UTF-8";
      script.onload = () => {
        renderButton(buttonId);
        setLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      renderButton(buttonId);
      setLoaded(true);
    }
  }, [buttonId]);

  const renderButton = (id) => {
    if (/** @type {Window & {PayPal?: {Donation: {Button: Function}}}} */ (window).PayPal && containerRef.current) {
      containerRef.current.innerHTML = "";
      /** @type {Window & {PayPal?: {Donation: {Button: Function}}}} */ (window).PayPal.Donation.Button({
        env: "production",
        hosted_button_id: id,
        image: {
          src: "https://www.paypalobjects.com/en_US/GB/i/btn/btn_donateCC_LG.gif",
          alt: "Donate with PayPal button",
          title: "PayPal - The safer, easier way to pay online!",
        },
      }).render(containerRef.current);
    }
  };

  return <div ref={containerRef} className="mt-2" />;
}

export default function DonationSettings() {
  const [buttonId, setButtonId] = useState(PAYPAL_HOSTED_BUTTON_ID);
  const [editId, setEditId] = useState(PAYPAL_HOSTED_BUTTON_ID);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfigured = buttonId && buttonId !== "REPLACE_WITH_YOUR_HOSTED_BUTTON_ID";

  return (
    <div className="space-y-6">
      {/* Setup Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
        <h3 className="font-semibold text-blue-400 flex items-center gap-2">
          <Heart className="w-4 h-4" /> PayPal Donations Setup
        </h3>
        <p className="text-sm text-muted-foreground">
          To enable donations, create a Donate button on PayPal and paste the <code className="bg-secondary px-1 rounded">hosted_button_id</code> below.
        </p>
        <a
          href="https://www.paypal.com/donate/buttons"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
        >
          Create a PayPal Donate Button <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Button ID Configuration */}
      <div className="space-y-2">
        <Label>PayPal Hosted Button ID</Label>
        <div className="flex gap-2">
          <Input
            value={editId}
            onChange={(e) => setEditId(e.target.value)}
            placeholder="e.g. ABC123XYZ"
            className="bg-secondary border-border font-mono"
          />
          <Button
            onClick={() => setButtonId(editId)}
            className="bg-primary hover:bg-primary/90"
          >
            Apply
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Find this in your PayPal Donate button code: <code className="bg-secondary px-1 rounded">hosted_button_id=...</code>
        </p>
      </div>

      {/* Live Donate Button Preview */}
      <div className="space-y-3">
        <Label>Live Donate Button</Label>
        {isConfigured ? (
          <div className="bg-secondary rounded-xl p-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">This is the live PayPal donate button for your site:</p>
            <PayPalDonateButton buttonId={buttonId} />
          </div>
        ) : (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Enter your PayPal hosted_button_id above to see the live button.</p>
          </div>
        )}
      </div>

      {/* PayPal.me Link (fallback) */}
      <div className="space-y-2">
        <Label>PayPal.me Donation Link (alternative)</Label>
        <div className="flex gap-2">
          <Input
            value={PAYPAL_ME_LINK}
            readOnly
            className="bg-secondary border-border text-sm"
          />
          <Button variant="secondary" size="icon" onClick={() => handleCopy(PAYPAL_ME_LINK)}>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
          <a href={PAYPAL_ME_LINK} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="icon">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Embed Code */}
      {isConfigured && (
        <div className="space-y-2">
          <Label>Embed Code (for external sites)</Label>
          <div className="relative">
            <pre className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground overflow-x-auto">
{`<form action="https://www.paypal.com/donate" method="post" target="_top">
  <input type="hidden" name="hosted_button_id" value="${buttonId}" />
  <input type="image"
    src="https://www.paypalobjects.com/en_US/GB/i/btn/btn_donateCC_LG.gif"
    border="0" name="submit" title="PayPal"
    alt="Donate with PayPal button" />
</form>`}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 text-xs gap-1"
              onClick={() => handleCopy(`<form action="https://www.paypal.com/donate" method="post" target="_top"><input type="hidden" name="hosted_button_id" value="${buttonId}" /><input type="image" src="https://www.paypalobjects.com/en_US/GB/i/btn/btn_donateCC_LG.gif" border="0" name="submit" title="PayPal" alt="Donate with PayPal button" /></form>`)}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copy
            </Button>
          </div>
        </div>
      )}

      {/* Donation Page Link */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <p className="text-sm text-foreground font-semibold mb-1">Donation Page</p>
        <p className="text-xs text-muted-foreground mb-3">
          There's a public donation page available for viewers at:
        </p>
        <div className="flex gap-2">
          <Input value={`${window.location.origin}/donate`} readOnly className="bg-secondary border-border text-xs" />
          <Button variant="secondary" size="icon" onClick={() => handleCopy(`${window.location.origin}/donate`)}>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
