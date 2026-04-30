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

        // Capture order
        const res = await base44.functions.invoke("capturePaypalOrder", { orderId: token });
        if (res.data?.success) {
          // Check what we were buying
          const pendingBook = localStorage.getItem("pending_book_purchase");
          const pendingPlan = localStorage.getItem("pending_plan_purchase");

          if (pendingBook) {
            const { book_id } = JSON.parse(pendingBook);
            await base44.entities.BookPurchase.create({
              user_id: user.id,
              book_id,
              status: "completed",
              paypal_order_id: token
            });
            localStorage.removeItem("pending_book_purchase");
            setStatus("completed");
            setTimeout(() => navigate("/books"), 2000);
          } else if (pendingPlan) {
            const { plan_id } = JSON.parse(pendingPlan);
            
            // Cancel existing sub if any
            const existing = await base44.entities.UserSubscription.filter({ user_id: user.id, status: "active" });
            for (const sub of existing) {
              await base44.entities.UserSubscription.update(sub.id, { status: "cancelled" });
            }

            await base44.entities.UserSubscription.create({
              user_id: user.id,
              plan_id,
              status: "active",
              paypal_order_id: token
            });
            localStorage.removeItem("pending_plan_purchase");
            setStatus("completed");
            setTimeout(() => navigate("/dashboard"), 2000);
          } else {
            // Probably a donation
            setStatus("completed");
            setTimeout(() => navigate("/"), 2000);
          }
        } else {
          throw new Error("Capture failed");
        }
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