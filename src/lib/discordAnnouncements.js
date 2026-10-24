import { base44 } from "@/api/base44Client";

// Announcement errors must never undo an already successful upload.
export async function announceNewRelease(type, record) {
  if (!record?.id || record.is_adult || record.coming_soon) return;
  try {
    const result = await base44.functions.invoke("announceDiscordRelease", { type, id: record.id });
    if (result?.data?.error) console.warn("Discord announcement not sent:", result.data.error);
  } catch (error) {
    console.warn("Discord announcement not sent:", error?.message || "request_failed");
  }
}
