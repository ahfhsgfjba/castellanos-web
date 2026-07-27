const { response, leadsStore, safeJson, normalizeLead } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed" });

  const lead = normalizeLead({ ...safeJson(event.body), source: "dashboard-copy" });
  const store = leadsStore();
  const index = await store.get("index.json", { type: "json" });
  const leads = Array.isArray(index) ? index : [];
  const next = [lead, ...leads.filter((item) => item.id !== lead.id)].slice(0, 500);

  await store.setJSON(`lead-${lead.id}.json`, lead);
  await store.setJSON("index.json", next);
  return response(200, { ok: true, lead });
};
