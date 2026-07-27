const { response, requireAuth, mediaStore } = require("./_shared");

exports.handler = async (event, context) => {
  const authError = requireAuth(context);
  if (authError) return authError;

  const items = await mediaStore().get("index.json", { type: "json" });
  return response(200, { media: Array.isArray(items) ? items : [] });
};
