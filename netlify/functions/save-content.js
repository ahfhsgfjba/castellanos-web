const { response, requireAuth, siteStore, safeJson } = require("./_shared");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed" });

  const authError = requireAuth(context);
  if (authError) return authError;

  const payload = safeJson(event.body);
  if (!payload || typeof payload !== "object" || !payload.general || !payload.home) {
    return response(400, { error: "Invalid website content payload" });
  }

  payload.publishing = {
    ...(payload.publishing || {}),
    status: "published",
    lastUpdated: new Date().toISOString()
  };

  await siteStore().setJSON("site.json", payload);
  return response(200, { ok: true, content: payload });
};
