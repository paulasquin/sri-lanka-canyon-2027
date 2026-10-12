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
  const mapStyle = ({ globe = false } = {}) => ({
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
    terrain: { source: "dem", exaggeration: 1.5 },
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
    $$("[data-go]", body).forEach((b) => b.addEventListener("click", () => openDrawer(+b.dataset.go)));
    $("[data-map]", body).addEventListener("click", () => {
      closeDrawer();
      lenis.scrollTo("#carte", { duration: 1.4, onComplete: () => selectObjective(n) });
    });
  }
  function closeDrawer() {
    if (!drawer.classList.contains("open")) return;
    gsap.to(".drawer-backdrop", { opacity: 0, duration: 0.4 });
    gsap.to(".drawer-panel", { xPercent: 100, duration: 0.6, ease: "expo.in", onComplete: () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); } });
    lenis.start();
  }
  drawer.addEventListener("click", (e) => e.target.closest("[data-close]") && closeDrawer());
  addEventListener("keydown", (e) => e.key === "Escape" && closeDrawer());

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
  renderTimeline();
  renderBudget();
  renderRest();
  initHero();
  heroIntro();
  document.fonts.ready.then(() => { reveals(); ScrollTrigger.refresh(); });
  ScrollTrigger.create({ trigger: "#carte", start: "top bottom+=900", once: true, onEnter: initMap });
})();
