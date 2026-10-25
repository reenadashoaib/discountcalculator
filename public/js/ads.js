// Ad slots. Everything you need to change is in AD_CONFIG below.
//
// Each slot on the page is a <div class="ad" data-ad="NAME">. For each NAME
// you can give one of:
//   { adsense: "1234567890" }                       an AdSense ad unit ID
//   { image: "ads/banner.jpg", href: "https://…" }  an ad you sold directly
//   {}                                              empty: shows "Ad space" or nothing
//
// The AdSense publisher ID is read from the
// <meta name="google-adsense-account"> tag in each page's <head>.
const AD_CONFIG = {
  // true: unsold slots show an "Ad space" box (useful while selling space).
  // false: unsold slots are hidden.
  showPlaceholders: true,

  slots: {
    "top-banner": {},
    "rail-left": {},
    "rail-right": {},
    "tile-1": {},
    "tile-2": {},
    "tile-3": {},
    "in-content": {},
    "tile-4": {},
    "tile-5": {},
    "tile-6": {},
    "bottom-banner": {},
  },

  // Bottom-right video. Direct-sold only: AdSense does not serve
  // video into custom boxes like this one.
  video: {
    enabled: true,
    src: "", // e.g. "ads/sponsor.mp4"
    poster: "",
    href: "", // where a click on the video goes
    delaySeconds: 4,
  },

  // Full-screen popup. Direct-sold only: AdSense does not allow its ads in
  // pop-ups. For AdSense full-screen ads, turn on "Vignette ads" in AdSense.
  popup: {
    enabled: true,
    image: "", // e.g. "ads/popup.jpg"
    href: "",
    alt: "",
    delaySeconds: 20,
    hoursBetween: 24, // show at most once per visitor in this many hours
  },
};

(function () {
  "use strict";

  const meta = document.querySelector('meta[name="google-adsense-account"]');
  const client = meta && /^ca-pub-\d{10,20}$/.test(meta.content) ? meta.content : null;
  let adsenseLoaded = false;

  function loadAdSense() {
    if (adsenseLoaded || !client) return;
    adsenseLoaded = true;
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + client;
    document.head.appendChild(s);
  }

  function placeholder(size, note) {
    const box = document.createElement("div");
    box.className = "ad-placeholder";
    box.innerHTML = `<strong>Ad space</strong><span>${size || ""}</span>` + (note ? `<span>${note}</span>` : "");
    return box;
  }

  function sponsoredLink(href, child) {
    if (!href) return child;
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "sponsored noopener";
    a.appendChild(child);
    return a;
  }

  // Builds the inside of a slot. Returns null when the slot should stay hidden.
  function creative(cfg, size) {
    if (cfg.image) {
      const img = document.createElement("img");
      img.src = cfg.image;
      img.alt = cfg.alt || "Advertisement";
      img.loading = "lazy";
      return sponsoredLink(cfg.href, img);
    }
    if (cfg.adsense && client) {
      loadAdSense();
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.style.width = "100%";
      ins.style.height = "100%";
      ins.dataset.adClient = client;
      ins.dataset.adSlot = cfg.adsense;
      return ins;
    }
    return AD_CONFIG.showPlaceholders ? placeholder(size) : null;
  }

  function renderSlots() {
    document.querySelectorAll(".ad[data-ad]").forEach((slot) => {
      const cfg = AD_CONFIG.slots[slot.dataset.ad] || {};
      const content = creative(cfg, slot.dataset.size);
      if (!content) {
        slot.hidden = true;
        return;
      }
      const label = document.createElement("span");
      label.className = "ad-label";
      label.textContent = "Advertisement";
      const box = document.createElement("div");
      box.className = "ad-box";
      box.appendChild(content);
      slot.replaceChildren(label, box);
      if (content.tagName === "INS") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    });
  }

  const storage = {
    get(area, key) {
      try {
        return window[area].getItem(key);
      } catch (e) {
        return null;
      }
    },
    set(area, key, value) {
      try {
        window[area].setItem(key, value);
      } catch (e) {
        /* storage blocked */
      }
    },
  };

  function setupVideo() {
    const cfg = AD_CONFIG.video;
    const wrap = document.getElementById("video-ad");
    if (!wrap || !cfg.enabled) return;
    if (!cfg.src && !AD_CONFIG.showPlaceholders) return;
    if (storage.get("sessionStorage", "dc-video-closed")) return;

    const box = document.getElementById("video-ad-box");
    if (cfg.src) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const video = document.createElement("video");
      video.src = cfg.src;
      if (cfg.poster) video.poster = cfg.poster;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.autoplay = !reduceMotion;
      video.controls = reduceMotion;
      box.appendChild(sponsoredLink(cfg.href, video));
    } else {
      box.appendChild(placeholder("Video 16:9"));
    }

    document.getElementById("video-ad-close").addEventListener("click", () => {
      wrap.hidden = true;
      const video = wrap.querySelector("video");
      if (video) video.pause();
      storage.set("sessionStorage", "dc-video-closed", "1");
    });

    setTimeout(() => (wrap.hidden = false), cfg.delaySeconds * 1000);
  }

  function setupPopup() {
    const cfg = AD_CONFIG.popup;
    const dialog = document.getElementById("popup-ad");
    if (!dialog || !cfg.enabled || typeof dialog.showModal !== "function") return;
    if (!cfg.image && !AD_CONFIG.showPlaceholders) return;

    const last = Number(storage.get("localStorage", "dc-popup-shown")) || 0;
    if (Date.now() - last < cfg.hoursBetween * 3600 * 1000) return;

    const box = document.getElementById("popup-ad-box");
    if (cfg.image) {
      const img = document.createElement("img");
      img.src = cfg.image;
      img.alt = cfg.alt || "Advertisement";
      box.appendChild(sponsoredLink(cfg.href, img));
    } else {
      box.appendChild(placeholder("Full-screen popup", "Shows once a day per visitor"));
    }

    const close = () => dialog.close();
    document.getElementById("popup-ad-close").addEventListener("click", close);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close(); // click outside the ad
    });

    setTimeout(() => {
      // Don't interrupt someone who is typing in the calculator.
      const active = document.activeElement;
      const typing = active && (active.tagName === "INPUT" || active.tagName === "SELECT");
      const show = () => {
        dialog.showModal();
        document.getElementById("popup-ad-close").focus();
        storage.set("localStorage", "dc-popup-shown", String(Date.now()));
      };
      if (typing) active.addEventListener("blur", show, { once: true });
      else show();
    }, cfg.delaySeconds * 1000);
  }

  renderSlots();
  setupVideo();
  setupPopup();
})();
