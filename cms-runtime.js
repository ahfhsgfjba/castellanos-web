(function () {
  const CONTENT_URL = "content/site.json";
  const API_CONTENT_URL = "/.netlify/functions/get-content";
  const iconFallbacks = ["icon-pin", "icon-home", "icon-tools", "icon-form", "icon-check"];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const active = (items) => (items || []).filter((item) => item && item.active !== false);
  const text = (selector, value, root = document) => {
    const node = $(selector, root);
    if (node && value !== undefined && value !== null) node.textContent = value;
  };
  const attr = (selector, name, value, root = document) => {
    const node = $(selector, root);
    if (node && value) node.setAttribute(name, value);
  };
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const url = (value) => value ? encodeURI(String(value)).replace(/#/g, "%23").replace(/\?/g, "?").replace(/&/g, "&") : "";
  const tel = (value) => `tel:${String(value || "").replace(/[^\d+]/g, "")}`;
  const slug = (value) => String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  function setMeta(name, content, property = false) {
    if (!content) return;
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let tag = $(selector);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(property ? "property" : "name", name);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  }

  function setLink(rel, href) {
    if (!href) return;
    let tag = $(`link[rel="${rel}"]`);
    if (!tag) {
      tag = document.createElement("link");
      tag.setAttribute("rel", rel);
      document.head.appendChild(tag);
    }
    tag.setAttribute("href", href);
  }

  function applyBrand(data) {
    const brand = data.brand || {};
    const root = document.documentElement;
    if (brand.primaryColor) root.style.setProperty("--navy", brand.primaryColor);
    if (brand.secondaryColor) root.style.setProperty("--charcoal", brand.secondaryColor);
    if (brand.accentColor) root.style.setProperty("--gold", brand.accentColor);
    if (brand.backgroundColor) root.style.setProperty("--white", brand.backgroundColor);
    if (brand.logo) {
      $$(".brand-logo").forEach((img) => { img.src = brand.logo; });
    }
    if (brand.footerLogo) {
      $$(".footer-logo").forEach((img) => { img.src = brand.footerLogo; });
    }
    if (brand.favicon) setLink("icon", brand.favicon);
  }

  function applySeo(data) {
    const seo = data.seo || {};
    const general = data.general || {};
    if (seo.metaTitle) document.title = seo.metaTitle;
    setMeta("description", seo.metaDescription);
    setMeta("og:title", seo.ogTitle || seo.metaTitle, true);
    setMeta("og:description", seo.ogDescription || seo.metaDescription, true);
    setMeta("og:image", seo.ogImage, true);
    setMeta("og:url", seo.canonicalUrl || general.websiteUrl, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:image", seo.twitterCardImage || seo.ogImage);
    setLink("canonical", seo.canonicalUrl || general.websiteUrl);

    const schema = {
      "@context": "https://schema.org",
      "@type": "HomeAndConstructionBusiness",
      name: general.businessName,
      url: seo.canonicalUrl || general.websiteUrl,
      email: general.email,
      telephone: general.phoneHref || general.phone,
      address: {
        "@type": "PostalAddress",
        addressLocality: general.mainCity || "Dallas",
        addressRegion: "TX",
        addressCountry: "US"
      },
      areaServed: general.serviceAreas,
      description: seo.metaDescription
    };
    let script = $('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);

    (seo.imageAltTexts || []).forEach((item) => {
      if (item.path && item.alt) $$(`img[src="${CSS.escape(item.path)}"]`).forEach((img) => { img.alt = item.alt; });
    });
  }

  function applyBusiness(data) {
    const general = data.general || {};
    const phoneHref = tel(general.phoneHref || general.phone);
    $$(".header-call").forEach((a) => {
      a.href = phoneHref;
      a.textContent = `Call Now: ${general.phone || ""}`;
    });
    $$(".contact-strip a[href^='tel'], .sticky-cta a[href^='tel']").forEach((a) => {
      a.href = phoneHref;
      if (a.classList.contains("btn")) return;
      a.innerHTML = `<svg><use href="#icon-phone"></use></svg>${esc(general.phone)}`;
    });
    $$("a[href^='mailto:']").forEach((a) => {
      a.href = `mailto:${general.email}`;
      if (a.textContent.includes("@")) a.textContent = general.email;
    });
    const footerContact = $(".footer-grid > div:last-child");
    if (footerContact) {
      const socials = general.socialLinks || {};
      const socialLinks = [
        ["f", socials.facebook],
        ["ig", socials.instagram],
        ["G", socials.googleBusinessProfile],
        ["yt", socials.youtube],
        ["tt", socials.tiktok]
      ].filter(([, href]) => href);
      const socialHtml = socialLinks.length
        ? `<div class="socials">${socialLinks.map(([label, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`).join("")}</div>`
        : `<div class="socials"><span>f</span><span>ig</span><span>G</span></div>`;
      footerContact.innerHTML = `<h3>Contact</h3>
        <p>Phone: <a href="${phoneHref}">${esc(general.phone)}</a></p>
        <p>Email: <a href="mailto:${esc(general.email)}">${esc(general.email)}</a></p>
        <p>Location: ${esc(general.address)}</p>
        <p>Website: ${esc(String(general.websiteUrl || "").replace(/^https?:\/\//, ""))}</p>${socialHtml}`;
    }
  }

  function renderHero(data) {
    const home = data.home || {};
    text(".hero .eyebrow", home.heroEyebrow);
    text(".hero h1", home.heroHeadline);
    text(".hero-lead", home.heroSubtitle);
    attr(".hero-bg", "src", home.backgroundImage);
    if (home.backgroundImage) attr(".hero-bg", "alt", home.heroHeadline || "Home remodeling project");
    const trust = $(".trust-list");
    if (trust && home.trustBadges) {
      trust.innerHTML = home.trustBadges.map((badge, index) => `<span><svg><use href="#${iconFallbacks[index % iconFallbacks.length]}"></use></svg>${esc(badge)}</span>`).join("");
    }
    const ctas = $$(".hero .cta-row a");
    if (ctas[0]) { ctas[0].textContent = home.primaryCtaText || ctas[0].textContent; ctas[0].href = home.primaryCtaLink || ctas[0].href; }
    if (ctas[1]) { ctas[1].textContent = home.secondaryCtaText || ctas[1].textContent; ctas[1].href = home.secondaryCtaLink || ctas[1].href; }
  }

  function renderTrust(data) {
    const trust = data.trust || {};
    text(".trust-band .section-heading h2", trust.title);
    const grid = $(".trust-cards");
    if (!grid || !trust.cards) return;
    grid.innerHTML = active(trust.cards).map((card) => `<article class="mini-card reveal"><svg><use href="#${esc(card.icon || "icon-check")}"></use></svg><h3>${esc(card.title)}</h3><p>${esc(card.description)}</p></article>`).join("");
  }

  function renderAbout(data) {
    const about = data.about || {};
    attr("#about .image-panel img", "src", about.image);
    attr("#about .image-panel img", "alt", about.headline);
    if (about.backgroundImage) {
      const aboutSection = document.getElementById("about");
      aboutSection?.style.setProperty("--about-bg", `url("${about.backgroundImage}")`);
    }
    text("#about h2", about.headline);
    const panel = $("#about .text-panel");
    if (panel && about.text) {
      const eyebrow = panel.querySelector(".eyebrow")?.outerHTML || "";
      const stats = (about.stats || []).map((stat) => `<strong>${esc(stat.value)}<span>${esc(stat.label)}</span></strong>`).join("");
      panel.innerHTML = `${eyebrow}<h2>${esc(about.headline)}</h2>${about.text.map((p) => `<p>${esc(p)}</p>`).join("")}<div class="stats">${stats}</div><a class="btn btn-primary" href="${esc(about.ctaLink || "#contact")}">${esc(about.ctaText || "Request a Quote")}</a>`;
    }
  }

  function renderServices(data) {
    const grid = $(".service-grid");
    if (!grid || !data.services) return;
    grid.innerHTML = active(data.services).map((service) => `<article class="service-card reveal" id="service-${esc(slug(service.title))}">
      <img src="${url(service.image)}" alt="${esc(service.title)}" loading="lazy">
      <div class="card-body"><svg><use href="#${esc(service.icon || "icon-tools")}"></use></svg><h3>${esc(service.title)}</h3>
      <p>${esc(service.description)}</p>
      <small>Ideal for: ${esc((service.idealFor || []).join(", "))}.</small>
      <a href="${esc(service.ctaLink || "#contact")}">${esc(service.ctaText || "Request Quote")}</a></div>
    </article>`).join("");
  }

  function projectCarousel(project) {
    const images = project.images || [];
    const dots = images.map((_, i) => `<button class="proj-dot${i === 0 ? " active" : ""}" aria-label="Go to slide ${i + 1}"></button>`).join("");
    const slides = images.map((image) => `<div class="proj-slide"><img src="${url(image)}" alt="${esc(project.title)}" loading="lazy"><div class="proj-slide-overlay"></div></div>`).join("");
    return `<div class="proj-carousel reveal" data-project-carousel>
      <div class="proj-track-wrap"><div class="proj-track">${slides}</div></div>
      <div class="proj-controls"><button class="proj-prev" aria-label="Previous">&#8249;</button><button class="proj-next" aria-label="Next">&#8250;</button></div>
      <div class="proj-bottom"><div class="proj-dots">${dots}</div><span class="proj-label">${esc(project.title)}</span></div>
    </div>`;
  }

  function renderProjects(data) {
    const tabs = $(".proj-tabs");
    if (!tabs || !data.projects) return;
    const panels = $$(".proj-panel");
    const projects = active(data.projects).filter((project) => (project.images || []).length);
    const categories = [...new Set(projects.map((project) => project.category))];
    if (!categories.length) return;
    tabs.innerHTML = categories.map((category, index) => {
      const id = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `<button class="proj-tab${index === 0 ? " active" : ""}" data-tab="${id}" role="tab" aria-selected="${index === 0}" aria-controls="tab-${id}">${esc(category)}</button>`;
    }).join("");
    panels.forEach((panel) => panel.remove());
    const markup = categories.map((category, index) => {
      const id = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const cards = projects.filter((project) => project.category === category).map(projectCarousel).join("");
      return `<div class="proj-panel${index === 0 ? " active" : ""}" id="tab-${id}" role="tabpanel"><div class="proj-category-grid">${cards}</div></div>`;
    }).join("");
    tabs.insertAdjacentHTML("afterend", markup);
    bindProjectTabs();
    document.querySelectorAll("[data-project-carousel]").forEach((carousel) => {
      delete carousel.dataset.carouselInit;
      if (typeof window.initSingleCarousel === "function") window.initSingleCarousel(carousel);
    });
  }

  function bindProjectTabs() {
    document.querySelectorAll(".proj-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.dataset.tab;
        document.querySelectorAll(".proj-tab").forEach((item) => {
          item.classList.remove("active");
          item.setAttribute("aria-selected", "false");
        });
        document.querySelectorAll(".proj-panel").forEach((panel) => panel.classList.remove("active"));
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        const panel = document.getElementById("tab-" + id);
        if (panel) {
          panel.classList.add("active");
          panel.querySelectorAll("[data-project-carousel]").forEach((carousel) => {
            if (typeof window.initSingleCarousel === "function") window.initSingleCarousel(carousel);
          });
        }
      });
    });
  }

  function renderProcess(data) {
    const process = data.process || {};
    text(".process .section-heading h2", process.title);
    text(".process .section-heading p:not(.eyebrow)", process.description);
    const timeline = $(".timeline");
    if (!timeline || !process.steps) return;
    timeline.innerHTML = active(process.steps).map((step, index) => `<article data-step="${String(index + 1).padStart(2, "0")}"><svg><use href="#${esc(step.icon || "icon-check")}"></use></svg><h3>${esc(step.title)}</h3><p>${esc(step.description)}</p></article>`).join("");
  }

  function renderWhy(data) {
    const why = data.whyChooseUs || {};
    text(".why-grid > div:nth-child(2) h2", why.title);
    text(".why-grid > div:nth-child(2) p:not(.eyebrow)", why.description);
    const list = $(".why-list");
    if (!list || !why.cards) return;
    list.innerHTML = active(why.cards).map((card) => `<article><svg><use href="#${esc(card.icon || "icon-check")}"></use></svg><h3>${esc(card.title)}</h3></article>`).join("");
  }

  function renderAreas(data) {
    const areas = data.areas || {};
    text(".areas h2", `Serving ${areas.mainCity || "Dallas"}, TX and Nearby Areas`);
    const paragraph = $(".areas .area-grid > div:first-child p:not(.eyebrow):not(.area-cta)");
    if (paragraph) paragraph.textContent = `Castellanos Tile and Remodeling Services provides remodeling and home improvement services in ${areas.mainCity || "Dallas"} and surrounding Texas areas.`;
    const cta = $(".areas .btn");
    if (cta) { cta.textContent = areas.ctaText || cta.textContent; cta.href = areas.ctaLink || cta.href; }
  }

  function renderFaq(data) {
    const accordion = $(".accordion");
    if (!accordion || !data.faq) return;
    accordion.innerHTML = active(data.faq).map((item, index) => `<details${index === 0 ? " open" : ""}><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join("");
  }

  function renderReviews(data) {
    $(".reviews-section")?.remove();
  }

  function injectTracking(data) {
    const tracking = data.tracking || {};
    if (tracking.googleAnalyticsMeasurementId) {
      const id = esc(tracking.googleAnalyticsMeasurementId);
      document.head.insertAdjacentHTML("beforeend", `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"><\/script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');<\/script>`);
    }
    if (tracking.googleTagManagerId) {
      const id = esc(tracking.googleTagManagerId);
      document.head.insertAdjacentHTML("beforeend", `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${id}');<\/script>`);
      document.body.insertAdjacentHTML("afterbegin", `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`);
    }
    if (tracking.metaPixelId) {
      const id = esc(tracking.metaPixelId);
      document.head.insertAdjacentHTML("beforeend", `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');<\/script>`);
    }
    if (tracking.googleAdsConversionId) {
      const id = esc(tracking.googleAdsConversionId);
      document.head.insertAdjacentHTML("beforeend", `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"><\/script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');<\/script>`);
    }
    if (tracking.tiktokPixelId) {
      const id = esc(tracking.tiktokPixelId);
      document.head.insertAdjacentHTML("beforeend", `<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]={};var n=d.createElement('script');n.type='text/javascript',n.async=!0,n.src=i+'?sdkid='+e+'&lib='+t;var a=d.getElementsByTagName('script')[0];a.parentNode.insertBefore(n,a)};ttq.load('${id}');ttq.page()}(window,document,'ttq');<\/script>`);
    }
    if (tracking.customHeaderScripts) document.head.insertAdjacentHTML("beforeend", tracking.customHeaderScripts);
    if (tracking.customBodyScripts) document.body.insertAdjacentHTML("afterbegin", tracking.customBodyScripts);
    if (tracking.customFooterScripts) document.body.insertAdjacentHTML("beforeend", tracking.customFooterScripts);
  }

  function exposeFormSettings(data) {
    window.CASTELLANOS_SITE_CONTENT = data;
    const forms = data.forms || {};
    const form = $("#contact-form");
    if (!form) return;
    active(forms.fields).forEach((field) => {
      const input = form.elements[field.name];
      if (!input) return;
      input.closest("label")?.classList.remove("cms-hidden");
      input.required = Boolean(field.required);
      const label = input.closest("label");
      if (label && field.label) label.childNodes[0].textContent = field.label;
    });
    (forms.fields || []).filter((field) => field.enabled === false).forEach((field) => {
      const input = form.elements[field.name];
      input?.closest("label")?.classList.add("cms-hidden");
    });
  }

  function refreshRevealObserver() {
    $$(".reveal").forEach((item) => item.classList.add("is-visible"));
  }

  fetch(API_CONTENT_URL, { cache: "no-cache" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Blob content not found")))
    .catch(() => fetch(CONTENT_URL, { cache: "no-cache" }).then((response) => response.ok ? response.json() : Promise.reject(new Error("CMS content not found"))))
    .then((data) => {
      applyBrand(data);
      applySeo(data);
      applyBusiness(data);
      renderHero(data);
      renderTrust(data);
      renderAbout(data);
      renderServices(data);
      renderProjects(data);
      renderProcess(data);
      renderWhy(data);
      renderAreas(data);
      renderFaq(data);
      renderReviews(data);
      exposeFormSettings(data);
      injectTracking(data);
      refreshRevealObserver();
    })
    .catch((error) => {
      console.warn("Using static fallback content.", error);
    });
})();
