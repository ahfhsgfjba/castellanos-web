const { response, siteStore, readFallbackSite } = require("./_shared");

exports.handler = async () => {
  try {
    const store = siteStore();
    const saved = await store.get("site.json", { type: "json" });
    return response(200, saved || readFallbackSite());
  } catch (error) {
    try {
      return response(200, readFallbackSite());
    } catch {
      return response(500, { error: "Unable to load website content" });
    }
  }
};
