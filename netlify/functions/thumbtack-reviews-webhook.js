const crypto = require("crypto");

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(data)
  };
}

const WEBHOOK_STORE = "castellanos-thumbtack-webhooks";
const WEBHOOK_SECRET_HEADER = "x-castellanos-webhook-secret";
const DIAGNOSTIC_HEADER_NAMES = new Set([
  "content-type",
  "content-length",
  "user-agent",
  "x-request-id",
  "x-correlation-id",
  "x-delivery-id",
  "x-event-id",
  "x-webhook-id",
  "x-signature",
  "x-hook-signature",
  "signature",
  "authorization"
]);

function getHeaderEntries(headers = {}) {
  return Object.entries(headers).reduce((result, [name, value]) => {
    const normalizedName = name.toLowerCase();
    if (DIAGNOSTIC_HEADER_NAMES.has(normalizedName) || normalizedName.startsWith("x-thumbtack-")) {
      result[normalizedName] = String(value);
    }
    return result;
  }, {});
}

function decodeBody(event) {
  if (!event.body) return Buffer.alloc(0);
  return Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
}

function textPreview(buffer) {
  if (!buffer.length) return "";
  const text = buffer.toString("utf8");
  return text.includes("\uFFFD") ? null : text;
}

function getHeader(headers = {}, headerName) {
  const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === headerName);
  return entry ? String(entry[1]) : "";
}

function matchesSecret(received, expected) {
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  // Local development is intentionally subject to the same secret requirement as production.
  const expectedSecret = process.env.THUMBTACK_WEBHOOK_SECRET || "";
  if (!expectedSecret) {
    return response(503, { error: "Webhook authentication is not configured" });
  }

  const receivedSecret = getHeader(event.headers, WEBHOOK_SECRET_HEADER);
  if (!receivedSecret || !matchesSecret(receivedSecret, expectedSecret)) {
    return response(401, { error: "Unauthorized" });
  }

  const { connectLambda, getStore } = await import("@netlify/blobs");
  connectLambda(event);
  const body = decodeBody(event);
  const captureId = `capture-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const capture = {
    captureId,
    receivedAt: new Date().toISOString(),
    method: event.httpMethod,
    path: event.path || "",
    isBase64Encoded: Boolean(event.isBase64Encoded),
    headers: getHeaderEntries(event.headers),
    bodyEncoding: "base64",
    bodyBase64: body.toString("base64"),
    bodyText: textPreview(body),
    bodyByteLength: body.length
  };

  await getStore(WEBHOOK_STORE).setJSON(`${captureId}.json`, capture);
  return response(202, { ok: true, captureId });
};
