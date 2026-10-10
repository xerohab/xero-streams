import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Link2,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PerkSphereAdminSection() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const { data: status, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["perksphere_admin_status"],
    queryFn: async () => {
      const res = await base44.functions.invoke("partnerAdminStatus", {});
      return res.data;
    },
  });

  const handleTestEvent = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke("partnerTestEvent", {});
      setTestResult(res.data);
    } catch (e) {
      setTestResult({
        ok: false,
        message: e.response?.data?.error || "Test event submission failed.",
      });
    } finally {
      setTesting(false);
      queryClient.invalidateQueries({ queryKey: ["perksphere_admin_status"] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!status) {
    return (
      <p className="text-sm text-muted-foreground">
        Unable to load Perk Sphere integration status.
      </p>
    );
  }

  const cred = status.credentials || {};
  const proof = status.proof_of_possession || {};
  const linking = status.account_linking || {};
  const delivery = status.event_delivery || {};

  return (
    <div className="space-y-4">
      {/* Credential Configuration */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Credential Configuration</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Configured:</span>{" "}
            {cred.configured ? (
              <CheckCircle2 className="inline w-3.5 h-3.5 text-green-400" />
            ) : (
              <XCircle className="inline w-3.5 h-3.5 text-destructive" />
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Key ID valid:</span>{" "}
            {cred.key_id_valid ? (
              <CheckCircle2 className="inline w-3.5 h-3.5 text-green-400" />
            ) : (
              <XCircle className="inline w-3.5 h-3.5 text-destructive" />
            )}
          </div>
          {cred.key_id && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Key ID:</span>{" "}
              <code className="text-foreground">{cred.key_id}</code>
            </div>
          )}
          {cred.key_id_mismatch && (
            <div className="col-span-2 rounded-md border border-destructive/40 bg-destructive/10 p-2">
              <AlertCircle className="inline w-3.5 h-3.5 text-destructive mr-1" />
              <span className="text-destructive">
                Key ID mismatch — configured:{" "}
                <code>{cred.key_id_mismatch.configured}</code>, expected:{" "}
                <code>{cred.key_id_mismatch.expected}</code>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Proof of Possession */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Proof of Possession</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge
              variant={proof.possession_verified ? "default" : "secondary"}
              className="text-xs"
            >
              {proof.status || "not_attempted"}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Activated:</span>{" "}
            {proof.activated ? (
              <CheckCircle2 className="inline w-3.5 h-3.5 text-green-400" />
            ) : (
              <XCircle className="inline w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Challenge:</span>{" "}
            {proof.challenge_status || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Confirm:</span>{" "}
            {proof.confirm_status || "—"}
          </div>
          {proof.error_code && (
            <div className="col-span-2 text-destructive">
              Error: {proof.error_code}
            </div>
          )}
        </div>
      </div>

      {/* Account Linking */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Account Linking</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Linked accounts:</span>{" "}
            <span className="text-foreground font-medium">
              {linking.total_linked || 0}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Unlinked:</span>{" "}
            <span className="text-foreground font-medium">
              {linking.total_unlinked || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Event Delivery */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Signed Event Delivery</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
          <div>
            <span className="text-muted-foreground">Recent successes:</span>{" "}
            <span className="text-green-400 font-medium">
              {delivery.recent_success || 0}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Recent errors:</span>{" "}
            <span className="text-destructive font-medium">
              {delivery.recent_errors || 0}
            </span>
          </div>
          {delivery.last_error && (
            <div className="col-span-2 text-muted-foreground">
              Last error: {delivery.last_error.error_code} (
              {delivery.last_error.event_type})
            </div>
          )}
        </div>

        {/* Recent errors */}
        {status.recent_errors && status.recent_errors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">
              Recent Integration Errors
            </p>
            {status.recent_errors.map((err, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded px-2 py-1"
              >
                <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
                <span className="font-mono">{err.error_code || "unknown"}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{err.activity || err.event_type}</span>
                {err.http_status && (
                  <>
                    <span className="text-muted-foreground/60">·</span>
                    <span>HTTP {err.http_status}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Event */}
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Test Event Submission</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          The Linux partner contract does not include a test event type.
          Permitted types: <code className="text-foreground">registration_completed</code>,{" "}
          <code className="text-foreground">stream_watch_progress</code>,{" "}
          <code className="text-foreground">stream_ended</code>. Use the
          proof-of-possession verification above to confirm integration health.
        </p>
        {testResult && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-border/40 bg-secondary/30 p-3 text-xs">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">{testResult.message}</p>
          </div>
        )}
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </div>
    </div>
  );
}