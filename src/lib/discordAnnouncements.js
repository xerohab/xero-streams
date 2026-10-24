import { base44 } from "@/api/base44Client";
import toast from "react-hot-toast";

// Announcement errors must never undo an already successful upload.
export async function announceNewRelease(type, record) {
  if (!record?.id || record.is_adult || record.coming_soon) return;
  try {
    const result = await base44.functions.invoke("announceDiscordRelease", { type, id: record.id });
    if (result?.data?.error || result?.data?.sent === false) {
      const reason = result?.data?.error || "delivery_not_confirmed";
      console.warn("Discord announcement not sent:", reason);
      toast.error(`Content saved, but Discord announcement failed: ${reason}`);
    }
  } catch (error) {
    const reason = error?.response?.data?.error || error?.message || "request_failed";
    console.warn("Discord announcement not sent:", reason);
    toast.error(`Content saved, but Discord announcement failed: ${reason}`);
  }
}
