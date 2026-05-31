import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldAlert, KeyRound, Trash2, Ban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function EditUserModal({ user, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    role: user?.role || "user",
    age_verified: user?.age_verified || false,
    date_of_birth: user?.date_of_birth || "",
    full_name: user?.full_name || "",
    username: user?.username || "",
    email: user?.email || "",
    is_banned: user?.is_banned || false,
  });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assigningPlan, setAssigningPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription_plans"],
    queryFn: () => base44.entities.SubscriptionPlan.list()
  });

  const { data: userSubs = [], refetch: refetchSubs } = useQuery({
    queryKey: ["user_subscriptions", user?.id],
    queryFn: () => base44.entities.UserSubscription.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  useEffect(() => {
    if (user) {
      setForm({
        role: user.role || "user",
        age_verified: user.age_verified || false,
        date_of_birth: user.date_of_birth || "",
        full_name: user.full_name || "",
        username: user.username || "",
        email: user.email || "",
        is_banned: user.is_banned || false,
      });
      setNewPassword("");
      setConfirmDelete(false);
      setSelectedPlanId("");
    }
  }, [user]);

  const handleAssignPlan = async () => {
    if (!selectedPlanId) return;
    setAssigningPlan(true);
    try {
      await base44.entities.UserSubscription.create({
        user_id: user.id,
        plan_id: selectedPlanId,
        status: "active",
        paypal_order_id: "manual_admin_grant"
      });
      refetchSubs();
      setSelectedPlanId("");
    } catch(e) {
      console.error(e);
      alert("Failed to assign plan");
    }
    setAssigningPlan(false);
  };

  const handleCancelSub = async (subId) => {
    if(confirm("Cancel this subscription?")) {
      await base44.entities.UserSubscription.update(subId, { status: "cancelled" });
      refetchSubs();
    }
  };

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.User.update(user.id, form);
    setSaving(false);
    onSaved();
    onClose();
  };

  const handlePasswordChange = async () => {
    if (!newPassword.trim() || newPassword.length < 6) return;
    setChangingPassword(true);
    await base44.asServiceRole?.entities?.User?.update?.(user.id, { password: newPassword }).catch(() => {});
    // Note: password changes via entity update may not be supported - this is best-effort
    setChangingPassword(false);
    setNewPassword("");
    alert("Password change submitted. Note: password changes require backend support.");
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await base44.entities.User.delete(user.id);
    setDeleting(false);
    onSaved();
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
          {/* User Info (Editable) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={form.username} onChange={e => update("username", e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => update("email", e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-destructive" />
              <div>
                <Label className="text-destructive">Ban User</Label>
                <p className="text-xs text-muted-foreground">Revoke access to the site</p>
              </div>
            </div>
            <Switch checked={form.is_banned} onCheckedChange={v => update("is_banned", v)} />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => update("role", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => update("date_of_birth", e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          {/* Subscription Management */}
          <div className="space-y-2 border-t border-border pt-4">
            <Label>Subscriptions</Label>
            <div className="space-y-2">
              {userSubs.filter(s => s.status === 'active').map(sub => {
                const p = plans.find(plan => plan.id === sub.plan_id);
                return (
                  <div key={sub.id} className="flex items-center justify-between bg-primary/10 border border-primary/20 p-2 rounded text-sm">
                    <span className="font-semibold text-primary">{p?.name || "Unknown Plan"} (Active)</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive hover:text-destructive" onClick={() => handleCancelSub(sub.id)}>Cancel</Button>
                  </div>
                );
              })}
              {userSubs.filter(s => s.status === 'active').length === 0 && (
                <p className="text-xs text-muted-foreground">No active subscriptions.</p>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a plan to grant" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} (${p.price})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="secondary" 
                onClick={handleAssignPlan} 
                disabled={!selectedPlanId || assigningPlan}
              >
                {assigningPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grant Access"}
              </Button>
            </div>
          </div>

          {/* Age Verification */}
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              {form.age_verified ? (
                <ShieldCheck className="w-4 h-4 text-green-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <Label className={form.age_verified ? "text-green-400" : ""}>18+ Age Verified</Label>
                <p className="text-xs text-muted-foreground">Grants access to adult content</p>
              </div>
            </div>
            <Switch
              checked={form.age_verified}
              onCheckedChange={(v) => update("age_verified", v)}
            />
          </div>

          {/* Password Change */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Change Password
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-secondary border-border"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePasswordChange}
                disabled={changingPassword || newPassword.length < 6}
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Password changes are managed via the platform's auth system.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>

          {/* Delete User */}
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              className={`w-full gap-2 ${confirmDelete ? "bg-destructive/20 text-destructive hover:bg-destructive/30" : "text-destructive hover:text-destructive hover:bg-destructive/10"}`}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {confirmDelete ? "Click again to confirm deletion" : "Delete User Account"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}