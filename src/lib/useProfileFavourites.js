import {useProfile} from "@/lib/ProfileContext";
import {base44} from "@/api/base44Client";
export function useProfileFavourites(user,field){
 const {activeProfile,updateProfile}=useProfile();
 const values=activeProfile?(activeProfile[field]??(activeProfile.is_default?user?.[field]:[])??[]):[];
 const toggle=async(id)=>{
 if(!activeProfile)throw Error("Select a viewing profile");
 const next=values.includes(id)?values.filter(x=>x!==id):[...values,id];
 const updated=await updateProfile(activeProfile.id,{[field]:next});if(!updated)throw Error("Unable to update favourites");return next;
 };
 return {values,toggle};
}