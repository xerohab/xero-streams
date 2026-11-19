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

async function authorizeProfile(profile, allowSetup=false){
 try{
 const status=await base44.functions.invoke("profilePin",{action:"status",profile_id:profile.id});
 if(status.data?.requires_setup){
 if(!allowSetup){window.alert("An adult must configure a PIN before this profile can be opened.");return false;}
 const new_pin=await requestProfilePin("Set an adult profile PIN (4–8 digits)");
 if(!new_pin||!/^\d{4,8}$/.test(new_pin)||await requestProfilePin("Confirm adult PIN")!==new_pin)return false;
 const setup=await base44.functions.invoke("profilePin",{action:"set",profile_id:profile.id,new_pin});
 return setup.data?.ok===true;
 }
 if(status.data?.enabled===false)return true;
 if(status.data?.enabled!==true)throw new Error("Unavailable");
 const pin=await requestProfilePin("Enter PIN for "+profile.name);
 if(pin===null)return false;
 const result=await base44.functions.invoke("profilePin",{action:"verify",profile_id:profile.id,pin});
 if(result.data?.ok===true)return true;
 }catch{}
 window.alert("Profile could not be unlocked. Check your PIN or try again later.");
 return false;
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
        const defaultProfile = await base44.entities.ViewingProfile.create({
          user_id: u.id,
          name: u.full_name || "Main Profile",
          avatar: "popcorn",
          is_default: true,
          is_kids: false,
        });
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
      if(active?.is_kids){for(const adult of list.filter(p=>!p.is_kids)){const status=await base44.functions.invoke("profilePin",{action:"status",profile_id:adult.id});if(status.data?.enabled!==true){active=null;break;}}}
      const authorized=active && await authorizeProfile(active,false);
      if(version!==generation.current)return;
      if (authorized) {
        setActiveProfileState(active);
        localStorage.setItem(ACTIVE_KEY, active.id);
        setPlaybackProfile(active.id); syncPlayback(active.id);
        window.dispatchEvent(new Event("xero-profile-changed"));
        // Update last_used_date in background
        base44.entities.ViewingProfile.update(active.id, { last_used_date: new Date().toISOString() }).catch(() => {});
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
    if(!target)return false;
    const version=++generation.current;
    if(target.is_kids){try{for(const adult of profiles.filter(p=>!p.is_kids)){const r=await base44.functions.invoke("profilePin",{action:"status",profile_id:adult.id});if(r.data?.enabled!==true){window.alert("Set a PIN on every adult profile before entering Kids mode.");return false;}}}catch{return false;}}
    if(!(await authorizeProfile(target,false)))return false;
    if(version!==generation.current)return false;
    profile=target;
    setActiveProfileState(profile);
    localStorage.setItem(ACTIVE_KEY, profile.id);
    setPlaybackProfile(profile.id); syncPlayback(profile.id);
    // Notify continue-watching system to reload profile-scoped data
    window.dispatchEvent(new Event("xero-profile-changed"));
    // Update last_used_date
    base44.entities.ViewingProfile.update(profile.id, { last_used_date: new Date().toISOString() }).catch(() => {});
    return true;
  }, [profiles]);

  // Create a new profile
  const createProfile = useCallback(async (data) => {
    if (!user || !activeProfile || activeProfile.is_kids) return null;
    if (profiles.length >= MAX_PROFILES) return null;
    if(!data.is_kids&&profiles.some(p=>p.is_kids)){window.alert("Remove Kids profiles before adding an unprotected adult profile.");return null;}
    if(data.is_kids){for(const adult of profiles.filter(p=>!p.is_kids)){const r=await base44.functions.invoke("profilePin",{action:"status",profile_id:adult.id});if(r.data?.enabled!==true){window.alert("Set a PIN on every adult profile before creating a Kids profile.");return null;}}}
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
  }, [user, profiles, activeProfile]);

  // Update a profile
  const updateProfile = useCallback(async (id, data) => {
    const profile=profiles.find(p=>p.id===id);
    if(!profile||!activeProfile||(activeProfile.is_kids&&(id!==activeProfile.id||Object.keys(data).some(k=>!["favourites","favourite_series","favourite_franchises"].includes(k)))))return null;
    if(Object.hasOwn(data,"is_kids")&&Boolean(data.is_kids)!==Boolean(profile.is_kids)){window.alert("Profile age mode cannot be changed. Create a new profile instead.");return null;}
    const updated = await base44.entities.ViewingProfile.update(id, data);
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
    if(!profile||(!profile.is_kids&&profiles.filter(p=>!p.is_kids).length<=1)||!(await authorizeProfile(profile)))return false;
    // Clear profile-scoped localStorage data
    await base44.entities.ViewingProfile.delete(id);
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