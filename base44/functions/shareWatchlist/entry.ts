import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
export default async function(req:Request){
 const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
 if(!u)return Response.json({error:'Sign in required'},{status:401});
 const b=await req.json(),db=base.asServiceRole.entities;
 const list=(await db.Watchlist.filter({id:b.id,user_id:u.id}))[0];
 if(!list)return Response.json({error:'List not found'},{status:404});
 const items=await db.WatchlistItem.filter({watchlist_id:list.id},'-created_date',200);
 const links=[];
 for(const item of items){
 const series=!!item.series_id;
 const rows=await (series?base.entities.Series:base.entities.Video).filter({id:series?item.series_id:item.video_id});
 const v=rows[0];if(!v||v.is_adult||v.coming_soon)continue;
 links.push({title:v.title,url:'https://xerostreams.com/'+(series?'series':v.series_id?'watch':'movie')+'?id='+encodeURIComponent(v.id)});
 }
 return Response.json({name:list.name,links});
}