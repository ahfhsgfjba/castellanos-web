const { response, leadsStore, safeJson, normalizeLead } = require("./_shared");

function readPayload(event) {
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  if (contentType.includes("application/json")) return safeJson(event.body);
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("text/plain")) {
    return Object.fromEntries(new URLSearchParams(event.body || ""));
  }
  return safeJson(event.body);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed" });

  const lead = normalizeLead({ ...readPayload(event), source: "dashboard-copy" });
  const store = leadsStore();
  const index = await store.get("index.json", { type: "json" });
  const leads = Array.isArray(index) ? index : [];
  const next = [lead, ...leads.filter((item) => item.id !== lead.id)].slice(0, 500);

  await store.setJSON(`lead-${lead.id}.json`, lead);
  await store.setJSON("index.json", next);
  return response(200, { ok: true, lead });
};
