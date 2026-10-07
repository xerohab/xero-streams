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