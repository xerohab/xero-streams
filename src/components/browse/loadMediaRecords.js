/** Read every hierarchy page; a full 2,000-record batch is not the end of the catalog. */
export default async function loadMediaRecords(entity, sort = "-created_date", pageSize = 2000) {
  const records = [];
  let page;
  do {
    page = await entity.list(sort, pageSize, records.length);
    records.push(...page);
  } while (page.length === pageSize);
  return records;
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
