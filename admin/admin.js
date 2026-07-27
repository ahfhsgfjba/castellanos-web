(function () {
  let currentUser = null;
  let siteData = null;

  const isDashboard = document.body.classList.contains("admin-shell") && location.pathname.includes("/dashboard");
  const isLeadsOnly = document.body.classList.contains("leads-shell");
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const statusNode = () => $("[data-dashboard-status]");

  if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", (user) => {
      currentUser = user;
      updateLoginState();
      if (!isDashboard && !user) {
        window.netlifyIdentity.on("login", () => {
          document.location.href = "/admin/";
        });
      }
    });
    window.netlifyIdentity.on("login", (user) => {
      currentUser = user;
      updateLoginState();
      if (isDashboard) loadLeads();
    });
    window.netlifyIdentity.on("logout", () => {
      currentUser = null;
      updateLoginState();
    });
  }

  if (!isDashboard) return;

  function setStatus(message, tone) {
    const node = statusNode();
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone || "";
  }

  function updateLoginState() {
    const button = $("[data-login-button]");
    if (!button) return;
    button.textContent = currentUser ? "Logout" : "Admin Login";
  }

  function token() {
    return currentUser && currentUser.token && currentUser.token.access_token;
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const response = await fetch(path, { ...options, headers });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  }

  function getPath(object, path) {
    return path.split(".").reduce((value, key) => value && value[key], object);
  }

  function setPath(object, path, value) {
    const parts = path.split(".");
    let target = object;
    parts.slice(0, -1).forEach((part) => {
      target[part] = target[part] || {};
      target = target[part];
    });
    target[parts[parts.length - 1]] = value;
  }

  function asset(value) {
    const clean = String(value || "").replace(/^\/+/, "");
    return clean ? `../${clean}` : "";
  }

  function excerpt(value, max = 100) {
    const clean = String(value || "").trim();
    return clean.length > max ? `${clean.slice(0, max).trim()}...` : clean;
  }

  function bindPanels() {
    $$("[data-panel-trigger]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        openPanel(trigger.dataset.panelTrigger);
      });
    });
  }

  function openPanel(panel) {
    $$("[data-panel-trigger]").forEach((item) => item.classList.toggle("active", item.dataset.panelTrigger === panel));
    $$("[data-panel]").forEach((item) => item.classList.toggle("active", item.dataset.panel === panel));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindStaticActions() {
    $("[data-login-button]")?.addEventListener("click", () => {
      if (!window.netlifyIdentity) return;
      if (currentUser) window.netlifyIdentity.logout();
      else window.netlifyIdentity.open();
    });
    $("[data-save-content]")?.addEventListener("click", saveContent);
    $("[data-refresh-leads]")?.addEventListener("click", loadLeads);
    $("[data-refresh-media]")?.addEventListener("click", loadMedia);
    $("[data-upload-media]")?.addEventListener("click", uploadMedia);
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("[data-inline-upload]")) {
        inlineUploadToPath(target.dataset.inlineUpload, target.dataset.accept || "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm");
      }
    });
    $("[data-add-service]")?.addEventListener("click", () => {
      siteData.services = siteData.services || [];
      siteData.services.push({
        active: true,
        title: "New Service",
        description: "Describe this service.",
        idealFor: [],
        image: "assets/bathroom-remodel.jpg",
        icon: "icon-tools",
        ctaText: "Request Quote",
        ctaLink: "#contact"
      });
      renderAll();
    });
    $("[data-add-project]")?.addEventListener("click", () => {
      siteData.projects = siteData.projects || [];
      siteData.projects.push({
        active: true,
        featured: false,
        title: "New Project",
        category: "Bathrooms",
        description: "",
        beforeImage: "",
        afterImage: "",
        images: []
      });
      renderAll();
    });
    $("[data-add-faq]")?.addEventListener("click", () => {
      siteData.faq = siteData.faq || [];
      siteData.faq.push({ active: true, question: "New question?", answer: "Add the answer here." });
      renderAll();
    });
  }

  function fillEditors() {
    $$("[data-edit]").forEach((input) => {
      input.value = getPath(siteData, input.dataset.edit) || "";
      input.oninput = () => {
        setPath(siteData, input.dataset.edit, input.value);
        renderPreviews();
      };
    });
    $$("[data-edit-list]").forEach((input) => {
      const value = getPath(siteData, input.dataset.editList);
      input.value = Array.isArray(value) ? value.join("\n") : "";
      input.oninput = () => {
        setPath(siteData, input.dataset.editList, input.value.split("\n").map((item) => item.trim()).filter(Boolean));
      };
    });
  }

  function renderPreviews() {
    const general = siteData.general || {};
    const publishing = siteData.publishing || {};
    const home = siteData.home || {};
    const seo = siteData.seo || {};

    text("status", publishing.status || "published");
    text("lastUpdated", publishing.lastUpdated ? new Date(publishing.lastUpdated).toLocaleDateString() : "Review needed");
    text("phone", general.phone || "");
    text("heroEyebrow", home.heroEyebrow || "");
    text("heroHeadline", home.heroHeadline || "");
    text("heroSubtitle", home.heroSubtitle || "");
    text("primaryCta", home.primaryCtaText || "");
    text("canonicalUrl", seo.canonicalUrl || general.websiteUrl || "");
    text("metaTitle", seo.metaTitle || "");
    text("metaDescription", seo.metaDescription || "");
    const heroImage = $("[data-field-img='heroImage']");
    if (heroImage && home.backgroundImage) heroImage.src = asset(home.backgroundImage);
  }

  function text(field, value) {
    const node = $(`[data-field="${field}"]`);
    if (node) node.textContent = value;
  }

  function renderServicePreview() {
    const grid = $("[data-services]");
    if (!grid) return;
    const services = (siteData.services || []).filter((item) => item.active !== false).slice(0, 8);
    grid.innerHTML = services.map((service) => `
      <article class="service-mini">
        <img src="${asset(service.image)}" alt="">
        <div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(excerpt(service.description))}</p><span class="status-pill">Active</span></div>
      </article>
    `).join("");
  }

  function renderServicesEditor() {
    const root = $("[data-services-editor]");
    if (!root) return;
    root.innerHTML = (siteData.services || []).map((service, index) => `
      <article class="stack-item">
        <div class="stack-item-head">
          <strong>${escapeHtml(service.title || `Service ${index + 1}`)}</strong>
          <div class="stack-actions">
            <button class="mini-btn" data-move-service="${index}" data-dir="-1">Up</button>
            <button class="mini-btn" data-move-service="${index}" data-dir="1">Down</button>
            <button class="mini-btn danger" data-remove-service="${index}">Remove</button>
          </div>
        </div>
        <div class="editor-grid stack-fields">
          <label>Active<select data-service="${index}" data-key="active"><option value="true">Active</option><option value="false">Hidden</option></select></label>
          <label>Title<input data-service="${index}" data-key="title" value="${attr(service.title)}"></label>
          <label class="wide">Description<textarea data-service="${index}" data-key="description" rows="3">${escapeHtml(service.description)}</textarea></label>
          <label>Image Path<span class="field-with-action"><input data-service="${index}" data-key="image" value="${attr(service.image)}"><button type="button" data-inline-upload-service="${index}" data-key="image">Upload</button></span></label>
          <label>Icon<input data-service="${index}" data-key="icon" value="${attr(service.icon)}"></label>
          <label class="wide">Ideal For<textarea data-service-list="${index}" rows="3">${escapeHtml((service.idealFor || []).join("\n"))}</textarea><small>One item per line.</small></label>
        </div>
      </article>
    `).join("");
    $$("[data-service]").forEach((input) => {
      const service = siteData.services[Number(input.dataset.service)];
      if (input.dataset.key === "active") input.value = String(service.active !== false);
      input.oninput = () => {
        service[input.dataset.key] = input.dataset.key === "active" ? input.value === "true" : input.value;
        renderPreviews();
        renderServicePreview();
      };
    });
    $$("[data-service-list]").forEach((input) => {
      input.oninput = () => {
        siteData.services[Number(input.dataset.serviceList)].idealFor = input.value.split("\n").map((item) => item.trim()).filter(Boolean);
      };
    });
    $$("[data-remove-service]").forEach((button) => button.onclick = () => {
      siteData.services.splice(Number(button.dataset.removeService), 1);
      renderAll();
    });
    $$("[data-move-service]").forEach((button) => button.onclick = () => {
      moveItem(siteData.services, Number(button.dataset.moveService), Number(button.dataset.dir));
      renderAll();
    });
    $$("[data-inline-upload-service]").forEach((button) => button.onclick = () => {
      inlineUpload((url) => {
        const service = siteData.services[Number(button.dataset.inlineUploadService)];
        service[button.dataset.key] = url;
        renderAll();
      }, "image/jpeg,image/png,image/webp,image/gif");
    });
  }

  function renderProjectPreview() {
    const grid = $("[data-projects]");
    if (!grid) return;
    const projects = (siteData.projects || []).filter((item) => item.active !== false).slice(0, 8);
    grid.innerHTML = projects.map((project) => {
      const image = project.afterImage || project.beforeImage || (project.images || [])[0] || "";
      return `<article class="project-mini"><img src="${asset(image)}" alt=""><div><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.category || "")}</p><span class="status-pill">${(project.images || []).length || 1} image${((project.images || []).length || 1) === 1 ? "" : "s"}</span></div></article>`;
    }).join("");
  }

  function renderProjectsEditor() {
    const root = $("[data-projects-editor]");
    if (!root) return;
    root.innerHTML = (siteData.projects || []).map((project, index) => `
      <article class="stack-item">
        <div class="stack-item-head">
          <strong>${escapeHtml(project.title || `Project ${index + 1}`)}</strong>
          <div class="stack-actions"><button class="mini-btn danger" data-remove-project="${index}">Remove</button></div>
        </div>
        <div class="editor-grid stack-fields">
          <label>Active<select data-project="${index}" data-key="active"><option value="true">Active</option><option value="false">Hidden</option></select></label>
          <label>Category<input data-project="${index}" data-key="category" value="${attr(project.category)}"></label>
          <label>Title<input data-project="${index}" data-key="title" value="${attr(project.title)}"></label>
          <label>After/Main Image<span class="field-with-action"><input data-project="${index}" data-key="afterImage" value="${attr(project.afterImage)}"><button type="button" data-inline-upload-project="${index}" data-key="afterImage">Upload</button></span></label>
          <label class="wide">Description<textarea data-project="${index}" data-key="description" rows="3">${escapeHtml(project.description)}</textarea></label>
          <label class="wide">Gallery Images<textarea data-project-list="${index}" rows="4">${escapeHtml((project.images || []).join("\n"))}</textarea><button class="mini-btn" type="button" data-inline-upload-project-list="${index}">Upload & Add Image</button><small>One image path per line.</small></label>
        </div>
      </article>
    `).join("");
    $$("[data-project]").forEach((input) => {
      const project = siteData.projects[Number(input.dataset.project)];
      if (input.dataset.key === "active") input.value = String(project.active !== false);
      input.oninput = () => {
        project[input.dataset.key] = input.dataset.key === "active" ? input.value === "true" : input.value;
        renderProjectPreview();
      };
    });
    $$("[data-project-list]").forEach((input) => {
      input.oninput = () => {
        siteData.projects[Number(input.dataset.projectList)].images = input.value.split("\n").map((item) => item.trim()).filter(Boolean);
      };
    });
    $$("[data-remove-project]").forEach((button) => button.onclick = () => {
      siteData.projects.splice(Number(button.dataset.removeProject), 1);
      renderAll();
    });
    $$("[data-inline-upload-project]").forEach((button) => button.onclick = () => {
      inlineUpload((url) => {
        const project = siteData.projects[Number(button.dataset.inlineUploadProject)];
        project[button.dataset.key] = url;
        renderAll();
      }, "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm");
    });
    $$("[data-inline-upload-project-list]").forEach((button) => button.onclick = () => {
      inlineUpload((url) => {
        const project = siteData.projects[Number(button.dataset.inlineUploadProjectList)];
        project.images = project.images || [];
        project.images.push(url);
        renderAll();
      }, "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm");
    });
  }

  function renderFaqEditor() {
    const root = $("[data-faq-editor]");
    if (!root) return;
    root.innerHTML = (siteData.faq || []).map((item, index) => `
      <article class="stack-item">
        <div class="stack-item-head">
          <strong>${escapeHtml(item.question || `FAQ ${index + 1}`)}</strong>
          <div class="stack-actions"><button class="mini-btn danger" data-remove-faq="${index}">Remove</button></div>
        </div>
        <div class="editor-grid stack-fields">
          <label>Active<select data-faq="${index}" data-key="active"><option value="true">Active</option><option value="false">Hidden</option></select></label>
          <label>Question<input data-faq="${index}" data-key="question" value="${attr(item.question)}"></label>
          <label class="wide">Answer<textarea data-faq="${index}" data-key="answer" rows="3">${escapeHtml(item.answer)}</textarea></label>
        </div>
      </article>
    `).join("");
    $$("[data-faq]").forEach((input) => {
      const item = siteData.faq[Number(input.dataset.faq)];
      if (input.dataset.key === "active") input.value = String(item.active !== false);
      input.oninput = () => {
        item[input.dataset.key] = input.dataset.key === "active" ? input.value === "true" : input.value;
      };
    });
    $$("[data-remove-faq]").forEach((button) => button.onclick = () => {
      siteData.faq.splice(Number(button.dataset.removeFaq), 1);
      renderAll();
    });
  }

  function moveItem(items, index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
  }

  function renderLeads(leads) {
    const root = $("[data-leads-list]");
    const count = $("[data-lead-count]");
    if (count) count.textContent = String((leads || []).length);
    if (!root) return;
    if (!leads || !leads.length) {
      root.innerHTML = `<p class="helper-text">No leads yet. New quote requests will appear here after Netlify is deployed.</p>`;
      return;
    }
    root.innerHTML = leads.map((lead) => `
      <article class="lead-card">
        <div><span>Name</span><strong>${escapeHtml(lead.name || "Unknown")}</strong></div>
        <div><span>Contact</span><strong>${escapeHtml(lead.phone || "")}</strong><p>${escapeHtml(lead.email || "")}</p></div>
        <div><span>Service</span><strong>${escapeHtml(lead.service || "Not specified")}</strong><p>${escapeHtml(lead.city || "")}</p></div>
        <div><span>Details</span><p>${escapeHtml(excerpt(lead.description || "", 180))}</p></div>
      </article>
    `).join("");
  }

  async function loadContent() {
    setStatus("Loading website content...");
    try {
      siteData = await api("/.netlify/functions/get-content");
    } catch {
      const response = await fetch("../content/site.json", { cache: "no-cache" });
      siteData = await response.json();
    }
    renderAll();
    setStatus("Content loaded. Edit visually and save when ready.", "ok");
  }

  async function saveContent() {
    if (!siteData) return;
    if (!currentUser && window.netlifyIdentity && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      window.netlifyIdentity.open();
      return;
    }
    setStatus("Saving changes...");
    try {
      const result = await api("/.netlify/functions/save-content", {
        method: "POST",
        body: JSON.stringify(siteData)
      });
      siteData = result.content || siteData;
      renderAll();
      setStatus("Changes saved. Refresh the public site to review.", "ok");
    } catch {
      setStatus("Could not save. Make sure you are logged in on Netlify.", "error");
    }
  }

  async function loadLeads() {
    try {
      const result = await api("/.netlify/functions/get-leads");
      renderLeads(result.leads || []);
      if (isLeadsOnly) setStatus("Leads loaded. Click Refresh to check for new requests.", "ok");
    } catch {
      renderLeads([]);
      if (isLeadsOnly) setStatus("Could not load leads. Make sure you are logged in on Netlify.", "error");
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function chooseFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept || "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";
      input.onchange = () => resolve(input.files && input.files[0]);
      input.click();
    });
  }

  async function uploadFileObject(file, alt = "", category = "inline") {
    const data = await readFileAsBase64(file);
    const result = await api("/.netlify/functions/upload-media", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
        data,
        alt,
        category
      })
    });
    await loadMedia();
    return result.media.url;
  }

  async function inlineUpload(callback, accept) {
    if (!currentUser && window.netlifyIdentity && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      window.netlifyIdentity.open();
      return;
    }
    const file = await chooseFile(accept);
    if (!file) return;
    setStatus("Uploading media...");
    try {
      const url = await uploadFileObject(file, "", "inline");
      callback(url);
      setStatus("Media uploaded and added to the field. Save website changes when ready.", "ok");
    } catch {
      setStatus("Media upload failed. Check file size, login, or Netlify Functions.", "error");
    }
  }

  function inlineUploadToPath(path, accept) {
    inlineUpload((url) => {
      setPath(siteData, path, url);
      renderAll();
    }, accept);
  }

  async function uploadMedia() {
    const fileInput = $("[data-media-file]");
    const status = $("[data-media-status]");
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) {
      if (status) status.textContent = "Choose an image or video first.";
      return;
    }
    if (!currentUser && window.netlifyIdentity && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      window.netlifyIdentity.open();
      return;
    }
    if (status) status.textContent = "Uploading media...";
    try {
      const data = await readFileAsBase64(file);
      const result = await api("/.netlify/functions/upload-media", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          data,
          alt: $("[data-media-alt]")?.value || "",
          category: $("[data-media-category]")?.value || "general"
        })
      });
      if (status) status.textContent = `Uploaded. Use this URL: ${result.media.url}`;
      if (fileInput) fileInput.value = "";
      await loadMedia();
    } catch (error) {
      if (status) status.textContent = "Upload failed. Check file size, login, or Netlify Functions.";
    }
  }

  async function loadMedia() {
    const root = $("[data-media-list]");
    if (!root) return;
    try {
      const result = await api("/.netlify/functions/list-media");
      renderMedia(result.media || []);
    } catch {
      root.innerHTML = `<p class="helper-text">Media library will appear here after the site is deployed on Netlify and uploads are added.</p>`;
    }
  }

  function renderMedia(items) {
    const root = $("[data-media-list]");
    if (!root) return;
    if (!items.length) {
      root.innerHTML = `<p class="helper-text">No uploaded media yet.</p>`;
      return;
    }
    root.innerHTML = items.map((item) => {
      const preview = String(item.type || "").startsWith("video/")
        ? `<video src="${item.url}" muted controls preload="metadata"></video>`
        : `<img src="${item.url}" alt="${escapeHtml(item.alt || item.name)}">`;
      return `<article class="media-card">
        ${preview}
        <div>
          <strong>${escapeHtml(item.name || item.key)}</strong>
          <span class="status-pill">${escapeHtml(item.category || "general")}</span>
          <code>${escapeHtml(item.url)}</code>
          <button class="mini-btn" type="button" data-copy-media="${escapeHtml(item.url)}">Copy URL</button>
        </div>
      </article>`;
    }).join("");
    $$("[data-copy-media]").forEach((button) => {
      button.onclick = async () => {
        const url = button.dataset.copyMedia;
        try {
          await navigator.clipboard.writeText(url);
          button.textContent = "Copied";
        } catch {
          button.textContent = url;
        }
      };
    });
  }

  function renderAll() {
    fillEditors();
    renderPreviews();
    renderServicePreview();
    renderServicesEditor();
    renderProjectPreview();
    renderProjectsEditor();
    renderFaqEditor();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function attr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  bindPanels();
  bindStaticActions();
  const initialView = new URLSearchParams(location.search).get("view");
  if (initialView === "leads") openPanel("leads");
  if (initialView === "edit") openPanel("overview");
  if (!isLeadsOnly) loadContent();
  loadLeads();
  if (!isLeadsOnly) loadMedia();
})();
