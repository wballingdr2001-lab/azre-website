/* AZRE — motion layer
   Lenis + GSAP ScrollTrigger/SplitText, one rAF loop.
   Easing vocabulary (the only curves used anywhere):
     enter  expo.out      — arrivals
     exit   power2.in     — departures
     state  power3.inOut  — modal / picker / swaps
     loop   linear        — infinite loops only (none currently)
   Reduced motion or ?motion=off: no Lenis, no tweens — content lands
   instantly and complete. site.js falls back to its own reveal system
   if this file never runs. */

(function () {
  "use strict";

  var E = { enter: "expo.out", exit: "power2.in", state: "power3.inOut" };

  var forcedOff = /[?&]motion=off\b/.test(location.search);
  var prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasLibs = window.gsap && window.ScrollTrigger && window.SplitText && window.Lenis;

  /* ---------- instant path: content complete, no motion ---------- */

  var revealInstant = function () {
    document.documentElement.classList.add("motion-off");
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  };

  if (!hasLibs) return; // site.js fallback reveals take over

  window.AZRE_MOTION_ACTIVE = true;

  if (forcedOff || prefersReduce) {
    revealInstant();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  document.documentElement.classList.add("has-motion");

  /* ---------- 1 · foundation: Lenis + ScrollTrigger, one clock ---------- */

  var lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // same-page anchors ride the smooth scroll instead of jumping
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute("href");
    if (id.length < 2) return;
    a.addEventListener("click", function (e) {
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -84, duration: 1.1, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    });
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  /* ---------- helpers ---------- */

  var page = location.pathname.split("/").pop() || "index.html";
  var claimed = new Set(); // .reveal elements owned by a specific choreography

  var maskLines = function (el, opts) {
    opts = opts || {};
    return SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "msk-line",
      autoSplit: true,
      onSplit: function (self) {
        return gsap.fromTo(self.lines,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: opts.duration || 1.1,
            ease: E.enter,
            stagger: 0.08,
            delay: opts.delay || 0,
            scrollTrigger: opts.scroll === false ? null : {
              trigger: el,
              start: "top 88%",
              once: true
            }
          });
      }
    });
  };

  /* ---------- 2 · page-load sequence ---------- */

  var intro = function () {
    var hero = document.querySelector(".hero__grid") || document.querySelector(".page-hero .container");
    if (!hero) return;

    var h1 = hero.querySelector("h1");
    var eyebrow = hero.querySelector(".eyebrow");
    var support = hero.querySelectorAll(".hero__copy, .page-hero .lede, .hero__ctas, .hero__local, .tier-jump");
    var photo = document.querySelector(".hero__grid .photo");
    var headerBits = document.querySelectorAll(".site-header .brand, .site-header .nav-toggle, .site-nav > a");

    var tl = gsap.timeline({ defaults: { ease: E.enter } });

    // headline: masked lines, the heaviest element, longest duration
    if (h1) {
      SplitText.create(h1, {
        type: "lines",
        mask: "lines",
        linesClass: "msk-line",
        autoSplit: true,
        onSplit: function (self) {
          return gsap.fromTo(self.lines,
            { yPercent: 110 },
            { yPercent: 0, duration: 1.1, ease: E.enter, stagger: 0.08, delay: 0.25 });
        }
      });
    }

    if (eyebrow) tl.fromTo(eyebrow, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 0.1);

    // header settles on its own offset clock — a sequence, not a pop
    if (headerBits.length) {
      tl.fromTo(headerBits, { autoAlpha: 0, y: -10 },
        { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.05 }, 0.45);
    }

    // support copy: lighter mass, shorter travel
    if (support.length) {
      tl.fromTo(support, { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.09 }, 0.62);
    }

    // hero photograph: clip reveal + counter-scale, never a fade
    if (photo) {
      var img = photo.querySelector("img");
      var cap = photo.querySelector("figcaption");
      tl.fromTo(photo, { clipPath: "inset(100% 0% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2 }, 0.35);
      if (img) tl.fromTo(img, { scale: 1.15 }, { scale: 1, duration: 1.2 }, 0.35);
      if (cap) tl.fromTo(cap, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 1.15);
    }
  };

  // pre-hide intro targets in the same task to avoid a flash, then wait on fonts
  (function () {
    var hero = document.querySelector(".hero__grid") || document.querySelector(".page-hero .container");
    if (!hero) return;
    gsap.set(hero.querySelectorAll(".eyebrow, .hero__copy, .page-hero .lede, .hero__ctas, .hero__local, .tier-jump"), { autoAlpha: 0 });
    gsap.set(document.querySelectorAll(".site-header .brand, .site-header .nav-toggle, .site-nav > a"), { autoAlpha: 0 });
    var h1 = hero.querySelector("h1");
    if (h1) gsap.set(h1, { autoAlpha: 0 }); // unhidden by SplitText's first frame
    var photo = document.querySelector(".hero__grid .photo");
    if (photo) gsap.set(photo, { clipPath: "inset(100% 0% 0% 0%)" });
  })();

  document.fonts.ready.then(function () {
    var hero = document.querySelector(".hero__grid") || document.querySelector(".page-hero .container");
    if (hero) {
      var h1 = hero.querySelector("h1");
      if (h1) gsap.set(h1, { autoAlpha: 1 });
    }
    intro();
    ScrollTrigger.refresh();
  });

  /* ---------- 3 · signature moment: the deck (home only, wide screens) ---------- */

  var mm = gsap.matchMedia();

  var deckEl = document.querySelector("[data-deck]");
  if (deckEl) {
    deckEl.querySelectorAll(".reveal").forEach(function (el) { claimed.add(el); });

    mm.add("(min-width: 900px)", function () {
      var stage = deckEl.querySelector(".deck__stage");
      var items = gsap.utils.toArray(deckEl.querySelectorAll(".deck-item"));
      var counter = deckEl.querySelector("[data-deck-num]");
      if (items.length < 2) return;

      deckEl.classList.add("deck--live");

      // stack order: first card on top
      items.forEach(function (item, i) {
        gsap.set(item, { zIndex: items.length - i });
        if (i > 0) gsap.set(item, { scale: 0.955, yPercent: 3.2 });
      });

      var tl = gsap.timeline();
      items.forEach(function (item, i) {
        if (i === items.length - 1) return;
        var next = items[i + 1];
        var at = i * 1.3;
        // departing card accelerates out; arriving card settles under it
        tl.to(item, { yPercent: -112, duration: 1, ease: "power1.in" }, at)
          .to(item, { autoAlpha: 0, duration: 0.28, ease: "none" }, at + 0.72)
          .to(next, { scale: 1, yPercent: 0, duration: 1, ease: "none" }, at)
          .fromTo(next.querySelectorAll(".deck-item__meta > *"),
            { autoAlpha: 0, y: 26 },
            { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "none" }, at + 0.55);
      });
      tl.to({}, { duration: 0.5 }); // settle hold on the last card

      var st = ScrollTrigger.create({
        trigger: deckEl,
        start: "top top+=76",
        end: "+=230%",
        pin: true,
        scrub: 1,
        animation: tl,
        onUpdate: function (self) {
          if (!counter) return;
          var idx = Math.min(items.length - 1, Math.floor(self.progress * (items.length - 0.35)));
          var label = "0" + (idx + 1);
          if (counter.textContent !== label) counter.textContent = label;
        }
      });

      return function () {
        deckEl.classList.remove("deck--live");
        st.kill();
        tl.kill();
        gsap.set(items, { clearProps: "all" });
        items.forEach(function (item) {
          gsap.set(item.querySelectorAll(".deck-item__meta > *"), { clearProps: "all" });
        });
      };
    });

    // narrow screens: the deck is a normal stacked list with plain reveals
    mm.add("(max-width: 899px)", function () {
      var items = deckEl.querySelectorAll(".deck-item");
      items.forEach(function (item) {
        gsap.fromTo(item, { autoAlpha: 0, y: 30 }, {
          autoAlpha: 1, y: 0, duration: 0.8, ease: E.enter,
          scrollTrigger: { trigger: item, start: "top 88%", once: true }
        });
      });
    });
  }

  /* ---------- 4 · scroll choreography, by hierarchy ---------- */

  // section headlines: masked lines; eyebrow and lede on offset clocks
  document.querySelectorAll(".section-head.reveal, .tier-head.reveal").forEach(function (head) {
    claimed.add(head);
    var h = head.querySelector("h2");
    var eyebrow = head.querySelector(".eyebrow");
    var lede = head.querySelector(".lede");
    var price = head.querySelector(".tier-price");

    if (eyebrow) gsap.fromTo(eyebrow, { autoAlpha: 0, y: 12 }, {
      autoAlpha: 1, y: 0, duration: 0.5, ease: E.enter,
      scrollTrigger: { trigger: head, start: "top 88%", once: true }
    });
    if (h) document.fonts.ready.then(function () { maskLines(h, { duration: 1.0 }); });
    if (lede) gsap.fromTo(lede, { autoAlpha: 0, y: 20 }, {
      autoAlpha: 1, y: 0, duration: 0.75, delay: 0.2, ease: E.enter,
      scrollTrigger: { trigger: head, start: "top 88%", once: true }
    });
    if (price) gsap.fromTo(price, { autoAlpha: 0, y: 18 }, {
      autoAlpha: 1, y: 0, duration: 0.8, delay: 0.3, ease: E.enter,
      scrollTrigger: { trigger: head, start: "top 88%", once: true }
    });
  });

  // work items (gallery page): window and meta on split clocks
  document.querySelectorAll(".work-item.reveal").forEach(function (item) {
    claimed.add(item);
    var win = item.querySelector(".work-item__window");
    var meta = item.querySelectorAll(".work-item__meta > *");
    var st = { trigger: item, start: "top 82%", once: true };
    if (win) gsap.fromTo(win, { autoAlpha: 0, yPercent: 7 },
      { autoAlpha: 1, yPercent: 0, duration: 1.0, ease: E.enter, scrollTrigger: st });
    if (meta.length) gsap.fromTo(meta, { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07, delay: 0.12, ease: E.enter, scrollTrigger: st });
  });

  // includes checklists: title then a quick ripple through the ticks
  document.querySelectorAll(".includes.reveal").forEach(function (panel) {
    claimed.add(panel);
    var st = { trigger: panel, start: "top 86%", once: true };
    gsap.fromTo(panel, { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: E.enter, scrollTrigger: st });
    gsap.fromTo(panel.querySelectorAll("li"), { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.045, delay: 0.15, ease: E.enter, scrollTrigger: st });
  });

  // everything else keeps a single quiet entrance — varied from the above
  document.querySelectorAll(".reveal").forEach(function (el) {
    if (claimed.has(el)) { el.classList.add("is-visible"); return; }
    gsap.fromTo(el, { autoAlpha: 0, y: 26 }, {
      autoAlpha: 1, y: 0, duration: 0.75, ease: E.enter,
      scrollTrigger: { trigger: el, start: "top 85%", once: true }
    });
  });

  /* ---------- 5 · depth parallax ---------- */

  // process page: steps drift at different rates through one scroll range
  if (page === "process.html") {
    var stepsWrap = document.querySelector(".steps");
    if (stepsWrap) {
      mm.add("(min-width: 768px)", function () {
        var steps = stepsWrap.querySelectorAll(".step");
        var head = stepsWrap.closest(".section").querySelector(".section-head");
        var rates = [-4, -11, -18];
        var trigs = [];
        steps.forEach(function (step, i) {
          trigs.push(gsap.to(step, {
            yPercent: rates[i] || -6, ease: "none",
            scrollTrigger: { trigger: stepsWrap, start: "top 85%", end: "bottom 15%", scrub: 1 }
          }));
        });
        if (head) trigs.push(gsap.to(head, {
          yPercent: 7, ease: "none",
          scrollTrigger: { trigger: stepsWrap, start: "top 85%", end: "bottom 15%", scrub: 1 }
        }));
        return function () { trigs.forEach(function (t) { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); }); };
      });
    }
  }

  // roots page: one slow parallax on the landscape band, nothing else
  if (page === "roots.html") {
    var wide = document.querySelector(".photo--wide");
    if (wide) {
      var wimg = wide.querySelector("img");
      if (wimg) {
        gsap.set(wimg, { scale: 1.14 });
        gsap.fromTo(wimg, { yPercent: -6 }, {
          yPercent: 6, ease: "none",
          scrollTrigger: { trigger: wide, start: "top bottom", end: "bottom top", scrub: 1 }
        });
      }
    }
  }

  /* ---------- 6 · hooks site.js calls at interaction time ---------- */

  window.AZRE_MOTION = {

    lenis: lenis,

    /* View Demo modal — a transition, not a mount */
    overlayOpen: function (overlay) {
      lenis.stop();
      var frame = overlay.querySelector(".overlay__frame");
      var stage = overlay.querySelector(".overlay__stage");
      var tl = gsap.timeline();
      /* opacity, not autoAlpha: the close button must be focusable on frame one */
      tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" }, 0)
        .fromTo(frame,
          { clipPath: "inset(42% 6% 42% 6% round 14px)", autoAlpha: 0.6 },
          { clipPath: "inset(0% 0% 0% 0% round 12px)", autoAlpha: 1, duration: 0.6, ease: E.state }, 0.05)
        .fromTo(stage, { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: E.enter }, 0.42);
    },

    overlayClose: function (overlay, done) {
      var frame = overlay.querySelector(".overlay__frame");
      var tl = gsap.timeline({
        onComplete: function () {
          lenis.start();
          gsap.set([overlay, frame], { clearProps: "all" });
          done();
        }
      });
      tl.to(frame, { autoAlpha: 0, y: 26, scale: 0.985, duration: 0.3, ease: E.exit }, 0)
        .to(overlay, { autoAlpha: 0, duration: 0.3, ease: "none" }, 0.08);
    },

    /* scheduler: slots ripple in when a date is picked */
    slotsIn: function (grid) {
      gsap.fromTo(grid.children, { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.035, ease: E.enter });
    },

    /* scheduler: month grid re-render */
    calSwap: function (grid) {
      gsap.fromTo(grid.children, { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.006, ease: E.enter });
    },

    /* form → success: exit the form, clip the panel in, draw the check */
    formSwap: function (form, success, focusDone) {
      var tl = gsap.timeline();
      tl.to(form, {
        autoAlpha: 0, y: -12, duration: 0.28, ease: E.exit,
        onComplete: function () {
          form.hidden = true;
          gsap.set(form, { clearProps: "all" });
          success.hidden = false;
        }
      });
      tl.fromTo(success,
        { clipPath: "inset(0% 0% 100% 0% round 8px)", autoAlpha: 1 },
        { clipPath: "inset(0% 0% 0% 0% round 8px)", duration: 0.55, ease: E.state });
      var ring = success.querySelector("[data-check-ring]");
      var tick = success.querySelector("[data-check-tick]");
      if (ring && tick) {
        var rl = ring.getTotalLength(), kl = tick.getTotalLength();
        gsap.set(ring, { strokeDasharray: rl, strokeDashoffset: rl });
        gsap.set(tick, { strokeDasharray: kl, strokeDashoffset: kl });
        tl.to(ring, { strokeDashoffset: 0, duration: 0.5, ease: E.state }, "-=0.25");
        tl.to(tick, { strokeDashoffset: 0, duration: 0.32, ease: E.enter }, "-=0.1");
      }
      tl.fromTo(success.querySelectorAll("h3, p"), { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08, ease: E.enter,
          onComplete: function () { if (focusDone) focusDone(); } }, "-=0.35");
    }
  };
})();
