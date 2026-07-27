const { response, requireAuth, leadsStore } = require("./_shared");

exports.handler = async (event, context) => {
  const authError = requireAuth(context);
  if (authError) return authError;

  const store = leadsStore();
  const index = await store.get("index.json", { type: "json" });
  return response(200, { leads: Array.isArray(index) ? index : [] });
};
