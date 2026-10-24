import { base44 } from "@/api/base44Client";
import toast from "react-hot-toast";

// Announcement errors must never undo an already successful upload.
export async function announceNewRelease(type, record) {
  if (record?.is_adult || record?.coming_soon) return false;
  if (!record?.id) {
    toast.error("Discord announcement skipped: upload did not return a record ID");
    return false;
  }
  try {
    const result = await base44.functions.invoke("announceDiscordRelease", { type, id: record.id });
    if (result?.data?.error || result?.data?.sent === false) {
      const reason = result?.data?.error || "delivery_not_confirmed";
      console.warn("Discord announcement not sent:", reason);
      toast.error(`Content saved, but Discord announcement failed: ${reason}`);
      return false;
    }
    if (result?.data?.sent === true || result?.data?.duplicate === true) return true;
    toast.error("Content saved, but Discord did not confirm delivery");
    return false;
  } catch (error) {
    const reason = error?.response?.data?.error || error?.message || "request_failed";
    console.warn("Discord announcement not sent:", reason);
    toast.error(`Content saved, but Discord announcement failed: ${reason}`);
    return false;
  }
}
