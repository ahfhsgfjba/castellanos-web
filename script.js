const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");

navToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

mainNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const settings = window.CASTELLANOS_SITE_CONTENT?.forms || {};
    const status = form.querySelector(".form-status");
    const formData = new FormData(form);
    const payload = Object.fromEntries(
      Array.from(formData.entries()).filter(([, value]) => typeof value === "string")
    );

    if (form.dataset.netlify === "true") {
      if (status) status.textContent = "Sending your request...";
      fetch("/.netlify/functions/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
      fetch("/", {
        method: "POST",
        body: formData
      })
        .then((response) => {
          if (!response.ok) throw new Error("Netlify form request failed");
          if (status) status.textContent = settings.successMessage || "Thank you. Your request was sent.";
          form.reset();
        })
        .catch(() => {
          if (status) status.textContent = settings.errorMessage || "Something went wrong. Please call us directly.";
        });
      return;
    }

    if (settings.webhookUrl) {
      fetch(settings.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then((response) => {
          if (!response.ok) throw new Error("Webhook request failed");
          alert(settings.successMessage || "Thank you. Your request was sent.");
          form.reset();
        })
        .catch(() => {
          alert(settings.errorMessage || "Something went wrong. Please call us directly.");
        });
      return;
    }

    const recipient = settings.recipientEmail || "contact@homeremodelingservicestx.com";
    const subject = encodeURIComponent("Quote request from website");
    const body = encodeURIComponent(
      Array.from(formData.entries())
        .filter(([, value]) => typeof value === "string" && value.trim())
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  });
});

document.querySelectorAll("[data-slider]").forEach((slider) => {
  const input = slider.querySelector("input");
  const after = slider.querySelector(".ba-after");
  const setCompare = () => {
    const value = Number(input?.value || 50);
    after.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    after.style.setProperty("--compare-pos", `${value}%`);
    slider.style.setProperty("--compare-pos", `${value}%`);
  };
  input?.addEventListener("input", () => {
    setCompare();
  });
  setCompare();
});

const lightbox = document.querySelector("#lightbox");
const lightboxImage = lightbox?.querySelector("img");

document.querySelectorAll("[data-lightbox]").forEach((button) => {
  button.addEventListener("click", () => {
    lightboxImage.src = button.dataset.lightbox;
    lightboxImage.alt = button.querySelector("img")?.alt || "Remodeling project image";
    lightbox.showModal();
  });
});

lightbox?.querySelector("button")?.addEventListener("click", () => lightbox.close());
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));

document.querySelectorAll(".why-image-panel video").forEach((video) => {
  video.muted = true;
  video.loop = true;
  video.controls = false;
  video.playsInline = true;
  const play = () => video.play().catch(() => {});
  video.addEventListener("pause", play);
  play();
});

document.querySelector("#year").textContent = new Date().getFullYear();

/* ============================================================
   PREMIUM UPGRADE v2
   ============================================================ */

// -- Header: scroll state --
(function () {
  const hdr = document.querySelector(".site-header");
  if (!hdr) return;
  const sync = () => hdr.classList.toggle("is-scrolled", window.scrollY > 72);
  window.addEventListener("scroll", sync, { passive: true });
  sync();
})();

// -- Project carousel engine --
function initSingleCarousel(carousel) {
  if (carousel.dataset.carouselInit) return;
  carousel.dataset.carouselInit = "1";

  const track = carousel.querySelector(".proj-track");
  const slides = carousel.querySelectorAll(".proj-slide");
  const dots   = carousel.querySelectorAll(".proj-dot");
  const prev   = carousel.querySelector(".proj-prev");
  const next   = carousel.querySelector(".proj-next");
  const total  = slides.length;
  let current  = 0;
  let timer    = null;
  let touchX   = 0;

  if (!track || total < 2) {
    prev?.remove();
    next?.remove();
    return;
  }

  function go(idx) {
    current = ((idx % total) + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }

  const play  = () => { clearInterval(timer); timer = setInterval(() => go(current + 1), 4600); };
  const pause = () => clearInterval(timer);

  prev?.addEventListener("click", () => { pause(); go(current - 1); play(); });
  next?.addEventListener("click", () => { pause(); go(current + 1); play(); });
  dots.forEach((d, i) => d.addEventListener("click", () => { pause(); go(i); play(); }));

  // Touch swipe
  const wrap = carousel.querySelector(".proj-track-wrap");
  if (wrap) {
    wrap.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener("touchend",   (e) => {
      const diff = touchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 42) { pause(); go(current + (diff > 0 ? 1 : -1)); play(); }
    }, { passive: true });
  }

  // Autoplay only when visible
  new IntersectionObserver((entries) => {
    entries.forEach((en) => en.isIntersecting ? play() : pause());
  }, { threshold: 0.25 }).observe(carousel);
}

document.querySelectorAll("[data-project-carousel]").forEach(initSingleCarousel);

// -- Gallery tabs --
document.querySelectorAll(".proj-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const id = tab.dataset.tab;
    document.querySelectorAll(".proj-tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".proj-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    const panel = document.getElementById("tab-" + id);
    if (panel) {
      panel.classList.add("active");
      panel.querySelectorAll("[data-project-carousel]").forEach(initSingleCarousel);
    }
  });
});

// -- Sticky mobile CTA --
(function () {
  const cta     = document.querySelector(".sticky-cta");
  const hdr     = document.querySelector(".site-header");
  const contact = document.getElementById("contact");
  if (!cta) return;
  const sync = () => {
    const scrolled  = window.scrollY > 420;
    const isMobile  = window.matchMedia("(max-width: 840px)").matches;
    let   nearForm  = false;
    if (contact) {
      const r = contact.getBoundingClientRect();
      nearForm = r.top < window.innerHeight * 1.1 && r.bottom > -60;
    }
    const showQuickActions = scrolled && !nearForm;
    cta.classList.toggle("show", showQuickActions);
    hdr?.classList.toggle("is-hidden-mobile", isMobile && showQuickActions);
    if (isMobile && showQuickActions) {
      mainNav?.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
    }
  };
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();
})();

// -- 3D magnetic tilt on cards --
(function () {
  const isMobile = () => window.matchMedia("(max-width: 840px)").matches;

  document.querySelectorAll(".mini-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      if (isMobile()) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${x * 14}deg) rotateX(${-y * 10}deg) translateY(-9px) scale(1.02)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transition = "transform .55s cubic-bezier(.34,1.42,.64,1)";
      card.style.transform  = "";
      setTimeout(() => { card.style.transition = ""; }, 560);
    });
  });

  document.querySelectorAll(".service-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      if (isMobile()) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 5}deg) translateY(-10px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transition = "transform .5s cubic-bezier(.34,1.42,.64,1)";
      card.style.transform  = "";
      setTimeout(() => { card.style.transition = ""; }, 510);
    });
  });
})();

// -- Stats counter animation --
(function () {
  const els = document.querySelectorAll(".stats strong");
  if (!els.length) return;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const animCount = el => {
    const text = el.childNodes[0]?.textContent?.trim() || "";
    const match = text.match(/^(\d+)(\+?)$/);
    if (!match) return;
    const target = parseInt(match[1], 10);
    const suffix = match[2] || "";
    const span   = el.querySelector("span");
    const dur    = 1600;
    const start  = performance.now();
    const step   = now => {
      const p = Math.min((now - start) / dur, 1);
      el.childNodes[0].textContent = Math.round(easeOut(p) * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.childNodes[0].textContent = target + suffix;
    };
    requestAnimationFrame(step);
    // Restore span after animation
    if (span) el.appendChild(span);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animCount(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
})();
