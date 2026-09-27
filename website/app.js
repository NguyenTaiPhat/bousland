/**
 * BousLand Landing Page Script
 * Pure Minimalist Interaction: Island Simulator, Interactive Volume Slider, Tabs, FAQ
 */

document.addEventListener("DOMContentLoaded", () => {
  initSimulator();
  initVolumeInteractive();
  initScrollReveal();
  initShowcaseTabs();
  initFaqAccordion();
  initDynamicReleaseLinks();
});

/* ==========================================================================
   1. Live Dynamic Island Simulator
   ========================================================================== */
function initSimulator() {
  const simIsland = document.getElementById("simIsland");
  const simButtons = document.querySelectorAll(".sim-btn");
  const views = {
    compact: document.getElementById("simViewCompact"),
    media: document.getElementById("simViewMedia"),
    volume: document.getElementById("simViewVolume"),
    alert: document.getElementById("simViewAlert"),
  };

  const simBatBadge = document.getElementById("simBatBadge");
  const simVolFill = document.getElementById("simVolFill");
  const simVolText = document.getElementById("simVolText");

  let morphTimer = null;
  function triggerMorphing() {
    if (!simIsland) return;
    simIsland.classList.remove("morphing");
    void simIsland.offsetWidth;
    simIsland.classList.add("morphing");
    clearTimeout(morphTimer);
    morphTimer = setTimeout(() => {
      simIsland.classList.remove("morphing");
    }, 360);
  }

  function switchState(action) {
    Object.values(views).forEach((v) => v && v.classList.remove("active"));
    triggerMorphing();

    switch (action) {
      case "compact":
        simIsland.style.width = "300px";
        simIsland.style.height = "44px";
        simIsland.style.borderColor = "rgba(255, 255, 255, 0.16)";
        simIsland.style.boxShadow = "";
        views.compact.classList.add("active");
        break;

      case "media":
        simIsland.style.width = "380px";
        simIsland.style.height = "84px";
        simIsland.style.borderColor = "rgba(255, 255, 255, 0.25)";
        simIsland.style.boxShadow = "0 10px 30px rgba(167, 139, 250, 0.45), 0 0 20px rgba(56, 189, 248, 0.35)";
        views.media.classList.add("active");
        break;

      case "volume":
        simIsland.style.width = "370px";
        simIsland.style.height = "52px";
        simIsland.style.borderColor = "rgba(255, 255, 255, 0.25)";
        simIsland.style.boxShadow = "";
        if (simVolFill && simVolText) {
          simVolFill.style.width = "75%";
          simVolText.textContent = "75%";
        }
        views.volume.classList.add("active");
        break;

      case "alert":
        simIsland.style.width = "360px";
        simIsland.style.height = "64px";
        simIsland.style.borderColor = "rgba(255, 69, 58, 0.6)";
        simIsland.style.boxShadow = "0 8px 24px rgba(255, 69, 58, 0.45)";
        views.alert.classList.add("active");
        break;

      case "battery":
        simIsland.style.width = "365px";
        simIsland.style.height = "44px";
        simIsland.style.borderColor = "rgba(52, 199, 89, 0.7)";
        simIsland.style.boxShadow = "0 8px 24px rgba(52, 199, 89, 0.5)";
        views.compact.classList.add("active");
        if (simBatBadge) {
          simBatBadge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:middle;margin-right:3px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>100% Đang sạc';
          simBatBadge.style.background = "rgba(52, 199, 89, 0.3)";
          setTimeout(() => {
            simBatBadge.innerHTML = "95%";
            simBatBadge.style.background = "rgba(52, 199, 89, 0.25)";
            if (views.compact.classList.contains("active")) {
              simIsland.style.width = "300px";
              simIsland.style.borderColor = "rgba(255, 255, 255, 0.16)";
              simIsland.style.boxShadow = "";
              triggerMorphing();
            }
          }, 3500);
        }
        break;
    }
  }

  simButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      simButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const action = btn.getAttribute("data-action");
      switchState(action);
    });
  });
}

/* ==========================================================================
   2. Interactive Volume Slider
   ========================================================================== */
function initVolumeInteractive() {
  const volTrack = document.querySelector("#simViewVolume .sim-vol-track");
  const volFill = document.getElementById("simVolFill");
  const volText = document.getElementById("simVolText");
  if (!volTrack || !volFill || !volText) return;

  let isDragging = false;

  function updateVolume(e) {
    const rect = volTrack.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, Math.round((offsetX / rect.width) * 100)));
    volFill.style.width = `${percent}%`;
    volText.textContent = `${percent}%`;
  }

  volTrack.addEventListener("mousedown", (e) => {
    isDragging = true;
    updateVolume(e);
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    updateVolume(e);
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) isDragging = false;
  });
}

/* ==========================================================================
   3. Scroll Reveal Animations (IntersectionObserver)
   ========================================================================== */
function initScrollReveal() {
  const reveals = document.querySelectorAll(".reveal");
  if (!reveals.length) return;

  if (!("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
  );

  reveals.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   4. Showcase Gallery Tabs
   ========================================================================== */
function initShowcaseTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".showcase-panel");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanels.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });
}

/* ==========================================================================
   5. FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");
      faqItems.forEach((other) => other.classList.remove("active"));
      if (!isActive) {
        item.classList.add("active");
      }
    });
  });
}

/* ==========================================================================
   6. Dynamic GitHub Release Links (Zero 404 Guard)
   ========================================================================== */
function initDynamicReleaseLinks() {
  fetch("https://api.github.com/repos/NguyenTaiPhat/bousland/releases")
    .then((res) => {
      if (!res.ok) return null;
      return res.json();
    })
    .then((releases) => {
      if (!Array.isArray(releases) || releases.length === 0) return;
      for (const rel of releases) {
        if (!rel.assets || rel.assets.length === 0) continue;
        const msiAsset = rel.assets.find((a) => a.name && a.name.endsWith(".msi"));
        if (msiAsset && msiAsset.browser_download_url) {
          const downloadBtns = document.querySelectorAll("a[href*='.msi']");
          downloadBtns.forEach((btn) => {
            btn.setAttribute("href", msiAsset.browser_download_url);
          });
          break;
        }
      }
    })
    .catch(() => {
      // Fallback silently to HTML static link
    });
}

