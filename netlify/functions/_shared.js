const fs = require("fs");
const path = require("path");
const { getStore } = require("@netlify/blobs");

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

function isAuthed(context) {
  if (process.env.NETLIFY_DEV === "true") return true;
  return Boolean(context && context.clientContext && context.clientContext.user);
}

function requireAuth(context) {
  if (!isAuthed(context)) {
    return response(401, { error: "Authentication required" });
  }
  return null;
}

function siteStore() {
  return getStore("castellanos-site");
}

function leadsStore() {
  return getStore("castellanos-leads");
}

function mediaStore() {
  return getStore("castellanos-media");
}

function readFallbackSite() {
  const file = path.join(process.cwd(), "content", "site.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function safeJson(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function normalizeLead(input = {}) {
  const now = new Date().toISOString();
  const data = input.data || input;
  const id = input.id || data.id || `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    createdAt: input.createdAt || data.createdAt || data.created_at || now,
    name: data.name || data.full_name || data["Full Name"] || "",
    phone: data.phone || data["Phone Number"] || "",
    email: data.email || "",
    city: data.city || "",
    service: data.service || data.service_needed || "",
    contactMethod: data.contact_method || data.contactMethod || "",
    description: data.description || data.project_details || "",
    source: input.source || "website",
    status: input.status || "new",
    raw: data
  };
}

module.exports = {
  response,
  requireAuth,
  siteStore,
  leadsStore,
  mediaStore,
  readFallbackSite,
  safeJson,
  normalizeLead
};
