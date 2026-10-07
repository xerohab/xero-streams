import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/browse/SectionHeader";
import StatusBadge from "@/components/browse/StatusBadge";

export default function SubscriptionSection({ activeSub, activePlan, plans, subscribingTo, onSubscribe, onCancel }) {
  const activePlans = plans.filter((p) => p.is_active);

  return (
    <section id="billing-section">
      <SectionHeader title="Billing & Subscriptions" />
      <div className="rounded-xl border border-border bg-card p-6">
        {activeSub ? (
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">Current Plan: {activePlan?.name || "Unknown"}</h3>
                <StatusBadge status="PREMIUM" />
              </div>
              <p className="text-muted-foreground">You are subscribed and have full access to premium features.</p>
            </div>
            <Button variant="destructive" onClick={() => onCancel(activeSub.id)}>Cancel Subscription</Button>
          </div>
        ) : (
          <div>
            <h3 className="mb-4 text-xl font-bold text-foreground">Choose a Plan</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activePlans.map((plan) => (
                <div key={plan.id} className="flex flex-col rounded-lg border border-border bg-background/40 p-5">
                  <h4 className="text-lg font-bold">{plan.name}</h4>
                  <p className="my-2 text-2xl font-black text-primary">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
                  </p>
                  <p className="mb-4 flex-1 text-sm text-muted-foreground">{plan.description}</p>
                  <Button className="w-full" onClick={() => onSubscribe(plan)} disabled={subscribingTo === plan.id}>
                    {subscribingTo === plan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Subscribe
                  </Button>
                </div>
              ))}
              {activePlans.length === 0 && <p className="text-muted-foreground">No active plans available.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}