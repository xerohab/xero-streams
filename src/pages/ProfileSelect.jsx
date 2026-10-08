import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Check, X, Trash2, ArrowLeft } from "lucide-react";
import { useProfile, AVATAR_OPTIONS } from "@/lib/ProfileContext";
import { base44 } from "@/api/base44Client";

/**
 * "Who's Watching?" profile selector screen.
 * Shown after login when the user has multiple profiles, or when switching.
 */
export default function ProfileSelect({ manage = false }) {
  const navigate = useNavigate();
  const { profiles, activeProfile, switchProfile, createProfile, updateProfile, deleteProfile, loading, maxProfiles, avatarOptions } = useProfile() || {};
  const [managing, setManaging] = useState(manage);
  const [editing, setEditing] = useState(null); // profile being edited
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", avatar: "popcorn", is_kids: false });

  useEffect(() => {
    document.title = "Who's Watching? | Xero Streams";
    return () => { document.title = "Xero Streams"; };
  }, []);

  // Redirect to home if only one profile and not in manage mode
  useEffect(() => {
    if (!loading && profiles.length <= 1 && !managing) {
      if (activeProfile) navigate("/", { replace: true });
    }
  }, [loading, profiles.length, managing, activeProfile, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleSelect = (profile) => {
    if (managing) return;
    switchProfile(profile);
    navigate("/", { replace: true });
  };

  const startCreate = () => {
    setForm({ name: "", avatar: "popcorn", is_kids: false });
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createProfile({ name: form.name.trim(), avatar: form.avatar, is_kids: form.is_kids });
    setCreating(false);
    setForm({ name: "", avatar: "popcorn", is_kids: false });
  };

  const startEdit = (profile) => {
    setForm({ name: profile.name, avatar: profile.avatar || "popcorn", is_kids: profile.is_kids });
    setEditing(profile.id);
  };

  const handleSaveEdit = async () => {
    if (!form.name.trim()) return;
    await updateProfile(editing, { name: form.name.trim(), avatar: form.avatar, is_kids: form.is_kids });
    setEditing(null);
    setForm({ name: "", avatar: "popcorn", is_kids: false });
  };

  const handleDelete = async (profile) => {
    if (profiles.length <= 1) return;
    if (!confirm(`Delete "${profile.name}"? This will remove this profile's watch progress and My List. Your account, subscriptions and purchases are not affected.`)) return;
    await deleteProfile(profile.id);
  };

  const canAdd = profiles.length < maxProfiles;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-foreground sm:text-4xl">{managing ? "Manage Profiles" : "Who's Watching?"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{managing ? "Edit, create or delete viewing profiles" : "Select a viewing profile to continue"}</p>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-6">
        {profiles.map((profile) => {
          const avatar = avatarOptions.find((a) => a.id === profile.avatar) || avatarOptions[0];
          const isEditing = editing === profile.id;
          return (
            <div key={profile.id} className="flex flex-col items-center gap-2">
              {isEditing ? (
                <div className="w-28 rounded-xl border border-primary bg-card p-3 sm:w-32">
                  <div className="mb-2 flex flex-wrap justify-center gap-1">
                    {avatarOptions.slice(0, 6).map((a) => (
                      <button key={a.id} type="button" onClick={() => setForm((f) => ({ ...f, avatar: a.id }))}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${form.avatar === a.id ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-secondary"}`}>
                        {a.emoji}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mb-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm text-foreground outline-none focus:border-primary"
                    placeholder="Profile name" maxLength={30} autoFocus />
                  <label className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={form.is_kids} onChange={(e) => setForm((f) => ({ ...f, is_kids: e.target.checked }))} />
                    Kids Profile
                  </label>
                  <div className="flex gap-1">
                    <button onClick={handleSaveEdit} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground"><Check className="h-3.5 w-3.5" /> Save</button>
                    <button onClick={() => setEditing(null)} className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => managing ? startEdit(profile) : handleSelect(profile)}
                  className="group relative flex h-28 w-28 items-center justify-center rounded-xl border-2 border-border bg-card transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 sm:h-32 sm:w-32">
                  <span className="text-5xl sm:text-6xl">{avatar?.emoji}</span>
                  {managing && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
                      <Pencil className="h-6 w-6 text-foreground" />
                    </span>
                  )}
                  {profile.is_kids && <span className="absolute bottom-1 right-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">KIDS</span>}
                </button>
              )}
              <div className="flex items-center gap-1">
                <span className="max-w-[120px] truncate text-sm font-semibold text-foreground">{profile.name}</span>
                {managing && !isEditing && profiles.length > 1 && (
                  <button onClick={() => handleDelete(profile)} className="text-muted-foreground hover:text-destructive" title="Delete profile">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Profile tile */}
        {canAdd && !creating && (
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={startCreate}
              className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 transition-all hover:border-primary hover:bg-card sm:h-32 sm:w-32">
              <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
            </button>
            <span className="text-sm font-semibold text-muted-foreground">Add Profile</span>
          </div>
        )}

        {/* Create form */}
        {creating && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-28 rounded-xl border border-primary bg-card p-3 sm:w-32">
              <div className="mb-2 flex flex-wrap justify-center gap-1">
                {avatarOptions.slice(0, 6).map((a) => (
                  <button key={a.id} type="button" onClick={() => setForm((f) => ({ ...f, avatar: a.id }))}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${form.avatar === a.id ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-secondary"}`}>
                    {a.emoji}
                  </button>
                ))}
              </div>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mb-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm text-foreground outline-none focus:border-primary"
                placeholder="Profile name" maxLength={30} autoFocus />
              <label className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={form.is_kids} onChange={(e) => setForm((f) => ({ ...f, is_kids: e.target.checked }))} />
                Kids Profile
              </label>
              <div className="flex gap-1">
                <button onClick={handleCreate} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground"><Check className="h-3.5 w-3.5" /> Add</button>
                <button onClick={() => setCreating(false)} className="rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">New Profile</span>
          </div>
        )}
      </div>

      {/* Manage / Done toggle */}
      {profiles.length > 0 && (
        <div className="mt-10 flex gap-3">
          {managing ? (
            <button onClick={() => setManaging(false)} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">Done</button>
          ) : (
            <button onClick={() => setManaging(true)} className="rounded-lg border border-border px-6 py-2.5 text-sm font-bold text-muted-foreground hover:border-primary hover:text-foreground">Manage Profiles</button>
          )}
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 rounded-lg border border-border px-6 py-2.5 text-sm font-bold text-muted-foreground hover:border-primary hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      )}
    </div>
  );
}