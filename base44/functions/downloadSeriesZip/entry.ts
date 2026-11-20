// Retired: the client uses individually authorized proxyDownload requests.
export default async function(_req:Request){return Response.json({error:'Use authorized episode downloads'},{status:410,headers:{'Cache-Control':'no-store'}});}
