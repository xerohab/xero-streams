import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

export default async function(req) {
  if (req.method !== "POST") return Response.json({error:"method_not_allowed"},{status:405});
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({error:"unauthorized"},{status:401});
  const users = await base44.asServiceRole.entities.User.filter({email:user.email});
  if (!users.some(x => x.id === user.id && x.role === "admin")) return Response.json({error:"forbidden"},{status:403});
  const {type,id} = await req.json();
  if (!["movie","series","episode"].includes(type) || typeof id !== "string" || !id) return Response.json({error:"invalid_input"},{status:400});
  const token = Deno.env.get("XERO_DISCORD_TOKEN");
  if (!token) return Response.json({error:"token_not_configured"},{status:503});
  const item = type === "series" ? await base44.asServiceRole.entities.Series.get(id) : await base44.asServiceRole.entities.Video.get(id);
  if (!item?.title || item.is_adult || item.coming_soon) return Response.json({error:"not_eligible"},{status:422});
  if (type !== "series" && item.content_type !== type) return Response.json({error:"type_mismatch"},{status:422});
  const payload = {type,id,title:item.title,description:item.description || "",poster_url:item.cover_image || item.thumbnail_url || "",url:"https://xerostreams.com/" + (type==="series"?"series":type==="movie"?"movie":"watch") + "?id=" + encodeURIComponent(id)};
  if(type==="episode") {
    const series = item.series_id ? await base44.asServiceRole.entities.Series.get(item.series_id) : null;
    if(series?.is_adult) return Response.json({error:"not_eligible"},{status:422});
    payload.series_title=series?.title || "";
    payload.season_number=item.season_number;
    payload.episode_number=item.episode_number;
  }
  const res = await fetch("https://discord-api.xerostreams.com/announce",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token},body:JSON.stringify(payload)});
  return Response.json(await res.json(),{status:res.status});
}
