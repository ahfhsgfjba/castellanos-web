const { response, requireAuth, mediaStore, safeJson } = require("./_shared");

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm"
]);

function slug(value) {
  return String(value || "media")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "media";
}

function extension(name, type) {
  const ext = String(name || "").match(/\.([a-z0-9]+)$/i);
  if (ext) return ext[1].toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "video/mp4") return "mp4";
  if (type === "video/webm") return "webm";
  return "bin";
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed" });

  const authError = requireAuth(context);
  if (authError) return authError;

  const payload = safeJson(event.body);
  const name = payload.name || "media";
  const type = payload.type || "application/octet-stream";
  const base64 = String(payload.data || "").replace(/^data:[^;]+;base64,/, "");

  if (!ALLOWED.has(type)) return response(400, { error: "Unsupported file type" });
  if (!base64) return response(400, { error: "Missing file data" });

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > MAX_BYTES) return response(413, { error: "File is too large. Max upload size is 8 MB." });

  const key = `${Date.now()}-${slug(name)}.${extension(name, type)}`;
  const store = mediaStore();
  const url = `/.netlify/functions/media?key=${encodeURIComponent(key)}`;
  const item = {
    key,
    url,
    name,
    type,
    size: buffer.length,
    alt: payload.alt || "",
    category: payload.category || "general",
    uploadedAt: new Date().toISOString()
  };

  await store.set(key, buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), {
    metadata: item
  });

  const index = await store.get("index.json", { type: "json" });
  const items = Array.isArray(index) ? index : [];
  await store.setJSON("index.json", [item, ...items.filter((entry) => entry.key !== key)].slice(0, 500));

  return response(200, { ok: true, media: item });
};
