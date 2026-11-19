/** Read every hierarchy page; a full 2,000-record batch is not the end of the catalog. */
export default async function loadMediaRecords(entity, sort = "-created_date", pageSize = 2000) {
  const records = [];
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) throw new Error("Invalid catalogue page size");
  const seen = new Set();
  for (let offset = 0; offset <= 500000; offset += pageSize) {
    const page = await entity.list(sort, pageSize, offset);
    if (!Array.isArray(page) || page.length > pageSize) throw new Error("Invalid catalogue page");
    for (const record of page) {
      if (!record?.id || seen.has(record.id)) throw new Error("Repeated or invalid catalogue record");
      seen.add(record.id);
      records.push(record);
    }
    if (page.length < pageSize) return records;
  }
  throw new Error("Catalogue page limit exceeded");
}
export function mediaCatalogueQuery(client, kind, kidsProfileId) {
  const entity = kind === "videos" ? client.entities.Video : client.entities.Series;
  if (!kidsProfileId) {
    return {
      queryKey: ["cinema_catalog", kind],
      queryFn: () => loadMediaRecords(entity, "-created_date", kind === "videos" ? 2000 : 1000),
    };
  }
  return {
    queryKey: ["kids_catalogue", kidsProfileId, kind],
    queryFn: async () => {
      const rows = [];
      for (let offset = 0; offset <= 500000; offset += 500) {
        const { data } = await client.functions.invoke("profilePlayback", {
          action: "catalogue", profile_id: kidsProfileId, kind, offset,
        });
        if (!Array.isArray(data?.rows) || data.rows.length > 500) throw new Error("Invalid catalogue page");
        rows.push(...data.rows);
        if (data.next === null) return rows;
        if (data.next !== offset + 500) throw new Error("Invalid catalogue offset");
      }
      throw new Error("Catalogue page limit exceeded");
    },
  };
}
