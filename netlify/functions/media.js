const { mediaStore } = require("./_shared");

exports.handler = async (event) => {
  const key = event.queryStringParameters && event.queryStringParameters.key;
  if (!key || key.includes("..")) {
    return { statusCode: 400, body: "Invalid media key" };
  }

  const item = await mediaStore().getWithMetadata(key, { type: "arrayBuffer" });
  if (!item) return { statusCode: 404, body: "Media not found" };

  const contentType = item.metadata && item.metadata.type ? item.metadata.type : "application/octet-stream";
  const buffer = Buffer.from(item.data);

  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    },
    body: buffer.toString("base64")
  };
};
