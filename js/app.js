/* Sri Lanka Canyon 2027 — interactions, cartes et animations */
(() => {
  const D = window.EXPE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const fmt = (n) => Math.round(n).toLocaleString("fr-FR");
  const prioColor = (p) => D.priorities[p].color;
  const byN = Object.fromEntries(D.objectives.map((o) => [o.n, o]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);

  /* ---------------- smooth scroll ---------------- */
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: !reduce });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  // Depuis l'accueil, on passe toujours par la plongée sur l'Uva avant d'aller à la section visée
  const heroEnd = () => { const hs = $(".hero-scroll"); return hs.offsetTop + hs.offsetHeight - innerHeight; };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function dive(target) {
    const end = heroEnd();
    const next = () => target && setTimeout(() => lenis.scrollTo(target, { duration: 1.6 }), 500);
    if (scrollY < end - 20) lenis.scrollTo(end, { duration: reduce ? 0.01 : 5, easing: easeInOut, lock: true, onComplete: next });
    else next();
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const target = a.getAttribute("href");
    if (target.length < 2) return;
    e.preventDefault();
    if (a.closest(".hero-content")) return dive(target);
    lenis.scrollTo(target === "#top" ? 0 : target, { duration: 1.6 });
  }));
  $(".scroll-cue").addEventListener("click", () => dive());

  /* ---------------- nav + progress ---------------- */
  const nav = $(".topnav");
  ScrollTrigger.create({ start: 80, onUpdate: (s) => nav.classList.toggle("scrolled", s.scroll() > 80) });
  gsap.to(".scroll-progress span", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  $$(".nav-links a").forEach((a) => {
    const sec = $(a.getAttribute("href"));
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (s) => a.classList.toggle("active", s.isActive) });
  });

  /* ---------------- map style ---------------- */
  const mapStyle = ({ globe = false, terrain = true } = {}) => ({
    version: 8,
    projection: { type: globe ? "globe" : "mercator" },
    sources: {
      sat: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 18,
        attribution: "Imagerie © Esri, Maxar, Earthstar Geographics" },
      dem: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 14,
        attribution: "Relief AWS Terrain Tiles" },
      demShade: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 14 },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#05090a" } },
      { id: "sat", type: "raster", source: "sat", paint: { "raster-saturation": -0.12, "raster-contrast": 0.08, "raster-brightness-max": 0.92 } },
      { id: "shade", type: "hillshade", source: "demShade", minzoom: 7, paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#000", "hillshade-highlight-color": "#fff", "hillshade-accent-color": "#000" } },
    ],
    ...(terrain ? { terrain: { source: "dem", exaggeration: 1.5 } } : {}),
    sky: {
      "sky-color": "#0b1d2a", "horizon-color": "#2c4a5a", "fog-color": "#0b1418", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.4,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 8, 0],
    },
  });

  /* ---------------- HERO : globe → Uva ---------------- */
  const UVA = [81.0, 6.92];
  const hero = { map: null, spin: 40, p: 0 };
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const heroKeys = () => [
    { t: 0, c: [hero.spin, 12], z: 1.45, p: 0, b: 0 },
    { t: 0.5, c: [80.75, 7.6], z: 6.2, p: 25, b: 0 },
    { t: 1, c: UVA, z: 9.7, p: 66, b: -28 },
  ];
  function heroCamera(p) {
    const k = heroKeys();
    const i = p < k[1].t ? 0 : 1;
    const a = k[i], b = k[i + 1];
    const t = ease(Math.min(1, Math.max(0, (p - a.t) / (b.t - a.t))));
    // au départ, le globe est décalé (à droite sur grand écran, en bas sur mobile) pour laisser lire le titre
    const off = Math.max(0, 1 - p / 0.45), wide = innerWidth > 900;
    return { center: [lerp(a.c[0], b.c[0], t), lerp(a.c[1], b.c[1], t)], zoom: lerp(a.z, b.z, t), pitch: lerp(a.p, b.p, t), bearing: lerp(a.b, b.b, t),
      padding: { left: wide ? innerWidth * 0.42 * off : 0, top: wide ? 0 : innerHeight * 0.75 * off, right: 0, bottom: 0 } };
  }
  function updateHud() {
    if (!hero.map) return;
    const c = hero.map.getCenter(), z = hero.map.getZoom();
    const mpp = (156543.03 * Math.cos((c.lat * Math.PI) / 180)) / Math.pow(2, z) / 2;
    const alt = mpp * window.innerHeight * 1.5;
    $("#hud-lat").textContent = `${Math.abs(c.lat).toFixed(3)}° ${c.lat >= 0 ? "N" : "S"}`;
    $("#hud-lon").textContent = `${Math.abs(c.lng).toFixed(3)}° ${c.lng >= 0 ? "E" : "O"}`;
    $("#hud-alt").textContent = alt > 10000 ? `${fmt(alt / 1000)} km` : `${fmt(alt)} m`;
  }
  function initHero() {
    hero.map = new maplibregl.Map({
      container: "hero-map", style: mapStyle({ globe: true }), interactive: false, attributionControl: false,
      center: [hero.spin, 12], zoom: 1.45, maxPitch: 80, fadeDuration: 0,
    });
    hero.map.on("load", () => {
      const el = h('<div class="hero-globe-marker"></div>');
      new maplibregl.Marker({ element: el }).setLngLat(UVA).addTo(hero.map);
      gsap.from("#hero-map", { opacity: 0, scale: 1.08, duration: 2.4, ease: "power2.out" });
    });
    const spin = () => {
      if (hero.p < 0.002 && !reduce) {
        hero.spin += 0.035;
        if (hero.spin > 80.75 + 180) hero.spin -= 360;
        hero.map.jumpTo(heroCamera(0));
        updateHud();
      }
      requestAnimationFrame(spin);
    };
    requestAnimationFrame(spin);
    // keep spin longitude within ±180° of the destination so the dive takes the short way
    hero.spin = 15;
    ScrollTrigger.create({
      trigger: ".hero-scroll", start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (s) => { hero.p = s.progress; hero.map.jumpTo(heroCamera(s.progress)); updateHud(); },
    });
    gsap.timeline({ scrollTrigger: { trigger: ".hero-scroll", start: "top top", end: "30% top", scrub: true } })
      .to(".hero-content", { y: -120, opacity: 0, ease: "none" })
      .to(".scroll-cue", { opacity: 0, ease: "none" }, 0);
    gsap.timeline({ scrollTrigger: { trigger: ".hero-scroll", start: "62% top", end: "88% top", scrub: true } })
      .fromTo(".hero-land", { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: "none" });
  }

  function heroIntro() {
    gsap.timeline({ delay: 0.2 })
      .from(".eyebrow", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out" })
      .from(".ht-line > *", { yPercent: 110, rotate: 3, duration: 1.3, stagger: 0.14, ease: "expo.out" }, "-=0.4")
      .from([".hero-sub", ".hero-team"], { y: 24, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" }, "-=0.7")
      .from(".hero-cta .btn", { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }, "-=0.6")
      .from([".hero-hud", ".scroll-cue"], { opacity: 0, duration: 1 }, "-=0.4");
  }

  /* ---------------- generic reveals ---------------- */
  function reveals() {
    $$(".reveal-title").forEach((t) => {
      const s = new SplitText(t, { type: "lines", linesClass: "line", mask: "lines" });
      gsap.from(s.lines, { yPercent: 105, duration: 1.1, stagger: 0.09, ease: "expo.out", scrollTrigger: { trigger: t, start: "top 85%" } });
    });
    $$(".reveal").forEach((el) => gsap.from(el, { y: 36, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } }));
    $$("[data-count]").forEach((el) => {
      const end = +el.dataset.count, suf = el.dataset.suffix || "";
      const o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true,
        onEnter: () => gsap.to(o, { v: end, duration: end > 100 ? 2.2 : 1.4, ease: "power2.out", onUpdate: () => (el.textContent = fmt(o.v) + suf) }) });
    });
    [[".why-bg", ".why"], [".quote-bg", ".quote-band"], [".support-bg", ".support"]].forEach(([bg, tr]) =>
      gsap.fromTo(bg, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: tr, start: "top bottom", end: "bottom top", scrub: true } }));
    gsap.from(".stat", { y: 40, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: ".stats", start: "top 85%" } });
    gsap.from(".why-list li", { x: -30, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".why-list", start: "top 85%" } });
    gsap.from(".big-quote", { y: 40, opacity: 0, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: ".big-quote", start: "top 80%" } });
  }

  /* ---------------- goals ---------------- */
  function renderGoals() {
    const g = $("#goals");
    D.goals.forEach(([k, v], i) => g.append(h(`<div class="goal"><span class="goal-i">0${i + 1}</span><b>${k}</b><p>${v}</p></div>`)));
    gsap.from(".goal", { y: 50, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: g, start: "top 85%" } });
  }

  /* ---------------- rain shadow + rainfall ---------------- */
  function rainShadow() {
    const svg = $("#rain-shadow svg");
    const storm = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const cloud = $("#rs-cloud"), rain = $("#rs-rain");
    svg.insertBefore(storm, cloud);
    storm.append(cloud, rain);
    cloud.setAttribute("transform", "translate(0 70)");
    for (let i = 0; i < 16; i++) {
      const x = -40 + Math.random() * 80, y = 90 + Math.random() * 10;
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      Object.entries({ x1: x, y1: y, x2: x - 4, y2: y + 10 }).forEach(([k, v]) => l.setAttribute(k, v));
      rain.append(l);
      gsap.fromTo(l, { y: 0, opacity: 0.9 }, { y: 70 + Math.random() * 40, opacity: 0, duration: 0.7 + Math.random() * 0.5, repeat: -1, delay: Math.random(), ease: "power1.in" });
    }
    gsap.timeline({ repeat: -1 })
      .fromTo(storm, { x: -60, y: 40, opacity: 0 }, { x: 60, y: 60, opacity: 1, duration: 1.5, ease: "none" })
      .to(storm, { x: 240, y: 90, duration: 4, ease: "none" })
      .to(rain, { opacity: 0, duration: 0.8 }, "-=0.8")
      .to(storm, { x: 330, y: 70, opacity: 0, scale: 0.7, transformOrigin: "50% 50%", duration: 1.4, ease: "power1.in" })
      .set(rain, { opacity: 1 });
  }
  function rainChart() {
    const r = D.rainfall, wrap = $("#rc-bars"), max = 200;
    r.values.forEach((v, i) => {
      const hl = i === r.highlight;
      wrap.append(h(`<div class="rc-bar${hl ? " hl" : ""}">
        ${hl ? '<span class="rc-flag">Fenêtre d\'expédition</span>' : ""}
        <span class="rc-val">${v}</span>
        <div class="rc-fill" style="height:${(v / max) * 82}%"></div>
        <span class="rc-m">${r.months[i]}</span></div>`));
    });
    gsap.timeline({ scrollTrigger: { trigger: wrap, start: "top 80%" } })
      .to(".rc-fill", { scaleY: 1, duration: 1.1, stagger: 0.06, ease: "expo.out" })
      .to(".rc-val", { opacity: 1, duration: 0.4, stagger: 0.04 }, "-=0.9")
      .fromTo(".rc-flag", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(2)" }, "-=0.2");
  }

  /* ---------------- geometry helpers ---------------- */
  function hull(points) {
    const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function sectorPolygon(pts, r = 0.04) {
    const buf = [];
    pts.forEach(([x, y]) => { for (let a = 0; a < 24; a++) buf.push([x + r * Math.cos((a / 24) * 2 * Math.PI), y + r * Math.sin((a / 24) * 2 * Math.PI)]); });
    const ring = hull(buf);
    ring.push(ring[0]);
    return ring;
  }
  const bounds = (coords) => coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
  function lineLengths(coords) {
    const d = [0];
    for (let i = 1; i < coords.length; i++) d.push(d[i - 1] + Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]));
    return d.map((v) => v / d[d.length - 1]);
  }

  /* ---------------- main map ---------------- */
  const M = { map: null, markers: {}, sector: null, active: null, touring: false };
  const sectorPts = (k) => [
    ...D.objectives.filter((o) => o.sector === k).map((o) => o.coord),
    ...D.towns.filter((t) => D.sectors[k].base.includes(t.name)).map((t) => t.coord),
  ];
  // Itinéraire indicatif du mois : Ella → Haputale/Koslanda → Badulla/Passara → Walapane
  const PLAN = [[81.046, 6.874], [80.99, 6.83], [80.958, 6.768], [80.99, 6.75], [80.958, 6.768], [80.99, 6.83], [81.046, 6.874], [81.06, 6.93], [81.056, 6.989], [81.09, 6.96], [81.04, 7.02], [80.95, 7.06], [80.857, 7.093]];
  const PLAN_STOPS = [0, 3, 9, 12];
  const planFrac = lineLengths(PLAN);
  const OVERVIEW = { bounds: bounds(D.objectives.map((o) => o.coord).concat(D.towns.filter((t) => t.base).map((t) => t.coord))), pitch: 52, bearing: -12 };

  function initMap() {
    const map = (M.map = new maplibregl.Map({
      container: "map", style: mapStyle(), center: [80.98, 6.93], zoom: 8.2, pitch: 0, bearing: 0, maxPitch: 82, attributionControl: { compact: true },
      cooperativeGestures: false,
    }));
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.scrollZoom.setWheelZoomRate(1 / 300);

    map.on("load", () => {
      const sectors = Object.keys(D.sectors).map((k) => ({ type: "Feature", properties: { id: k }, geometry: { type: "Polygon", coordinates: [sectorPolygon(sectorPts(k))] } }));
      map.addSource("sectors", { type: "geojson", data: { type: "FeatureCollection", features: sectors } });
      map.addLayer({ id: "sector-fill", type: "fill", source: "sectors", paint: { "fill-color": "#ffffff", "fill-opacity": 0.05 } });
      map.addLayer({ id: "sector-line", type: "line", source: "sectors", paint: { "line-color": "#ffffff", "line-width": 1.6, "line-opacity": 0.7, "line-dasharray": [2, 2] } });
      map.addSource("train", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: D.trainLine } } });
      map.addLayer({ id: "train", type: "line", source: "train", paint: { "line-color": "#f6c177", "line-width": 2, "line-opacity": 0.8, "line-dasharray": [1, 1.5] } });
      map.addSource("plan", { type: "geojson", lineMetrics: true, data: { type: "Feature", geometry: { type: "LineString", coordinates: PLAN } } });
      map.addLayer({ id: "plan", type: "line", source: "plan", layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-width": 5, "line-blur": 0.5, "line-gradient": planGradient(0) } });

      Object.entries(D.sectors).forEach(([k, s]) => {
        const el = h(`<div><div class="mk-sector">${k}<span>${s.name}</span></div></div>`);
        new maplibregl.Marker({ element: el }).setLngLat(s.label).addTo(map);
      });
      D.towns.forEach((t) => {
        const el = h(`<div><div class="mk mk-city${t.base ? "" : " minor"}"><span class="mk-label">${t.name}</span></div></div>`);
        new maplibregl.Marker({ element: el }).setLngLat(t.coord).addTo(map);
      });
      D.objectives.forEach((o) => {
        const wrap = h(`<div><div class="mk mk-obj p${o.prio}" style="--c:${prioColor(o.prio)}">${o.n}<span class="mk-label">${o.name}</span></div></div>`);
        wrap.addEventListener("click", (e) => { e.stopPropagation(); selectObjective(o.n); });
        M.markers[o.n] = { el: wrap.firstElementChild, marker: new maplibregl.Marker({ element: wrap }).setLngLat(o.coord).addTo(map) };
      });
      D.weeks.forEach((w, i) => {
        const el = h(`<div><div class="mk-week">${w.w} · ${w.base}</div></div>`);
        w.marker = el.firstElementChild;
        new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -16] }).setLngLat(PLAN[PLAN_STOPS[i]]).addTo(map);
      });

      map.on("zoom", () => $("#map").classList.toggle("show-labels", map.getZoom() > 11.4));
      // intro : on bascule en 3D
      setTimeout(() => overview(3600), 400);
      gsap.to(".map-hint", { opacity: 0, delay: 9, duration: 1 });
    });
  }
  function planGradient(p) {
    const c = "#f6c177";
    if (p <= 0) return ["interpolate", ["linear"], ["line-progress"], 0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0)"];
    if (p >= 1) return ["interpolate", ["linear"], ["line-progress"], 0, "#4f8ef7", 0.5, "#3fd0b0", 1, c];
    return ["step", ["line-progress"], c, p, "rgba(0,0,0,0)"];
  }
  function overview(duration = 2200) {
    if (!M.map) return;
    M.map.fitBounds(OVERVIEW.bounds, { padding: { top: 120, bottom: 90, left: 70, right: 70 }, pitch: OVERVIEW.pitch, bearing: OVERVIEW.bearing, duration, essential: true });
  }
  function setDim(set) {
    D.objectives.forEach((o) => {
      const on = !set || set.has(o.n);
      M.markers[o.n]?.el.classList.toggle("dim", !on);
      $(`.obj-item[data-n="${o.n}"]`)?.classList.toggle("dim", !on);
    });
  }
  function selectSector(k) {
    M.sector = k;
    $$("#sector-filters .chip").forEach((c) => c.classList.toggle("active", c.dataset.k === (k || "all")));
    if (!M.map || !M.map.getLayer("sector-fill")) return;
    M.map.setPaintProperty("sector-fill", "fill-opacity", k ? ["case", ["==", ["get", "id"], k], 0.16, 0.02] : 0.05);
    M.map.setPaintProperty("sector-line", "line-opacity", k ? ["case", ["==", ["get", "id"], k], 1, 0.25] : 0.7);
    if (!k) { setDim(null); overview(); return; }
    setDim(new Set(D.objectives.filter((o) => o.sector === k).map((o) => o.n)));
    M.map.fitBounds(bounds(sectorPts(k)), { padding: 110, pitch: 60, bearing: { A: 20, B: -30, C: 15, D: -20 }[k], duration: 2400, maxZoom: 12.2 });
  }
  function selectObjective(n, fly = true) {
    const o = byN[n];
    M.active = n;
    Object.values(M.markers).forEach((m) => m.el.classList.remove("active"));
    M.markers[n]?.el.classList.add("active");
    $$(".obj-item").forEach((li) => li.classList.toggle("active", +li.dataset.n === n));
    const c = prioColor(o.prio);
    const det = $("#obj-detail");
    det.innerHTML = `<div class="od-card" style="--c:${c}">
      <h3>${o.n}. ${o.name}</h3>
      <p>${o.pitch}</p>
      <div class="od-kv"><div><span>Chute</span><b>${o.drop}</b></div><div><span>Altitude</span><b>${o.alt}</b></div><div><span>Secteur</span><b>${o.sector}</b></div></div>
      <button class="od-open" data-open="${o.n}">Ouvrir la fiche parcours →</button></div>`;
    gsap.fromTo(det.firstElementChild, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" });
    $(".od-open", det).addEventListener("click", () => openDrawer(o.n));
    const li = $(`.obj-item[data-n="${n}"]`);
    li?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (fly && M.map) M.map.flyTo({ center: o.coord, zoom: 13.4, pitch: 72, bearing: ((n * 47) % 120) - 60, duration: 3200, curve: 1.6, essential: true });
  }
  function renderMapPanel() {
    const f = $("#sector-filters");
    f.append(h('<button class="chip active" data-k="all">Tous</button>'));
    Object.entries(D.sectors).forEach(([k, s]) => f.append(h(`<button class="chip" data-k="${k}" title="${s.name} — ${s.june}"><b>${k}</b>${s.base}</button>`)));
    f.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (b) selectSector(b.dataset.k === "all" ? null : b.dataset.k); });
    const pl = $("#prio-legend");
    Object.values(D.priorities).forEach((p) => pl.append(h(`<span><i style="--c:${p.color}"></i>${p.label}</span>`)));
    const ul = $("#obj-list");
    D.objectives.forEach((o) => {
      const li = h(`<li class="obj-item" data-n="${o.n}" style="--c:${prioColor(o.prio)}"><span class="obj-num">${o.n}</span>
        <div><div class="obj-name">${o.name}</div><div class="obj-meta">Secteur ${o.sector} · ${o.drop} · ${o.alt}</div></div></li>`);
      li.addEventListener("click", () => selectObjective(o.n));
      ul.append(li);
    });
    $("#btn-overview").addEventListener("click", () => { stopTour(); selectSector(null); $("#obj-detail").innerHTML = ""; });
    $("#btn-plan").addEventListener("click", () => (M.touring ? stopTour() : planTour()));
  }

  /* ---------- tour : le mois en 4 bases ---------- */
  let tourTl = null;
  function stopTour() {
    M.touring = false;
    tourTl?.kill();
    $("#btn-plan").classList.remove("playing");
    $("#btn-plan").innerHTML = '<span class="tour-icon">▶</span> Le mois en 4 bases';
    $("#map-caption").classList.remove("show");
    D.weeks.forEach((w) => w.marker?.classList.remove("on"));
  }
  function planTour() {
    if (!M.map) return;
    M.touring = true;
    selectSector(null);
    const btn = $("#btn-plan");
    btn.classList.add("playing");
    btn.innerHTML = "■ Arrêter";
    const cap = $("#map-caption");
    const prog = { v: 0 };
    const setProg = () => M.map.setPaintProperty("plan", "line-gradient", planGradient(prog.v));
    tourTl = gsap.timeline({ onComplete: () => { prog.v = 1; setProg(); stopTour(); setDim(null); overview(); } });
    D.weeks.forEach((w, i) => {
      tourTl.call(() => {
        const pts = w.objectives.map((n) => byN[n].coord).concat([PLAN[PLAN_STOPS[i]]]);
        M.map.fitBounds(bounds(pts), { padding: { top: 150, bottom: 80, left: 80, right: 380 }, pitch: 62, bearing: [-20, 25, -35, 15][i], duration: 2600, maxZoom: 12 });
        setDim(new Set(w.objectives));
        D.weeks.forEach((x, j) => x.marker.classList.toggle("on", j <= i));
        cap.innerHTML = `<span class="mc-w">${w.w}</span><b>${w.base}</b>${w.goals}<br><span style="color:var(--muted)">Repli : ${w.fallback}</span><div class="mc-bar"><i></i></div>`;
        cap.classList.add("show");
        gsap.fromTo($(".mc-bar i", cap), { width: "0%" }, { width: "100%", duration: 5.2, ease: "none" });
      });
      tourTl.to(prog, { v: planFrac[PLAN_STOPS[i]] || 0.0001, duration: 1.8, ease: "power1.inOut", onUpdate: setProg });
      tourTl.to({}, { duration: 3.4 });
    });
  }

  /* ---------------- objective cards + drawer ---------------- */
  function topo(seed, color) {
    // relief stylisé (courbes de niveau) pour les sites sans photo
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const cx = 120 + rnd() * 160, cy = 120 + rnd() * 120;
    let paths = "";
    for (let k = 1; k <= 14; k++) {
      const r = k * 16;
      let d = "";
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        const w = r + Math.sin(t * 3 + seed) * k * 2.2 + Math.cos(t * 5 + k) * 6;
        d += `${a ? "L" : "M"}${(cx + Math.cos(t) * w * 1.2).toFixed(1)} ${(cy + Math.sin(t) * w).toFixed(1)}`;
      }
      paths += `<path d="${d}Z" fill="none" stroke="${color}" stroke-opacity="${(0.55 - k * 0.03).toFixed(2)}" stroke-width="1"/>`;
    }
    return `<svg viewBox="0 0 400 360" preserveAspectRatio="xMidYMid slice"><rect width="400" height="360" fill="#0c1614"/>${paths}</svg>`;
  }
  function renderObjectiveCards() {
    const grid = $("#obj-grid");
    D.objectives.forEach((o) => {
      const c = prioColor(o.prio), ph = o.photo && D.photos[o.photo];
      const card = h(`<article class="oc" data-n="${o.n}" data-prio="${o.prio}" style="--c:${c}" tabindex="0">
        ${ph ? `<div class="oc-bg" style="background-image:url(${ph.src})"></div>` : `<div class="oc-nophoto">${topo(o.n, c)}<small>Photo à réaliser par Léa</small></div>`}
        <div class="oc-shine"></div>
        <div class="oc-top"><span class="oc-num">${o.n}</span><span class="oc-prio">${D.priorities[o.prio].label}</span></div>
        <h3>${o.name}</h3>
        <div class="oc-sector">Secteur ${o.sector} · ${D.sectors[o.sector].name}</div>
        <div class="oc-kv"><div><span>Chute</span><b>${o.drop}</b></div><div><span>Altitude</span><b>${o.alt}</b></div></div>
        <span class="oc-go">→</span></article>`);
      card.addEventListener("click", () => openDrawer(o.n));
      card.addEventListener("keydown", (e) => e.key === "Enter" && openDrawer(o.n));
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        gsap.to(card, { rotateY: (x - 0.5) * 10, rotateX: (0.5 - y) * 10, transformPerspective: 900, duration: 0.5, ease: "power2.out" });
        card.style.setProperty("--mx", `${x * 100}%`); card.style.setProperty("--my", `${y * 100}%`);
      });
      card.addEventListener("pointerleave", () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "elastic.out(1, .5)" }));
      grid.append(card);
    });
    ScrollTrigger.batch(".oc", { start: "top 90%", once: true, onEnter: (els) => gsap.from(els, { y: 60, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out" }) });
    const f = $("#obj-filters");
    f.append(h('<button class="chip active" data-p="all">Tous · 12</button>'));
    Object.entries(D.priorities).forEach(([p, v]) => f.append(h(`<button class="chip" data-p="${p}">${v.label} · ${D.objectives.filter((o) => o.prio == p).length}</button>`)));
    f.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      $$(".chip", f).forEach((c) => c.classList.toggle("active", c === b));
      const state = Flip.getState(".oc");
      $$(".oc").forEach((c) => c.classList.toggle("hidden", b.dataset.p !== "all" && c.dataset.prio !== b.dataset.p));
      Flip.from(state, { duration: 0.7, ease: "power3.inOut", absolute: true, scale: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4 }) });
      ScrollTrigger.refresh();
    });
  }

  const CHECKS = ["Hauteur des ressauts", "Débit estimé (l/s)", "Qualité du rocher", "Ancrages posés", "Échappatoires", "Temps de parcours", "Photos et vidéo", "GPS départ / arrivée"];
  const drawer = $("#drawer");
  gsap.set(".drawer-panel", { x: 0, xPercent: 100 });
  function drawerHtml(o) {
    const c = prioColor(o.prio), ph = o.photo && D.photos[o.photo];
    const [lon, lat] = o.coord;
    const prev = byN[o.n - 1], next = byN[o.n + 1];
    return `<div style="--c:${c}">
      ${ph ? `<div class="dr-hero" style="background-image:url(${ph.src})"><span class="photo-credit">${ph.title} · ${ph.credit}</span></div>`
           : `<div class="dr-hero">${topo(o.n, c)}<span class="photo-credit">Aucune image libre de droits disponible — photo à réaliser par Léa</span></div>`}
      <div class="dr-content">
        <div class="dr-tags"><span class="dr-p">${D.priorities[o.prio].label}</span><span>Secteur ${o.sector} · ${D.sectors[o.sector].name}</span>${o.approx ? "<span>Position approx.</span>" : ""}</div>
        <h3><span>${o.n}</span>${o.name}</h3>
        <p class="dr-pitch">${o.pitch}</p>
        <div class="dr-data">
          <div><span>Coordonnées</span><b>${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E${o.approx ? " (approx.)" : ""}</b></div>
          <div><span>Altitude repère</span><b>${o.alt}</b></div>
          <div><span>Chute principale</span><b>${o.drop}</b></div>
          <div><span>Cours d'eau</span><b>${o.river}</b></div>
          <div><span>Base</span><b>${o.base}</b></div>
          <div><span>Durée estimée</span><b>${o.duration}</b></div>
          <div><span>Autorisation</span><b>${o.permit}</b></div>
          <div><span>Période</span><b>Juin (saison sèche côté Uva)</b></div>
        </div>
        <div class="dr-block"><h4>Localisation</h4><div class="dr-map" id="dr-map"></div></div>
        <div class="dr-block"><h4>Accès</h4><p>${o.access}</p></div>
        <div class="dr-block"><h4>Parcours envisagé</h4><ol class="dr-steps">${o.route.map((x) => `<li>${x}</li>`).join("")}</ol></div>
        <div class="dr-block"><h4>Points d'attention</h4><ul class="dr-watch">${o.watch.map((x) => `<li>${x}</li>`).join("")}</ul></div>
        <div class="dr-block"><h4>Relevés à faire sur place</h4><div class="dr-checks">${CHECKS.map((x) => `<span>${x}</span>`).join("")}</div></div>
        <div class="dr-actions"><button class="btn btn-primary" data-map="${o.n}">Voir sur la carte 3D</button></div>
        <div class="dr-nav">
          ${prev ? `<button data-go="${prev.n}">← Objectif ${prev.n}<b>${prev.name}</b></button>` : "<span></span>"}
          ${next ? `<button data-go="${next.n}">Objectif ${next.n} →<b>${next.name}</b></button>` : "<span></span>"}
        </div>
      </div></div>`;
  }
  function openDrawer(n) {
    const body = $("#drawer-body"), panel = $(".drawer-panel");
    const wasOpen = drawer.classList.contains("open");
    body.innerHTML = drawerHtml(byN[n]);
    panel.scrollTop = 0;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    lenis.stop();
    if (!wasOpen) {
      gsap.to(".drawer-backdrop", { opacity: 1, duration: 0.5 });
      gsap.fromTo(panel, { x: 0, xPercent: 100 }, { x: 0, xPercent: 0, duration: 0.8, ease: "expo.out" });
    }
    gsap.from($$(".dr-content > *", body), { y: 30, opacity: 0, duration: 0.7, stagger: 0.05, ease: "power3.out", delay: wasOpen ? 0 : 0.2 });
    gsap.fromTo(".dr-hero", { scale: 1.12 }, { scale: 1, duration: 1.4, ease: "expo.out" });
    miniMap(byN[n]);
    $$("[data-go]", body).forEach((b) => b.addEventListener("click", () => openDrawer(+b.dataset.go)));
    $("[data-map]", body).addEventListener("click", () => {
      closeDrawer();
      lenis.scrollTo("#carte", { duration: 1.4, onComplete: () => selectObjective(n) });
    });
  }
  function closeDrawer() {
    if (!drawer.classList.contains("open")) return;
    gsap.to(".drawer-backdrop", { opacity: 0, duration: 0.4 });
    gsap.to(".drawer-panel", { xPercent: 100, duration: 0.6, ease: "expo.in", onComplete: () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); killMiniMap(); } });
    lenis.start();
  }
  drawer.addEventListener("click", (e) => e.target.closest("[data-close]") && closeDrawer());
  addEventListener("keydown", (e) => e.key === "Escape" && closeDrawer());


  /* ---------------- les chutes à l'échelle ---------------- */
  function renderFalls() {
    const svg = $("#falls-svg");
    svg.setAttribute("viewBox", "0 0 1000 545");
    const ground = 440, top = 40, maxM = 340, sc = (ground - top) / maxM;
    const items = D.objectives.map((o) => ({ o, m: parseInt(o.drop, 10) }))
      .sort((a, b) => (isNaN(b.m) ? -1 : b.m) - (isNaN(a.m) ? -1 : a.m));
    let s = `<defs><linearGradient id="fallWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4f6ff" stop-opacity=".95"/><stop offset="1" stop-color="#5fb8d6" stop-opacity=".8"/></linearGradient>
      <filter id="mistBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>`;
    s += '<g class="falls-axis">' + [100, 200, 300].map((m) => `<line x1="20" x2="990" y1="${ground - m * sc}" y2="${ground - m * sc}"/><text x="990" y="${ground - m * sc - 5}" text-anchor="end">${m} m</text>`).join("") + `<line x1="20" x2="990" y1="${ground}" y2="${ground}" style="stroke:rgba(255,255,255,.2)"/></g>`;
    // Tour Eiffel (330 m) pour l'échelle
    const ex = 40, ew = 76, eh = 330 * sc, ey = ground - eh;
    const P = (x, y) => `${(ex + x * ew).toFixed(1)} ${(ey + y * eh).toFixed(1)}`;
    s += `<g class="eiffel"><path d="M${P(0.5, 0)} L${P(0.535, 0.2)} L${P(0.6, 0.5)} L${P(0.68, 0.55)} L${P(0.64, 0.6)} L${P(0.78, 0.8)} L${P(0.85, 0.83)} L${P(1, 1)} L${P(0.72, 1)} Q${P(0.5, 0.78)} ${P(0.28, 1)} L${P(0, 1)} L${P(0.15, 0.83)} L${P(0.22, 0.8)} L${P(0.36, 0.6)} L${P(0.32, 0.55)} L${P(0.4, 0.5)} L${P(0.465, 0.2)} Z"/>
      <text x="${ex + ew / 2}" y="${ground + 22}">Tour Eiffel</text><text x="${ex + ew / 2}" y="${ground + 38}">330 m</text></g>`;
    const x0 = 150, slot = (990 - x0) / items.length, cw = 40;
    items.forEach(({ o, m }, i) => {
      const x = x0 + i * slot + (slot - cw) / 2, cx = x + cw / 2, known = !isNaN(m);
      const hgt = known ? m * sc : 60, y = ground - hgt;
      s += `<g class="fall${known ? "" : " unknown"}" data-n="${o.n}"><title>${o.n}. ${o.name} — ${o.drop}</title><g class="fall-col">
        <rect class="rock" x="${x}" y="${y}" width="${cw}" height="${hgt}" rx="3"/>
        ${known ? `<rect class="water" x="${cx - 8}" y="${y}" width="16" height="${hgt}"/>
        ${[-4, 0, 4].map((d, k) => `<line class="flow" x1="${cx + d}" x2="${cx + d}" y1="${y}" y2="${ground}" style="animation-delay:${-k * 0.23}s"/>`).join("")}
        <ellipse class="mist" cx="${cx}" cy="${ground - 3}" rx="22" ry="8"/>` : ""}</g>
        <text class="val" x="${cx}" y="${y - 10}">${known ? m + " m" : "?"}</text>
        <circle cx="${cx}" cy="${ground + 18}" r="10" fill="${prioColor(o.prio)}"/><text class="num" x="${cx}" y="${ground + 18}">${o.n}</text>
        <text class="lbl" text-anchor="end" transform="translate(${cx + 6} ${ground + 40}) rotate(-35)">${o.short}</text></g>`;
    });
    svg.innerHTML = s;
    $$(".fall", svg).forEach((g) => g.addEventListener("click", () => openDrawer(+g.dataset.n)));
    const eif = $(".eiffel path", svg), len = eif.getTotalLength();
    gsap.set(eif, { strokeDasharray: len, strokeDashoffset: len, fillOpacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: svg, start: "top 80%" } })
      .to(eif, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut" })
      .to(eif, { fillOpacity: 1, duration: 0.6 }, "-=0.4")
      .from(".fall-col", { scaleY: 0, transformOrigin: "50% 100%", duration: 1.3, stagger: 0.07, ease: "expo.out" }, 0.4)
      .from(".fall .val", { opacity: 0, y: 10, duration: 0.5, stagger: 0.07 }, 0.9);
  }

  /* ---------------- anatomie d'une ouverture ---------------- */
  function renderOpening() {
    const svg = $("#op-svg"), RX = 316, TOP = 118, BOT = 596;
    const relays = [TOP, 262, 412, 556];
    const rock = "0,110 300,110 306,150 296,230 310,300 298,380 312,460 300,540 314,624 0,624";
    const bank = "520,150 474,160 484,260 470,380 482,500 474,624 520,624";
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    // facettes de rocher (texture) et végétation
    let facets = "";
    for (let i = 0; i < 70; i++) {
      const x = rnd() * 280, y = 125 + rnd() * 490, w = 18 + rnd() * 46, hh = 10 + rnd() * 30;
      facets += `<polygon points="${x},${y} ${x + w},${y + rnd() * 8} ${x + w - rnd() * 10},${y + hh} ${x + rnd() * 8},${y + hh - rnd() * 6}" fill="rgba(255,255,255,${(0.015 + rnd() * 0.045).toFixed(3)})"/>`;
    }
    const tree = (x, y, sc) => `<g transform="translate(${x} ${y}) scale(${sc})"><rect x="-2" y="-18" width="4" height="18" fill="#2a3a2f"/><circle cx="0" cy="-28" r="13" fill="#1f4a35"/><circle cx="-9" cy="-20" r="9" fill="#245640"/><circle cx="9" cy="-21" r="10" fill="#1b4230"/></g>`;
    const trees = [[24, 110, 1.3], [58, 110, 1], [86, 110, 1.2], [496, 152, 1.1], [512, 150, 0.9]].map(([x, y, k]) => tree(x, y, k)).join("");
    const moss = [150, 228, 300, 384, 462, 540].map((y, i) => `<ellipse cx="${300 + (i % 2) * 8}" cy="${y}" rx="${7 + (i % 3) * 3}" ry="4" fill="#2f5f43" opacity=".9"/>`).join("") +
      [200, 330, 450, 560].map((y) => `<ellipse cx="476" cy="${y}" rx="8" ry="4" fill="#2f5f43" opacity=".8"/>`).join("");
    svg.innerHTML = `<defs>
        <linearGradient id="opRock" x1="0" x2="1"><stop offset="0" stop-color="#121a17"/><stop offset="1" stop-color="#2c3a35"/></linearGradient>
        <linearGradient id="opWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4f6ff" stop-opacity=".9"/><stop offset="1" stop-color="#5fb8d6" stop-opacity=".7"/></linearGradient>
      </defs>
      <path d="M0 150 Q 140 70 260 120 T 520 110 V 624 H0Z" fill="#0d1815"/>
      <polygon points="${bank}" fill="url(#opRock)" opacity=".75"/>
      <polygon points="${rock}" fill="url(#opRock)"/>
      <g>${facets}</g>${moss}${trees}
      ${[170, 250, 330, 410, 490, 570].map((y, i) => `<path d="M0 ${y} Q 120 ${y - 8 + (i % 2) * 14} 296 ${y + 4}" stroke="rgba(255,255,255,.05)" fill="none"/>`).join("")}
      <path d="M0 110 H300" stroke="#3d6b4f" stroke-width="6" stroke-linecap="round"/>
      <path d="M210 108 Q 280 104 330 112" stroke="#8fd3ea" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
      <rect x="326" y="112" width="28" height="510" fill="url(#opWater)"/>
      ${[331, 340, 349].map((x, k) => `<line class="op-flow" x1="${x}" x2="${x}" y1="112" y2="622" style="animation-delay:${-k * 0.27}s"/>`).join("")}
      <ellipse cx="380" cy="624" rx="130" ry="13" fill="rgba(95,184,214,.35)"/>
      <ellipse class="op-ripple" cx="340" cy="622" rx="30" ry="5" fill="none" stroke="rgba(212,246,255,.6)"/>
      <g id="op-team" opacity="0">${[130, 176].map((x) => `<g transform="translate(${x} 110) scale(1.35)" stroke="#e9f0ec" stroke-width="3" stroke-linecap="round"><circle cx="0" cy="-30" r="6" fill="#f6c177" stroke="none"/><line x1="0" y1="-23" x2="0" y2="-9"/><line x1="0" y1="-9" x2="-5" y2="0"/><line x1="0" y1="-9" x2="5" y2="0"/><line x1="0" y1="-19" x2="9" y2="-24"/></g>`).join("")}
        <text class="op-lbl" x="112" y="54">Reconnaissance</text></g>
      <path id="op-sight" d="M190 76 Q 340 160 362 600" fill="none" stroke="#f6c177" stroke-width="1.6" stroke-dasharray="5 6" opacity="0"/>
      <line id="op-rope" x1="${RX}" y1="${TOP}" x2="${RX}" y2="${TOP}" stroke="#f6c177" stroke-width="2"/>
      ${relays.map((y, i) => `<g class="op-anchor" id="op-a${i}" transform="translate(${RX - 6} ${y})" opacity="0"><circle r="9" fill="rgba(246,193,119,.18)"/><circle r="4.5" fill="#f6c177" stroke="#08100d" stroke-width="1.5"/>
        ${i ? `<text class="op-lbl" x="-14" y="4" text-anchor="end">relais</text>` : `<text class="op-lbl" x="-14" y="4" text-anchor="end">ancrage de tête</text>`}</g>`).join("")}
      <g id="op-spark" opacity="0" stroke="#fff" stroke-width="1.5">${[0, 60, 120, 180, 240, 300].map((a) => `<line x1="${RX - 6 + 8 * Math.cos(a * Math.PI / 180)}" y1="${TOP + 8 * Math.sin(a * Math.PI / 180)}" x2="${RX - 6 + 16 * Math.cos(a * Math.PI / 180)}" y2="${TOP + 16 * Math.sin(a * Math.PI / 180)}"/>`).join("")}</g>
      <g id="op-climber" transform="translate(${RX} ${TOP})" opacity="0"><g transform="scale(1.7)" stroke="#e9f0ec" stroke-width="2.6" stroke-linecap="round" fill="none">
        <circle cx="11" cy="-13" r="6.5" fill="#f08a5d" stroke="none"/><path d="M5 -16 a6.5 6.5 0 0 1 12 0" stroke="#f6c177" stroke-width="2"/><line x1="7" y1="-6" x2="13" y2="12"/><line x1="13" y1="12" x2="0" y2="20"/><line x1="13" y1="12" x2="3" y2="27"/><line x1="8" y1="-3" x2="1" y2="-12"/><line x1="10" y1="2" x2="2" y2="0"/><rect x="8" y="-2" width="7" height="12" rx="2" fill="#3fd0b0" stroke="none" opacity=".9"/>
      </g></g>
      <g id="op-measure" opacity="0">
        <line x1="440" y1="112" x2="440" y2="620" stroke="#f6c177" stroke-width="1.5"/><path d="M434 122 L440 112 L446 122 M434 610 L440 620 L446 610" stroke="#f6c177" fill="none" stroke-width="1.5"/>
        <text class="op-lbl" transform="translate(456 370) rotate(90)" text-anchor="middle">hauteur des ressauts</text>
        ${[["débit (l/s)", 362, 250], ["qualité du rocher", 150, 420], ["GPS départ", 26, 170], ["temps de parcours", 150, 520]].map(([t, x, y]) => `<g class="op-badge" transform="translate(${x} ${y})"><rect x="0" y="-12" width="${t.length * 6.6 + 18}" height="24" rx="12"/><text x="9" y="0">${t}</text></g>`).join("")}
      </g>
      <g transform="translate(300 330)"><g id="op-topo" opacity="0">
        <rect width="196" height="250" rx="10" fill="#f1ede3"/><text x="16" y="30" fill="#1b2420" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="17">TOPO</text>
        <text x="16" y="48" fill="#5d6b65" font-size="10.5">parcours ouvert · juin 2027</text>
        <line x1="40" y1="68" x2="40" y2="228" stroke="#1b2420" stroke-width="2"/>
        ${[["Accès", 72], ["Rappel", 108], ["Relais", 140], ["Rappel", 172], ["Échappatoire", 200], ["Retour", 228]].map(([t, y]) => `<circle cx="40" cy="${y}" r="4" fill="#f08a5d"/><line x1="48" y1="${y}" x2="180" y2="${y}" stroke="#c9c2b2" stroke-dasharray="2 3"/><text x="56" y="${y - 4}" fill="#1b2420" font-size="11">${t}</text>`).join("")}
      </g></g>`;
    gsap.to(".op-ripple", { attr: { rx: 70, ry: 10 }, opacity: 0, duration: 1.8, repeat: -1, ease: "power1.out" });
    const sight = $("#op-sight"), sl = sight.getTotalLength();
    gsap.set(sight, { strokeDasharray: `${sl}`, strokeDashoffset: sl });
    const c = { y: TOP };
    const moveClimber = () => { $("#op-climber").setAttribute("transform", `translate(${RX} ${c.y})`); $("#op-rope").setAttribute("y2", c.y); };
    const bounds = [0, 0.16, 0.34, 0.66, 0.83, 1];
    const steps = $$("#op-steps li");
    steps.forEach((li, i) => (li.dataset.n = i + 1));
    const setStep = (p) => {
      let k = bounds.findIndex((b, i) => p >= b && p < (bounds[i + 1] ?? 2));
      k = Math.min(4, Math.max(0, k));
      steps.forEach((li, i) => { li.classList.toggle("on", i === k); li.classList.toggle("done", i < k); });
      gsap.set(".op-progress i", { scaleX: p });
    };
    setStep(0);
    const D3 = 3.4, t3 = 3.4;
    const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".opening", start: "top top", end: () => "+=" + innerHeight * 3.4, pin: ".op-pin", scrub: 0.6, onUpdate: (st) => setStep(st.progress) } });
    tl.to("#op-team", { opacity: 1, duration: 0.5 }, 0.1)
      .to(sight, { opacity: 1, duration: 0.1 }, 0.2).to(sight, { strokeDashoffset: 0, duration: 1.2 }, 0.2)
      .to(sight, { opacity: 0, duration: 0.4 }, 1.7)
      .to("#op-a0", { opacity: 1, duration: 0.3 }, 1.9).from("#op-a0 circle", { attr: { r: 0 }, duration: 0.4, ease: "back.out(3)" }, 1.9)
      .to("#op-spark", { opacity: 1, duration: 0.1, repeat: 5, yoyo: true }, 2.0)
      .to("#op-climber", { opacity: 1, duration: 0.4 }, 2.6)
      .to(c, { y: BOT, duration: D3, onUpdate: moveClimber }, t3);
    relays.slice(1).forEach((y, i) => tl.to(`#op-a${i + 1}`, { opacity: 1, duration: 0.25 }, t3 + (D3 * (y - TOP)) / (BOT - TOP) - 0.15));
    tl.to("#op-measure", { opacity: 1, duration: 0.3 }, 6.9)
      .from("#op-measure line", { attr: { y2: 112 }, duration: 0.7 }, 6.9)
      .from("#op-measure .op-badge", { opacity: 0, scale: 0.6, transformOrigin: "0% 50%", stagger: 0.18, duration: 0.3, ease: "back.out(2)" }, 7.2)
      .to("#op-measure", { opacity: 0.25, duration: 0.4 }, 8.5)
      .fromTo("#op-topo", { opacity: 0, x: 60, rotate: 6 }, { opacity: 1, x: 0, rotate: -3, duration: 0.8, ease: "power2.out", transformOrigin: "50% 50%" }, 8.6)
      .to({}, { duration: 0.6 });
  }

  /* ---------------- le trajet : Paris → Colombo → Uva ---------------- */
  const toRad = (d) => (d * Math.PI) / 180, toDeg = (r) => (r * 180) / Math.PI;
  function greatCircle([lo1, la1], [lo2, la2], n) {
    const v = (lo, la) => [Math.cos(toRad(la)) * Math.cos(toRad(lo)), Math.cos(toRad(la)) * Math.sin(toRad(lo)), Math.sin(toRad(la))];
    const a = v(lo1, la1), b = v(lo2, la2);
    const w = Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n, k1 = Math.sin((1 - t) * w) / Math.sin(w), k2 = Math.sin(t * w) / Math.sin(w);
      const p = [k1 * a[0] + k2 * b[0], k1 * a[1] + k2 * b[1], k1 * a[2] + k2 * b[2]];
      return [toDeg(Math.atan2(p[1], p[0])), toDeg(Math.asin(p[2]))];
    });
  }
  const haversine = ([lo1, la1], [lo2, la2]) => {
    const d = Math.sin(toRad(la2 - la1) / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(toRad(lo2 - lo1) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(d));
  };
  const bearingDeg = ([lo1, la1], [lo2, la2]) => {
    const y = Math.sin(toRad(lo2 - lo1)) * Math.cos(toRad(la2));
    const x = Math.cos(toRad(la1)) * Math.sin(toRad(la2)) - Math.sin(toRad(la1)) * Math.cos(toRad(la2)) * Math.cos(toRad(lo2 - lo1));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };
  function initTrip() {
    const CDG = [2.55, 49.01], CMB = [79.884, 7.18];
    const arc = greatCircle(CDG, CMB, 200), KM = haversine(CDG, CMB);
    const VAN = [CMB, [80.2, 7.25], [80.635, 7.291]];
    const legs = $$("#trip-legs li");
    const map = new maplibregl.Map({ container: "trip-map", style: mapStyle({ globe: true, terrain: false }), center: [30, 32], zoom: 1.5, interactive: false, attributionControl: false, fadeDuration: 0 });
    const plane = new maplibregl.Marker({ element: h('<div><svg class="plane" viewBox="0 0 24 24"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg></div>'), rotationAlignment: "map" });
    const pin = (t, c, anchor = "bottom") => new maplibregl.Marker({ element: h(`<div><div class="trip-pin">${t}</div></div>`), anchor }).setLngLat(c);
    const slPins = [pin("Kandy", [80.635, 7.291]), pin("Ella", [81.046, 6.874]), pin("Badulla", [81.056, 6.989])];
    let tl = null;
    const grad = (p) => (p <= 0 ? ["interpolate", ["linear"], ["line-progress"], 0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0)"] : ["step", ["line-progress"], "#f6c177", Math.min(p, 0.9999), "rgba(0,0,0,0)"]);
    function play() {
      tl?.kill();
      legs.forEach((l) => l.classList.remove("on"));
      slPins.forEach((m) => m.remove());
      ["van", "train"].forEach((id) => map.setPaintProperty(id, "line-opacity", 0));
      map.setPaintProperty("arc", "line-gradient", grad(0));
      map.jumpTo({ center: [30, 32], zoom: 1.5, pitch: 0, bearing: 0 });
      plane.setLngLat(CDG).addTo(map);
      $("#trip-km").textContent = "0";
      const pr = { v: 0 }, op = { van: 0, train: 0 };
      tl = gsap.timeline()
        .call(() => legs[0].classList.add("on"))
        .to(pr, { v: 1, duration: 6, ease: "power1.inOut", onUpdate: () => {
          const i = Math.min(arc.length - 2, Math.floor(pr.v * (arc.length - 1)));
          plane.setLngLat(arc[i]).setRotation(bearingDeg(arc[i], arc[i + 1]));
          map.setPaintProperty("arc", "line-gradient", grad(pr.v));
          map.jumpTo({ center: [lerp(30, 72, pr.v), lerp(32, 14, pr.v)], zoom: lerp(1.5, 2.3, pr.v) });
          $("#trip-km").textContent = fmt(KM * pr.v);
        } })
        .call(() => { plane.remove(); legs[1].classList.add("on"); map.flyTo({ center: [80.65, 7.1], zoom: 7.7, pitch: 30, duration: 3200, essential: true }); })
        .to(op, { van: 1, duration: 1, delay: 2.6, onUpdate: () => map.setPaintProperty("van", "line-opacity", op.van) })
        .call(() => { legs[2].classList.add("on"); slPins.forEach((m) => m.addTo(map)); })
        .to(op, { train: 1, duration: 1, onUpdate: () => map.setPaintProperty("train", "line-opacity", op.train) });
    }
    map.on("load", () => {
      map.addSource("arc", { type: "geojson", lineMetrics: true, data: { type: "Feature", geometry: { type: "LineString", coordinates: arc } } });
      map.addLayer({ id: "arc", type: "line", source: "arc", layout: { "line-cap": "round" }, paint: { "line-width": 3, "line-gradient": grad(0) } });
      map.addSource("van", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: VAN } } });
      map.addLayer({ id: "van", type: "line", source: "van", paint: { "line-color": "#f08a5d", "line-width": 3, "line-opacity": 0, "line-dasharray": [1, 1.2] } });
      map.addSource("train", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: D.trainLine } } });
      map.addLayer({ id: "train", type: "line", source: "train", paint: { "line-color": "#3fd0b0", "line-width": 3, "line-opacity": 0, "line-dasharray": [2, 1] } });
      pin("Paris", CDG).addTo(map);
      pin("Colombo", CMB, "top").addTo(map);
      ScrollTrigger.create({ trigger: ".trip", start: "top 70%", once: true, onEnter: play });
      $("#trip-replay").addEventListener("click", play);
    });
  }

  /* ---------------- mini-carte 3D des fiches ---------------- */
  let dm = null, dmRaf = 0;
  function killMiniMap() { cancelAnimationFrame(dmRaf); dm?.remove(); dm = null; }
  function miniMap(o) {
    killMiniMap();
    const el = $("#dr-map");
    if (!el) return;
    dm = new maplibregl.Map({ container: el, style: mapStyle(), center: o.coord, zoom: 12.7, pitch: 64, bearing: -30, maxPitch: 80, interactive: false, attributionControl: false, fadeDuration: 0 });
    new maplibregl.Marker({ element: h(`<div><div class="mk mk-obj p${o.prio} active" style="--c:${prioColor(o.prio)}">${o.n}</div></div>`) }).setLngLat(o.coord).addTo(dm);
    let b = -30;
    const spin = () => { if (!dm) return; b += 0.05; dm.setBearing(b); dmRaf = requestAnimationFrame(spin); };
    dm.on("load", () => { if (!reduce) dmRaf = requestAnimationFrame(spin); });
  }

  /* ---------------- planning timeline ---------------- */
  function renderTimeline() {
    const tl = $("#timeline");
    tl.append(h('<div class="tl-line"><i></i></div>'));
    D.weeks.forEach((w) => {
      tl.append(h(`<div class="tl-week"><div class="tl-dot">${w.w}</div><div class="tl-card"><b>${w.base}</b><p>${w.goals}</p>
        <div class="tl-objs">${w.objectives.map((n) => `<button style="--c:${prioColor(byN[n].prio)}" data-open="${n}" title="${byN[n].name}">${n}</button>`).join("")}</div>
        <p class="tl-fb"><span>Repli</span> · ${w.fallback}</p></div></div>`));
    });
    tl.addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openDrawer(+b.dataset.open); });
    gsap.timeline({ scrollTrigger: { trigger: tl, start: "top 75%" } })
      .to(".tl-line i", { scaleX: 1, duration: 1.8, ease: "power2.inOut" })
      .from(".tl-dot", { scale: 0, duration: 0.6, stagger: 0.4, ease: "back.out(2.5)" }, 0)
      .from(".tl-card", { y: 40, opacity: 0, duration: 0.8, stagger: 0.4, ease: "power3.out" }, 0.2);
    gsap.fromTo(".banner", { backgroundPositionY: "40%" }, { backgroundPositionY: "75%", ease: "none", scrollTrigger: { trigger: ".banner", start: "top bottom", end: "bottom top", scrub: true } });
  }

  /* ---------------- budget ---------------- */
  function renderBudget() {
    const B = D.budget, colors = ["#4f8ef7", "#3fd0b0", "#f08a5d", "#8d9d96", "#f6c177", "#b48ef7", "#e66f8f"];
    const bars = $("#budget-bars"), donut = $("#donut"), max = Math.max(...B.groups.map((g) => g.value));
    const R = 80, C = 2 * Math.PI * R;
    let acc = 0;
    B.groups.forEach((g, i) => {
      const bb = h(`<div class="bb" data-i="${i}" style="--c:${colors[i]};--w:${(g.value / max) * 100}%">
        <div class="bb-head"><b><i></i>${g.name}</b><span>${fmt(g.value)} €</span></div>
        <div class="bb-track"><div class="bb-fill"></div></div><p class="bb-detail">${g.detail}</p></div>`);
      bars.append(bb);
      const frac = g.value / B.total;
      const seg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      Object.entries({ cx: 100, cy: 100, r: R, stroke: colors[i], "stroke-dasharray": `0 ${C}`, "stroke-dashoffset": -acc * C, "data-i": i }).forEach(([k, v]) => seg.setAttribute(k, v));
      seg.dataset.len = Math.max(0, frac * C - 2.5);
      donut.append(seg);
      acc += frac;
      const hl = (on) => {
        bb.classList.toggle("hl", on); seg.classList.toggle("hl", on);
        $("#donut-center").innerHTML = on ? `<b>${fmt(g.value)} €</b><span>${g.name} · ${Math.round(frac * 100)} %</span>` : `<b>${fmt(B.total)} €</b><span>${B.groups.length} postes</span>`;
      };
      [bb, seg].forEach((x) => { x.addEventListener("pointerenter", () => hl(true)); x.addEventListener("pointerleave", () => hl(false)); });
    });
    $("#budget-note").textContent = B.note;
    gsap.timeline({ scrollTrigger: { trigger: "#budget", start: "top 65%" } })
      .to(".bb-fill", { scaleX: 1, duration: 1.2, stagger: 0.09, ease: "expo.out" })
      .add(() => $$("circle", donut).forEach((s, i) => gsap.to(s, { attr: { "stroke-dasharray": `${s.dataset.len} ${C}` }, duration: 1.1, delay: i * 0.12, ease: "power2.out" })), 0);
  }

  /* ---------------- risks, team, logistics, footer ---------------- */
  function renderRest() {
    const rg = $("#risk-grid");
    D.risks.forEach((r, i) => rg.append(h(`<div class="rk"><span class="rk-i">${String(i + 1).padStart(2, "0")}</span><b>${r.risk}</b><span class="rk-where">${r.where}</span><p class="rk-fix">${r.fix}</p></div>`)));
    ScrollTrigger.batch(".rk", { start: "top 90%", once: true, onEnter: (els) => gsap.from(els, { y: 50, rotateX: -25, opacity: 0, transformPerspective: 800, duration: 0.9, stagger: 0.07, ease: "power3.out" }) });

    const tg = $("#team-grid");
    D.team.forEach((m) => tg.append(h(`<div class="member" style="--c:${m.color}"><div class="avatar">${m.name[0]}</div><h3>${m.name}</h3><p class="role">${m.role}</p><p>${m.text}</p></div>`)));
    gsap.from(".member", { y: 60, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: tg, start: "top 85%" } });

    const lg = $("#logi-grid");
    D.logistics.forEach(([k, v]) => lg.append(h(`<div class="lg"><b>${k}</b><p>${v}</p></div>`)));
    gsap.from(".lg", { y: 40, opacity: 0, duration: 0.8, stagger: 0.07, ease: "power3.out", scrollTrigger: { trigger: lg, start: "top 85%" } });
    gsap.from(".sp, .contact-card", { y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".support-grid", start: "top 85%" } });

    D.sources.forEach((s) => $("#sources").append(h(`<li>${s}</li>`)));
    Object.values(D.photos).forEach((p) => $("#credits").append(h(`<li>${p.title} — ${p.credit}</li>`)));
  }

  /* ---------------- boot ---------------- */
  renderGoals();
  rainShadow();
  rainChart();
  renderMapPanel();
  renderObjectiveCards();
  renderFalls();
  renderOpening();
  renderTimeline();
  renderBudget();
  renderRest();
  initHero();
  heroIntro();
  document.fonts.ready.then(() => { reveals(); ScrollTrigger.sort(); ScrollTrigger.refresh(); });
  ScrollTrigger.create({ trigger: ".trip", start: "top bottom+=600", once: true, onEnter: initTrip });
  ScrollTrigger.create({ trigger: "#carte", start: "top bottom+=900", once: true, onEnter: initMap });
})();
