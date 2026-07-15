/* AZRE — site behavior
   Shared: header, mobile nav, scroll reveals.
   Work page: live demo previews + the View Demo overlay.
   Contact page: Arizona-time scheduler + form validation.
   Each module guards for its elements, so every page loads the same file. */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- header (all pages) ---------- */

  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var navToggle = document.querySelector(".nav-toggle");
  var siteNav = document.getElementById("site-nav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var open = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    siteNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- scroll reveals (fallback only) ----------
     motion.js owns reveals when it loads; this runs only if it didn't
     (missing vendor file, blocked script), so pages never ship blank. */

  setTimeout(function () {
    if (window.AZRE_MOTION_ACTIVE) return;
    var revealEls = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && !reducedMotion.matches) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }, 80);

  /* ---------- gallery previews: scale live demos, slow pan on hover ---------- */

  var IFRAME_W = 1280;

  document.querySelectorAll("[data-preview]").forEach(function (card) {
    var view = card.querySelector(".win__view");
    var iframe = view.querySelector("iframe");
    var rafId = null;

    var fit = function () {
      var scale = view.clientWidth / IFRAME_W;
      iframe.style.transform = "scale(" + scale + ")";
      // keep the embedded viewport a natural desktop size
      iframe.style.height = Math.round(view.clientHeight / scale) + "px";
    };
    fit();
    if ("ResizeObserver" in window) {
      new ResizeObserver(fit).observe(view);
    } else {
      window.addEventListener("resize", fit);
    }

    // slow pan down the live demo on hover, back up on leave
    var panTo = function (target, duration) {
      var win = iframe.contentWindow;
      if (!win) return;
      var start = win.scrollY;
      var change = target - start;
      if (Math.abs(change) < 2) return;
      var t0 = performance.now();
      cancelAnimationFrame(rafId);
      var step = function (now) {
        var p = Math.min(1, (now - t0) / duration);
        // bypass the demos' own smooth scroll-behavior
        win.scrollTo({ top: start + change * p, behavior: "instant" });
        if (p < 1) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    };

    card.addEventListener("mouseenter", function () {
      if (reducedMotion.matches) return;
      try {
        var doc = iframe.contentDocument;
        if (!doc) return;
        var max = doc.documentElement.scrollHeight - iframe.clientHeight;
        panTo(Math.max(0, max), 9000);
      } catch (e) { /* not ready — skip the pan */ }
    });
    card.addEventListener("mouseleave", function () {
      try {
        panTo(0, 1200);
      } catch (e) { /* ignore */ }
    });
  });

  /* ---------- View Demo overlay (work page) ---------- */

  var overlay = document.getElementById("demo-overlay");
  if (overlay) {
    var frame = overlay.querySelector(".overlay__frame");
    var viewportHost = overlay.querySelector("[data-overlay-viewport]");
    var urlLabel = overlay.querySelector("[data-overlay-url]");
    var closeBtn = overlay.querySelector("[data-overlay-close]");
    var viewportButtons = overlay.querySelectorAll("[data-viewport]");
    var lastFocus = null;

    var setViewport = function (mode) {
      frame.classList.toggle("is-mobile", mode === "mobile");
      viewportButtons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.dataset.viewport === mode));
      });
    };

    var onOverlayKeydown = function (e) {
      if (e.key === "Escape") {
        closeDemo();
        return;
      }
      if (e.key !== "Tab") return;
      // keep focus cycling through the overlay chrome + embedded demo
      var focusables = overlay.querySelectorAll("button, a[href], iframe");
      var list = Array.prototype.filter.call(focusables, function (el) {
        return el.offsetParent !== null;
      });
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    var openDemo = function (src, urlText, name) {
      lastFocus = document.activeElement;
      urlLabel.textContent = urlText;

      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = name + " — full demo website";
      viewportHost.innerHTML = "";
      viewportHost.appendChild(iframe);

      setViewport("desktop");
      overlay.classList.add("is-open");
      document.body.classList.add("is-locked");
      if (window.AZRE_MOTION && window.AZRE_MOTION.overlayOpen) {
        window.AZRE_MOTION.overlayOpen(overlay);
      }
      closeBtn.focus();
      document.addEventListener("keydown", onOverlayKeydown);
    };

    var closeDemo = function () {
      var finish = function () {
        overlay.classList.remove("is-open");
        document.body.classList.remove("is-locked");
        viewportHost.innerHTML = "";
        if (lastFocus) lastFocus.focus();
      };
      document.removeEventListener("keydown", onOverlayKeydown);
      if (window.AZRE_MOTION && window.AZRE_MOTION.overlayClose) {
        window.AZRE_MOTION.overlayClose(overlay, finish);
      } else {
        finish();
      }
    };

    document.querySelectorAll("[data-demo]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDemo(btn.dataset.demo, btn.dataset.demoUrl, btn.dataset.demoName);
      });
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeDemo();
    });
    closeBtn.addEventListener("click", closeDemo);
    viewportButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setViewport(btn.dataset.viewport);
      });
    });
  }

  /* ---------- scheduler + form (contact page) ---------- */

  var form = document.getElementById("demo-form");
  var scheduler = document.querySelector(".scheduler");
  if (form && scheduler) {

    var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];
    var DOWS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    var SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
    var BOOKING_HORIZON_DAYS = 90;

    var azToday = function () {
      // "today" on Arizona clocks (MST year-round), wherever the visitor is
      var s = new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" });
      var d = new Date(s);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    var monthLabel = scheduler.querySelector("[data-cal-month]");
    var grid = scheduler.querySelector("[data-cal-grid]");
    var prevBtn = scheduler.querySelector("[data-cal-prev]");
    var nextBtn = scheduler.querySelector("[data-cal-next]");
    var slotsGrid = scheduler.querySelector("[data-slots-grid]");
    var slotsEmpty = scheduler.querySelector("[data-slots-empty]");
    var summary = scheduler.querySelector("[data-summary]");
    var summaryText = scheduler.querySelector("[data-summary-text]");

    var today = azToday();
    var horizon = new Date(today);
    horizon.setDate(horizon.getDate() + BOOKING_HORIZON_DAYS);

    var view = { y: today.getFullYear(), m: today.getMonth() };
    var selectedDate = null;
    var selectedTime = null;

    var fmtDate = function (d) {
      return d.toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric"
      });
    };

    var selectable = function (d) {
      var dow = d.getDay();
      return d > today && d <= horizon && dow !== 0 && dow !== 6;
    };

    var renderCalendar = function () {
      monthLabel.textContent = MONTHS[view.m] + " " + view.y;
      grid.innerHTML = "";

      DOWS.forEach(function (dw) {
        var cell = document.createElement("span");
        cell.className = "cal__dow";
        cell.textContent = dw;
        grid.appendChild(cell);
      });

      var first = new Date(view.y, view.m, 1);
      var daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

      for (var i = 0; i < first.getDay(); i++) {
        var pad = document.createElement("span");
        pad.className = "cal__day cal__day--empty";
        grid.appendChild(pad);
      }

      for (var day = 1; day <= daysInMonth; day++) {
        var date = new Date(view.y, view.m, day);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cal__day";
        btn.textContent = String(day);
        btn.setAttribute("aria-label", date.toLocaleDateString("en-US",
          { weekday: "long", month: "long", day: "numeric", year: "numeric" }));

        if (!selectable(date)) {
          btn.disabled = true;
        } else {
          btn.setAttribute("aria-pressed",
            String(!!selectedDate && date.getTime() === selectedDate.getTime()));
          (function (d) {
            btn.addEventListener("click", function () { pickDate(d); });
          })(date);
        }
        grid.appendChild(btn);
      }

      prevBtn.disabled = view.y === today.getFullYear() && view.m === today.getMonth();
      nextBtn.disabled = new Date(view.y, view.m + 1, 1) > horizon;
    };

    var pickDate = function (d) {
      selectedDate = d;
      selectedTime = null;
      renderCalendar();
      renderSlots();
      updateSummary();
    };

    var renderSlots = function () {
      if (!selectedDate) {
        slotsGrid.hidden = true;
        slotsEmpty.hidden = false;
        return;
      }
      slotsEmpty.hidden = true;
      slotsGrid.hidden = false;
      slotsGrid.innerHTML = "";
      SLOTS.forEach(function (t) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot-btn";
        btn.textContent = t;
        btn.setAttribute("aria-pressed", String(t === selectedTime));
        btn.addEventListener("click", function () {
          selectedTime = t;
          slotsGrid.querySelectorAll(".slot-btn").forEach(function (b) {
            b.setAttribute("aria-pressed", String(b === btn));
          });
          updateSummary();
        });
        slotsGrid.appendChild(btn);
      });
      if (window.AZRE_MOTION && window.AZRE_MOTION.slotsIn) {
        window.AZRE_MOTION.slotsIn(slotsGrid);
      }
    };

    var updateSummary = function () {
      if (selectedDate && selectedTime) {
        summaryText.textContent = fmtDate(selectedDate) + " · " + selectedTime + " MST";
        summary.hidden = false;
        scheduler.classList.remove("has-error");
      } else {
        summary.hidden = true;
      }
    };

    var calMotion = function () {
      if (window.AZRE_MOTION && window.AZRE_MOTION.calSwap) {
        window.AZRE_MOTION.calSwap(grid);
      }
    };
    prevBtn.addEventListener("click", function () {
      view.m -= 1;
      if (view.m < 0) { view.m = 11; view.y -= 1; }
      renderCalendar();
      calMotion();
    });
    nextBtn.addEventListener("click", function () {
      view.m += 1;
      if (view.m > 11) { view.m = 0; view.y += 1; }
      renderCalendar();
      calMotion();
    });

    renderCalendar();
    renderSlots();

    /* inquiry pills */

    var inquiryField = form.querySelector('[data-field="inquiry"]');
    var selectedInquiry = null;
    inquiryField.querySelectorAll(".pill").forEach(function (pill) {
      pill.setAttribute("aria-pressed", "false");
      pill.addEventListener("click", function () {
        selectedInquiry = pill.dataset.inquiry;
        inquiryField.querySelectorAll(".pill").forEach(function (p) {
          p.setAttribute("aria-pressed", String(p === pill));
        });
        inquiryField.classList.remove("has-error");
      });
    });

    /* validation */

    var success = document.getElementById("form-success");
    var successText = success.querySelector("[data-success-text]");

    var fieldWrap = function (name) {
      return form.querySelector('[data-field="' + name + '"]');
    };

    var validEmail = function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    };

    var checkName = function () {
      var ok = form.name.value.trim().length > 0;
      fieldWrap("name").classList.toggle("has-error", !ok);
      return ok;
    };

    var checkEmail = function () {
      var ok = validEmail(form.email.value.trim());
      fieldWrap("email").classList.toggle("has-error", !ok);
      return ok;
    };

    form.name.addEventListener("blur", function () {
      if (form.name.value.trim()) checkName();
    });
    form.email.addEventListener("blur", function () {
      if (form.email.value.trim()) checkEmail();
    });
    form.name.addEventListener("input", function () {
      if (form.name.value.trim()) fieldWrap("name").classList.remove("has-error");
    });
    form.email.addEventListener("input", function () {
      if (validEmail(form.email.value.trim())) fieldWrap("email").classList.remove("has-error");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var okName = checkName();
      var okEmail = checkEmail();
      var okInquiry = !!selectedInquiry;
      inquiryField.classList.toggle("has-error", !okInquiry);
      var okSlot = !!(selectedDate && selectedTime);
      scheduler.classList.toggle("has-error", !okSlot);

      if (!okName) { form.name.focus(); return; }
      if (!okEmail) { form.email.focus(); return; }
      if (!okInquiry) { inquiryField.querySelector(".pill").focus(); return; }
      if (!okSlot) {
        scheduler.querySelector("button.cal__day:not(:disabled)")?.focus();
        return;
      }

      successText.textContent =
        "You're penciled in for " + fmtDate(selectedDate) + " at " + selectedTime +
        " MST. We'll confirm by email within one business day, calendar invite included — Arizona time, as always.";
      if (window.AZRE_MOTION && window.AZRE_MOTION.formSwap) {
        window.AZRE_MOTION.formSwap(form, success, function () { success.focus(); });
      } else {
        form.hidden = true;
        success.hidden = false;
        success.focus();
      }
    });
  }

  /* ---------- contact form (contact page) ---------- */

  var contactForm = document.getElementById("contact-form");
  if (contactForm) {

    var contactSuccess = document.getElementById("contact-success");

    var cWrap = function (name) {
      return contactForm.querySelector('[data-field="' + name + '"]');
    };

    var cValidEmail = function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    };

    var cCheckName = function () {
      var ok = contactForm.name.value.trim().length > 0;
      cWrap("name").classList.toggle("has-error", !ok);
      return ok;
    };

    var cCheckEmail = function () {
      var ok = cValidEmail(contactForm.email.value.trim());
      cWrap("email").classList.toggle("has-error", !ok);
      return ok;
    };

    var cCheckMessage = function () {
      var ok = contactForm.message.value.trim().length > 0;
      cWrap("message").classList.toggle("has-error", !ok);
      return ok;
    };

    contactForm.name.addEventListener("blur", function () {
      if (contactForm.name.value.trim()) cCheckName();
    });
    contactForm.email.addEventListener("blur", function () {
      if (contactForm.email.value.trim()) cCheckEmail();
    });
    contactForm.name.addEventListener("input", function () {
      if (contactForm.name.value.trim()) cWrap("name").classList.remove("has-error");
    });
    contactForm.email.addEventListener("input", function () {
      if (cValidEmail(contactForm.email.value.trim())) cWrap("email").classList.remove("has-error");
    });
    contactForm.message.addEventListener("input", function () {
      if (contactForm.message.value.trim()) cWrap("message").classList.remove("has-error");
    });

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var okName = cCheckName();
      var okEmail = cCheckEmail();
      var okMessage = cCheckMessage();

      if (!okName) { contactForm.name.focus(); return; }
      if (!okEmail) { contactForm.email.focus(); return; }
      if (!okMessage) { contactForm.message.focus(); return; }

      if (window.AZRE_MOTION && window.AZRE_MOTION.formSwap) {
        window.AZRE_MOTION.formSwap(contactForm, contactSuccess, function () { contactSuccess.focus(); });
      } else {
        contactForm.hidden = true;
        contactSuccess.hidden = false;
        contactSuccess.focus();
      }
    });
  }
})();
