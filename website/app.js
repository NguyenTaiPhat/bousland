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
   1. Live Dynamic Island Simulator (BousLand v1.0.7 Accurate Implementation)
   ========================================================================== */
function initSimulator() {
  const simIsland = document.getElementById("simIsland");
  const mockScreen = document.getElementById("mockScreen");
  const simButtons = document.querySelectorAll(".sim-btn");
  const dockButtons = document.querySelectorAll(".sim-dock-btn");
  const views = {
    compact: document.getElementById("simViewCompact"),
    media: document.getElementById("simViewMedia"),
    volume: document.getElementById("simViewVolume"),
    battery: document.getElementById("simViewBattery"),
    alert: document.getElementById("simViewAlert"),
    control: document.getElementById("simViewControl"),
  };

  let currentState = "compact";
  let currentDock = "notch"; // "notch" | "float"
  let morphTimer = null;

  // Real-time Clock for Control Center
  const simCcClock = document.getElementById("simCcClock");
  if (simCcClock) {
    const updateTime = () => {
      const now = new Date();
      simCcClock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

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

  function applyDockStyles() {
    if (!simIsland) return;
    if (currentDock === "notch") {
      simIsland.classList.remove("dock-float");
      simIsland.classList.add("dock-notch");
    } else {
      simIsland.classList.remove("dock-notch");
      simIsland.classList.add("dock-float");
    }
  }

  function switchState(action) {
    currentState = action;
    Object.values(views).forEach((v) => v && v.classList.remove("active"));
    triggerMorphing();
    applyDockStyles();

    // Sync active button
    simButtons.forEach((btn) => {
      if (btn.getAttribute("data-action") === action) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    switch (action) {
      case "compact":
        simIsland.style.width = "280px";
        simIsland.style.height = "44px";
        simIsland.style.borderColor = "rgba(255, 255, 255, 0.16)";
        simIsland.style.boxShadow = "var(--shadow-island)";
        if (views.compact) views.compact.classList.add("active");
        break;

      case "media":
        simIsland.style.width = "380px";
        simIsland.style.height = "88px";
        simIsland.style.borderColor = "rgba(167, 139, 250, 0.4)";
        simIsland.style.boxShadow = "0 14px 36px rgba(167, 139, 250, 0.4), 0 0 24px rgba(56, 189, 248, 0.25)";
        if (views.media) views.media.classList.add("active");
        break;

      case "volume":
        simIsland.style.width = "380px";
        simIsland.style.height = "72px";
        simIsland.style.borderColor = "rgba(56, 189, 248, 0.35)";
        simIsland.style.boxShadow = "0 10px 30px rgba(56, 189, 248, 0.35)";
        if (views.volume) views.volume.classList.add("active");
        break;

      case "battery":
        simIsland.style.width = "360px";
        simIsland.style.height = "72px";
        simIsland.style.borderColor = "rgba(52, 199, 89, 0.5)";
        simIsland.style.boxShadow = "0 10px 30px rgba(52, 199, 89, 0.45)";
        if (views.battery) views.battery.classList.add("active");
        break;

      case "alert":
        simIsland.style.width = "360px";
        simIsland.style.height = "72px";
        simIsland.style.borderColor = "rgba(255, 69, 58, 0.6)";
        simIsland.style.boxShadow = "0 10px 30px rgba(255, 69, 58, 0.45)";
        if (views.alert) views.alert.classList.add("active");
        break;

      case "control":
        simIsland.style.width = "380px";
        simIsland.style.height = "240px";
        simIsland.style.borderColor = "rgba(255, 255, 255, 0.22)";
        simIsland.style.boxShadow = "0 18px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(167, 139, 250, 0.2)";
        if (views.control) views.control.classList.add("active");
        break;
    }
  }

  // Toggle Control Center on Island Click
  if (simIsland) {
    simIsland.addEventListener("click", (e) => {
      // Ignore if clicking volume slider or media controls
      if (e.target.closest(".sim-vol-track") || e.target.closest(".sim-ctrl-btn") || e.target.closest(".sim-action-pill")) {
        return;
      }
      if (currentState === "compact") {
        switchState("control");
      } else if (currentState === "control") {
        switchState("compact");
      }
    });
  }

  // Simulator Buttons
  simButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      switchState(action);
    });
  });

  // Dock Mode Segmented Control
  dockButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      dockButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentDock = btn.getAttribute("data-dock");
      applyDockStyles();
      triggerMorphing();
    });
  });

  // Init Interactive Media Player & Liquid Aurora Engine
  initMediaVisualizer();

  // Init Jelly Physics Drag Simulation
  initJellyDragSimulation(simIsland, mockScreen);
}

/* ==========================================================================
   2. Liquid Aurora Waveform & Media Controls Engine
   ========================================================================== */
function initMediaVisualizer() {
  const canvas = document.getElementById("simAuroraCanvas");
  const playBtn = document.getElementById("simBtnPlay");
  const playIcon = document.getElementById("simPlayPauseIcon");
  const prevBtn = document.getElementById("simBtnPrev");
  const nextBtn = document.getElementById("simBtnNext");
  const titleEl = document.getElementById("simSongTitle");
  const artistEl = document.getElementById("simSongArtist");

  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let isPlaying = true;
  let phase = 0;
  let animId = null;

  const playlist = [
    { title: "Starboy", artist: "The Weeknd • Spotify" },
    { title: "Blinding Lights", artist: "The Weeknd • Spotify" },
    { title: "Save Your Tears", artist: "The Weeknd • Spotify" },
    { title: "Die For You", artist: "The Weeknd • Spotify" },
  ];
  let songIndex = 0;

  function updateSong(idx) {
    songIndex = (idx + playlist.length) % playlist.length;
    if (titleEl) titleEl.textContent = playlist[songIndex].title;
    if (artistEl) artistEl.textContent = playlist[songIndex].artist;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      updateSong(songIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      updateSong(songIndex + 1);
    });
  }

  if (playBtn && playIcon) {
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      isPlaying = !isPlaying;
      if (isPlaying) {
        playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>';
        playBtn.title = "Tạm dừng";
        render();
      } else {
        playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        playBtn.title = "Phát tiếp";
        cancelAnimationFrame(animId);
        // Draw flat line
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = "rgba(167, 139, 250, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  }

  function render() {
    if (!isPlaying) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    phase += 0.08;

    const w = canvas.width;
    const h = canvas.height;
    const midY = h / 2;

    ctx.beginPath();
    ctx.moveTo(0, midY);

    for (let x = 0; x <= w; x += 2) {
      // Continuous sinusoidal bezier wave with envelope dampening at edges
      const envelope = Math.sin((x / w) * Math.PI);
      const y = midY + Math.sin(x * 0.22 + phase) * 4.5 * envelope;
      ctx.lineTo(x, y);
    }

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#38BDF8");
    grad.addColorStop(0.5, "#A78BFA");
    grad.addColorStop(1, "#C084FC");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.stroke();

    animId = requestAnimationFrame(render);
  }

  render();
}

/* ==========================================================================
   3. Interactive Volume Slider (2-Row Layout)
   ========================================================================== */
function initVolumeInteractive() {
  const volTrack = document.getElementById("simVolTrack");
  const volFill = document.getElementById("simVolFill");
  const volText = document.getElementById("simVolText");
  const volIcon = document.getElementById("simVolIcon");
  if (!volTrack || !volFill || !volText) return;

  let isDragging = false;

  function updateVolume(e) {
    const rect = volTrack.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, Math.round((offsetX / rect.width) * 100)));
    volFill.style.width = `${percent}%`;
    volText.textContent = `${percent}%`;

    // Update Volume Icon accordingly
    if (volIcon) {
      if (percent === 0) {
        volIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';
      } else if (percent < 40) {
        volIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
      } else {
        volIcon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
      }
    }
  }

  volTrack.addEventListener("mousedown", (e) => {
    e.stopPropagation();
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
   4. Jelly Drag Physics Simulation (v1.0.7 Time-Delta Squish & Stretch)
   ========================================================================== */
function initJellyDragSimulation(island, container) {
  if (!island || !container) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastTime = 0;

  island.addEventListener("mousedown", (e) => {
    // Only drag with left click and if not clicking a button/slider
    if (e.button !== 0 || e.target.closest("button") || e.target.closest(".sim-vol-track")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastTime = performance.now();
    island.style.transition = "none";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastTime);
    const dx = e.clientX - lastX;
    const totalDx = (e.clientX - startX) * 0.4;
    const totalDy = Math.max(0, (e.clientY - startY) * 0.35);

    // Normalized velocity calculation
    const vx = Math.abs((dx / dt) * 16.67);
    const squishFactor = Math.min(0.08, (vx / 45) * 0.08);

    const scaleX = 1 + squishFactor;
    const scaleY = 1 - squishFactor * 0.7;

    island.style.transform = `translate(${totalDx}px, ${totalDy}px) scale(${scaleX}, ${scaleY})`;

    lastX = e.clientX;
    lastTime = now;
  });

  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    // Spring overshoot bounce recovery
    island.style.transition = "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)";
    island.style.transform = "translate(0px, 0px) scale(1, 1)";
    setTimeout(() => {
      island.style.transition = "";
    }, 450);
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

