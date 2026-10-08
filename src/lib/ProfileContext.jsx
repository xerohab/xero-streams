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

export function ProfileProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfileState] = useState(null);
  const [loading, setLoading] = useState(true);
  const migratedRef = useRef(false);

  // Load user and profiles
  const loadProfiles = useCallback(async (u) => {
    if (!u) return;
    try {
      const list = await base44.entities.ViewingProfile.filter({ user_id: u.id });
      list.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0) || (a.sort_order || 0) - (b.sort_order || 0));

      // Migration: if no profiles exist, create a default one
      if (list.length === 0 && !migratedRef.current) {
        migratedRef.current = true;
        const defaultProfile = await base44.entities.ViewingProfile.create({
          user_id: u.id,
          name: u.full_name || "Main Profile",
          avatar: "popcorn",
          is_default: true,
          is_kids: false,
        });
        // Copy existing localStorage continue-watching to the default profile's namespace
        migrateLocalStorageData(defaultProfile.id);
        list.push(defaultProfile);
      }

      setProfiles(list);

      // Restore active profile from localStorage, validate it belongs to this user
      const savedId = localStorage.getItem(ACTIVE_KEY);
      let active = list.find((p) => p.id === savedId);
      if (!active) active = list[0]; // fallback to first (default)
      if (active) {
        setActiveProfileState(active);
        localStorage.setItem(ACTIVE_KEY, active.id);
        // Update last_used_date in background
        base44.entities.ViewingProfile.update(active.id, { last_used_date: new Date().toISOString() }).catch(() => {});
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialise
  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      if (u) loadProfiles(u);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, [loadProfiles]);

  // Switch active profile
  const switchProfile = useCallback((profile) => {
    setActiveProfileState(profile);
    localStorage.setItem(ACTIVE_KEY, profile.id);
    // Notify continue-watching system to reload profile-scoped data
    window.dispatchEvent(new Event("xero-profile-changed"));
    // Update last_used_date
    base44.entities.ViewingProfile.update(profile.id, { last_used_date: new Date().toISOString() }).catch(() => {});
  }, []);

  // Create a new profile
  const createProfile = useCallback(async (data) => {
    if (!user) return null;
    if (profiles.length >= MAX_PROFILES) return null;
    const profile = await base44.entities.ViewingProfile.create({
      user_id: user.id,
      name: data.name || "New Profile",
      avatar: data.avatar || "popcorn",
      accent_color: data.accent_color || null,
      is_kids: data.is_kids || false,
      is_default: false,
    });
    setProfiles((prev) => [...prev, profile]);
    return profile;
  }, [user, profiles.length]);

  // Update a profile
  const updateProfile = useCallback(async (id, data) => {
    const updated = await base44.entities.ViewingProfile.update(id, data);
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    if (activeProfile?.id === id) {
      setActiveProfileState((prev) => ({ ...prev, ...data }));
    }
    return updated;
  }, [activeProfile]);

  // Delete a profile
  const deleteProfile = useCallback(async (id) => {
    // Don't allow deleting if it's the only profile
    if (profiles.length <= 1) return false;
    // Clear profile-scoped localStorage data
    clearProfileStorage(id);
    await base44.entities.ViewingProfile.delete(id);
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    // If deleting active, switch to first remaining
    if (activeProfile?.id === id && remaining.length > 0) {
      switchProfile(remaining[0]);
    }
    return true;
  }, [profiles, activeProfile, switchProfile]);

  // Clear active profile on logout
  const clearActiveProfile = useCallback(() => {
    setActiveProfileState(null);
    localStorage.removeItem(ACTIVE_KEY);
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