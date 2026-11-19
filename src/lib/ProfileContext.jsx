import {requestProfilePin} from "@/lib/requestProfilePin";
import {setPlaybackProfile,syncPlayback} from "@/hooks/useContinueWatching";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Viewing Profile Context
 * Manages multiple viewing profiles per account, with localStorage-based
 * profile-scoped continue-watching and watched history.
 *
 * Migration: existing localStorage data is copied to the default profile
 * on first load, preserving all existing progress.
 */

const ProfileContext = createContext(null);
export const useProfile = () => useContext(ProfileContext);

const ACTIVE_KEY = "xero_active_profile";
const MIGRATED_KEY = "xero_profiles_migrated";
const MAX_PROFILES = 5;

// Predefined avatar options (emoji-based, no upload required)
const AVATAR_OPTIONS = [
  { id: "popcorn", emoji: "🍿", color: "#f5c518" },
  { id: "film", emoji: "🎬", color: "#e74c3c" },
  { id: "clapper", emoji: "🎞️", color: "#3498db" },
  { id: "tv", emoji: "📺", color: "#2ecc71" },
  { id: "star", emoji: "⭐", color: "#9b59b6" },
  { id: "rocket", emoji: "🚀", color: "#e67e22" },
  { id: "ghost", emoji: "👻", color: "#95a5a6" },
  { id: "gamepad", emoji: "🎮", color: "#1abc9c" },
  { id: "robot", emoji: "🤖", color: "#34495e" },
  { id: "crown", emoji: "👑", color: "#f39c12" },
];

async function authorizeProfile(profile) {
  try {
    const { data: status } = await base44.functions.invoke("profilePin", { action: "status", profile_id: profile.id });
    if (status?.requires_setup) {
      window.alert("An adult must configure a PIN before this profile can be opened.");
      return false;
    }
    if (typeof status?.enabled !== "boolean") throw new Error("PIN status unavailable");
    const pin = status.enabled ? await requestProfilePin("Enter PIN for " + profile.name) : undefined;
    if (pin === null) return false;
    const result = await base44.functions.invoke("profilePin", { action: "verify", profile_id: profile.id, pin });
    if (result.data?.ok === true) return true;
  } catch {}
  window.alert(profile.is_kids
    ? "This profile couldn't be opened. Check that every adult profile has a PIN and try again."
    : "Profile could not be unlocked. Check your PIN or try again later.");
  return false;
}

async function manageProfile(active, action, payload) {
  const { data: status } = await base44.functions.invoke("profilePin", { action: "status", profile_id: active.id });
  if (status?.requires_setup || typeof status?.enabled !== "boolean") return null;
  const pin = status.enabled ? await requestProfilePin("Enter PIN for " + active.name) : undefined;
  if (pin === null) return null;
  const result = await base44.functions.invoke("profilePin", { ...payload, action, profile_id: active.id, pin });
  return result.data;
}

export function ProfileProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfileState] = useState(null);
  const [loading, setLoading] = useState(true);
  const migratedRef = useRef(false);
  const generation = useRef(0);

  // Load user and profiles
  const loadProfiles = useCallback(async (u, version) => {
    if (!u || u.is_banned || version!==generation.current) return;
    try {
      const list = await base44.entities.ViewingProfile.filter({ user_id: u.id });
      if(version!==generation.current)return;
      list.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0));

      // Migration: if no profiles exist, create a default one
      if (list.length === 0 && !migratedRef.current) {
        migratedRef.current = true;
        const { data } = await base44.functions.invoke("profilePin", { action: "bootstrap" });
        const defaultProfile = data?.profile;
        if (!defaultProfile) return;
        if(version!==generation.current)return;
        // Copy existing localStorage continue-watching to the default profile's namespace
        migrateLocalStorageData(defaultProfile.id);
        list.push(defaultProfile);
      }

      setProfiles(list);

      // Restore active profile from localStorage, validate it belongs to this user
      const savedId = localStorage.getItem(ACTIVE_KEY);
      let active = list.find((p) => p.id === savedId);
      if (!active) active = list[0]; // fallback to first (default)
      if(version!==generation.current)return;
      const authorized=active && await authorizeProfile(active);
      if(version!==generation.current)return;
      if (authorized) {
        setActiveProfileState(active);
        localStorage.setItem(ACTIVE_KEY, active.id);
        setPlaybackProfile(active.id); syncPlayback(active.id);
        window.dispatchEvent(new Event("xero-profile-changed"));
        // Update last_used_date in background
        base44.functions.invoke("profilePin", { action: "touch", profile_id: active.id }).catch(() => {});
      } else {setActiveProfileState(null);localStorage.removeItem(ACTIVE_KEY);setPlaybackProfile(null);}
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      if(version===generation.current)setLoading(false);
    }
  }, []);

  // Initialise
  useEffect(() => {
    const version=++generation.current;
    base44.auth.me().then((u) => {
      if(version!==generation.current)return;
      setUser(u&&!u.is_banned?u:null);
      if (u&&!u.is_banned) loadProfiles(u,version);
      else setLoading(false);
    }).catch(() => {if(version===generation.current)setLoading(false);});
    return()=>{generation.current++;};
  }, [loadProfiles]);

  // Switch active profile
  const switchProfile = useCallback(async (profile) => {
    const target=profiles.find(p=>p.id===profile?.id);
    if(!target||loading)return false;
    const version=++generation.current;
    if(version!==generation.current)return false;
    if(!(await authorizeProfile(target)))return false;
    if(version!==generation.current)return false;
    profile=target;
    setActiveProfileState(profile);
    localStorage.setItem(ACTIVE_KEY, profile.id);
    setPlaybackProfile(profile.id); syncPlayback(profile.id);
    // Notify continue-watching system to reload profile-scoped data
    window.dispatchEvent(new Event("xero-profile-changed"));
    // Update last_used_date
    base44.functions.invoke("profilePin", { action: "touch", profile_id: profile.id }).catch(() => {});
    return true;
  }, [profiles, loading]);

  // Create a new profile
  const createProfile = useCallback(async (data) => {
    if (!user || !activeProfile || activeProfile.is_kids) return null;
    if (profiles.length >= MAX_PROFILES) return null;
    if(!data.is_kids&&profiles.some(p=>p.is_kids)){window.alert("Remove Kids profiles before adding an unprotected adult profile.");return null;}
    if(data.is_kids){for(const adult of profiles.filter(p=>!p.is_kids)){const r=await base44.functions.invoke("profilePin",{action:"status",profile_id:adult.id});if(r.data?.enabled!==true){window.alert("Set a PIN on every adult profile before creating a Kids profile.");return null;}}}
    const result = await manageProfile(activeProfile, "create_profile", { data: {
      name: data.name || "New Profile", avatar: data.avatar || "popcorn",
      accent_color: data.accent_color || null, is_kids: Boolean(data.is_kids)
    } });
    const profile = result?.profile;
    if (!profile) return null;
    setProfiles((prev) => [...prev, profile]);
    return profile;
  }, [user, profiles, activeProfile]);

  // Update a profile
  const updateProfile = useCallback(async (id, data) => {
    const profile=profiles.find(p=>p.id===id);
    if(!profile||!activeProfile||(activeProfile.is_kids&&(id!==activeProfile.id||Object.keys(data).some(k=>!["favourites","favourite_series","favourite_franchises"].includes(k)))))return null;
    if(Object.hasOwn(data,"is_kids")&&Boolean(data.is_kids)!==Boolean(profile.is_kids)){window.alert("Profile age mode cannot be changed. Create a new profile instead.");return null;}
    const allowed = new Set(['name','avatar','accent_color','favourites','favourite_series','favourite_franchises']);
    if(Object.keys(data).some(k=>!allowed.has(k)&&k!=='is_kids'))return null;
    data=Object.fromEntries(Object.entries(data).filter(([k])=>allowed.has(k)));
    const version=generation.current;
    const fields = new Set(["name", "avatar", "accent_color"]);
    const preferences = Object.fromEntries(Object.entries(data).filter(([key]) => !fields.has(key)));
    let updated;
    if (Object.keys(data).some(key => fields.has(key))) {
      const record = { ...profile, ...data };
      const result = await manageProfile(activeProfile, "edit_profile", {
        target_id: id, data: { name: record.name, avatar: record.avatar || "popcorn", accent_color: record.accent_color }
      });
      updated = result?.profile;
      if (!updated) return null;
    }
    if (Object.keys(preferences).length) {
      const result = await base44.functions.invoke("profilePin", { action: "favourites", profile_id: id, data: preferences });
      updated = result.data?.profile;
    }
    if (!updated) return null;
    if(version!==generation.current)return null;
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    if (activeProfile?.id === id) {
      setActiveProfileState((prev) => ({ ...prev, ...data }));
    }
    return updated;
  }, [activeProfile, profiles]);

  // Delete a profile
  const deleteProfile = useCallback(async (id) => {
    // Don't allow deleting if it's the only profile
    if (profiles.length <= 1 || !activeProfile || activeProfile.is_kids) return false;
    const profile=profiles.find(p=>p.id===id);
    if(!profile||(!profile.is_kids&&profiles.filter(p=>!p.is_kids).length<=1))return false;
    // Clear profile-scoped localStorage data
    const result = await manageProfile(activeProfile, "delete_profile", { target_id: id });
    if (!result?.ok) return false;
    clearProfileStorage(id);
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    // If deleting active, switch to first remaining
    if (activeProfile?.id === id && remaining.length > 0) {
      setActiveProfileState(null);
      localStorage.removeItem(ACTIVE_KEY);
      setPlaybackProfile(null);
      window.dispatchEvent(new Event("xero-profile-changed"));
    }
    return true;
  }, [profiles, activeProfile, switchProfile]);

  // Clear active profile on logout
  const clearActiveProfile = useCallback(() => {
    generation.current++;
    setLoading(false);
    setActiveProfileState(null);
    localStorage.removeItem(ACTIVE_KEY);
    setPlaybackProfile(null);
  }, []);

  const value = {
    user,
    profiles,
    activeProfile,
    loading,
    maxProfiles: MAX_PROFILES,
    avatarOptions: AVATAR_OPTIONS,
    switchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    clearActiveProfile,
    // Helper for profile-scoped localStorage keys
    storageKey: (base) => activeProfile ? `${base}_${activeProfile.id}` : base,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// --- Profile-scoped localStorage migration helpers ---

function migrateLocalStorageData(profileId) {
  if (localStorage.getItem(MIGRATED_KEY)) return;
  // Copy existing continue-watching data to the profile namespace
  const cw = localStorage.getItem("xero_continue_watching");
  const watched = localStorage.getItem("xero_watched");
  if (cw) localStorage.setItem(`xero_continue_watching_${profileId}`, cw);
  if (watched) localStorage.setItem(`xero_watched_${profileId}`, watched);
  localStorage.setItem(MIGRATED_KEY, "1");
}

function clearProfileStorage(profileId) {
  localStorage.removeItem(`xero_continue_watching_${profileId}`);
  localStorage.removeItem(`xero_watched_${profileId}`);
}

export { AVATAR_OPTIONS, MAX_PROFILES };