import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Link2,
  Unlink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import SectionHeader from "@/components/browse/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PerkSphereSection({ user }) {
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const { data: connection, refetch } = useQuery({
    queryKey: ["perksphere_connection", user?.id],
    queryFn: async () => {
      const res = await base44.entities.PerkSphereConnection.filter(
        { user_id: user.id, status: "linked" },
        { limit: 1 }
      );
      const items = Array.isArray(res) ? res : res.items || [];
      return items[0] || null;
    },
    enabled: !!user,
  });

  const { data: rewards } = useQuery({
    queryKey: ["perksphere_rewards", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("partnerGetRewards", {});
      return res.data;
    },
    enabled: !!user && !!connection,
  });

  const handleConsent = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await base44.functions.invoke("partnerLinkConsent", { code });
      setConsent(res.data);
    } catch (e) {
      setError(
        e.response?.data?.error || "Unable to start the Perk Sphere connection."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await base44.functions.invoke("partnerLinkConfirm", {
        code,
        consent_token: consent.consent_token,
      });
      setConsent(null);
      setCode("");
      setInfo("Your Xero Streams account is now connected to Perk Sphere.");
      refetch();
    } catch (e) {
      setError(
        e.response?.data?.error || "Perk Sphere connection confirmation failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    if (!confirm("Disconnect your Perk Sphere account?")) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await base44.functions.invoke("partnerUnlink", {
        connection_id: connection.id,
      });
      setInfo("Your Perk Sphere account has been disconnected.");
      refetch();
    } catch (e) {
      setError(e.response?.data?.error || "Disconnection failed.");
    } finally {
      setBusy(false);
    }
  };

  const cancelConsent = () => {
    setConsent(null);
    setError(null);
  };

  return (
    <div className="mt-6">
      <SectionHeader
        title="Perk Sphere"
        subtitle="Connect your account to earn rewards across participating destinations."
      />
      <div className="max-w-xl rounded-lg border border-border/60 bg-card/40 p-5 space-y-4">
        {connection ? (
          <>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Connected to Perk Sphere</p>
                <p className="text-xs text-muted-foreground">
                  Eligible activity may be shared with Perk Sphere. Disconnect
                  anytime.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
              Disconnect
            </Button>
          </div>
          {rewards?.ok && rewards.rewards && (
            <div className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">Perk Sphere Balance</span>
              <span className="text-xs font-semibold text-primary">
                {rewards.rewards.points ?? "—"} Points · {rewards.rewards.xp ?? "—"} XP
              </span>
            </div>
          )}
          {rewards?.pending && (
            <div className="flex items-center gap-2 rounded-md border border-border/40 bg-secondary/30 px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Rewards pending — Perk Sphere activation required.
              </span>
            </div>
          )}
          </>
        ) : consent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Confirm account link</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {consent.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This consent session expires soon. Confirm to complete the link.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleConfirm} disabled={busy}>
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                Confirm &amp; Connect
              </Button>
              <Button variant="ghost" onClick={cancelConsent} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Generate a connection code at perksphere.org, then enter it below to
              link your account.
            </p>
            <Input
              placeholder="Enter Perk Sphere connection code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
            <Button
              onClick={handleConsent}
              disabled={busy || !code.trim()}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Connect to Perk Sphere
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
        {info && !error && (
          <div className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/10 p-3">
            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground">{info}</p>
          </div>
        )}
      </div>
    </div>
  );
}