import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function PurchaseCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing");
  const navigate = useNavigate();

  useEffect(() => {
    const process = async () => {
      try {
        const token = searchParams.get("token");
        const success = searchParams.get("success");

        if (success !== "true" || !token) {
          setStatus("cancelled");
          setTimeout(() => navigate(-1), 2000);
          return;
        }

        const user = await base44.auth.me();
        if (!user) throw new Error("Not authenticated");

        // Bound premium orders are captured and activated only on the server.
        if (searchParams.get("premium") === "true") {
          const premium = await base44.functions.invoke("premiumCheckout", { action: "capture", orderId: token });
          if (!premium.data?.success || !premium.data?.premium_activated) throw new Error("Premium activation could not complete");
          localStorage.removeItem("pending_plan_purchase");
          setStatus("completed");
          setTimeout(() => navigate("/dashboard"), 2000);
          return;
        }
        if (searchParams.get("media") === "true") {
          const result = await base44.functions.invoke("mediaCheckout", { action: "capture", orderId: token });
          if (!result.data?.success) throw new Error("Media payment verification failed");
          setStatus("completed");
          setTimeout(() => navigate(result.data.kind === "book" ? "/books" : "/dashboard"), 2000);
          return;
        }
        // Legacy paid entitlement orders require support verification.
        if (["pending_plan_purchase","pending_book_purchase","pending_video_purchase"].some(key => localStorage.getItem(key))) throw new Error("Legacy order requires support verification");
        const result = await base44.functions.invoke("capturePaypalOrder", { orderId: token });
        if (!result.data?.success) throw new Error("Capture failed");
        setStatus("completed");
        setTimeout(() => navigate("/"), 2000);
      } catch (err) {
        console.error(err);
        setStatus("error");
        setTimeout(() => navigate(-1), 2000);
      }
    };
    process();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {status === "processing" && (
        <>
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-bold">Processing payment...</h2>
        </>
      )}
      {status === "completed" && (
        <>
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold">Payment Successful!</h2>
          <p className="text-muted-foreground mt-2">Redirecting...</p>
        </>
      )}
      {status === "cancelled" && (
        <>
          <h2 className="text-2xl font-bold text-destructive">Payment Cancelled</h2>
          <p className="text-muted-foreground mt-2">Redirecting back...</p>
        </>
      )}
      {status === "error" && (
        <>
          <h2 className="text-2xl font-bold text-destructive">Payment Error</h2>
          <p className="text-muted-foreground mt-2">Something went wrong. Please try again.</p>
        </>
      )}
    </div>
  );
}