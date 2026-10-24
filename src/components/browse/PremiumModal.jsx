import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Loader2, Check, Sparkles, Download, MessageSquare, Heart } from "lucide-react";
import { usePremiumModal } from "@/lib/PremiumModalContext";
import toast from "react-hot-toast";

const PREMIUM_PERKS = [
  { icon: Download, label: "Download episodes & movies" },
  { icon: MessageSquare, label: "Request new content" },
  { icon: Heart, label: "Unlimited favourites & watchlists" },
  { icon: Sparkles, label: "Priority access to new releases" },
];

export default function PremiumModal() {
  const { isOpen, close } = usePremiumModal();
  const [subscribingTo, setSubscribingTo] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["current_user"],
    queryFn: () => base44.auth.me().catch(() => null),
    enabled: isOpen,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription_plans"],
    queryFn: () => base44.entities.SubscriptionPlan.list(),
    enabled: isOpen,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["user_subscriptions_premium", user?.id],
    queryFn: () => base44.entities.UserSubscription.filter({ user_id: user.id, status: "active" }),
    enabled: isOpen && !!user,
  });

  const activeSub = subscriptions[0];
  const activePlan = activeSub ? plans.find((p) => p.id === activeSub.plan_id) : null;
  const isPremium = user?.role === "admin" || !!activeSub;

  const handleSubscribe = async (plan) => {
    if (!user) {
      close();
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    setSubscribingTo(plan.id);
    try {
      const res = await base44.functions.invoke("premiumCheckout", { action: "create", plan_id: plan.id });
      if (res.data?.approvalUrl) {
        localStorage.setItem("pending_plan_purchase", JSON.stringify({ plan_id: plan.id }));
        window.location.href = res.data.approvalUrl;
      } else {
        throw new Error(res.data?.error || "Failed to start checkout");
      }
    } catch (err) {
      toast.error(err.message || "Failed to start checkout");
      setSubscribingTo(null);
    }
  };

  const activePlans = plans.filter((p) => p.is_active);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black">Go Premium</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Unlock downloads, content requests, and more.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Perks */}
        <div className="grid grid-cols-2 gap-3 my-4">
          {PREMIUM_PERKS.map((perk) => (
            <div key={perk.label} className="flex items-center gap-2 bg-secondary/60 rounded-lg p-3">
              <perk.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">{perk.label}</span>
            </div>
          ))}
        </div>

        {isPremium ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center">
            <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-foreground">You're a Premium member</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activePlan ? `Current plan: ${activePlan.name}` : "You have full access to all premium features."}
            </p>
            <Button variant="outline" className="mt-4" onClick={close}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {activePlans.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No active plans available right now.</p>
            ) : (
              activePlans.map((plan) => (
                <div key={plan.id} className="border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-foreground">{plan.name}</h4>
                      {plan.interval === "lifetime" && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Best Value</Badge>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                    )}
                    <p className="text-2xl font-black text-primary">
                      £{plan.price}
                      <span className="text-sm text-muted-foreground font-normal">/{plan.interval}</span>
                    </p>
                  </div>
                  <Button
                    className="sm:w-40"
                    onClick={() => handleSubscribe(plan)}
                    disabled={subscribingTo === plan.id}
                  >
                    {subscribingTo === plan.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                    Subscribe
                  </Button>
                </div>
              ))
            )}
            {!user && (
              <p className="text-xs text-muted-foreground text-center pt-2">Sign in required to subscribe.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}