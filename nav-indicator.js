/*!
 * Haidri Studio – Animated hand-drawn navigation indicator
 * One shared file. No dependencies. No changes to your nav markup.
 *
 * Usage: <script src="/path/to/nav-indicator.js" defer></script>
 * Optional: add data-nav-indicator to your <nav> (or its <ul>) to target it explicitly.
 * Colour: set --nav-indicator-color in your CSS (defaults to the link's own text colour).
 */
(function () {
  'use strict';

  var CFG = {
    navSelectors: ['[data-nav-indicator]', 'header nav', '.navbar', '.nav', 'nav'],
   linkSelector: '.nav-links > li > a',
    activeSelectors: ['[aria-current="page"]', '.active', '.is-active', '.current', '.current-menu-item > a'],
    padX: 18,          // horizontal breathing room (px)
    padY: 7,           // vertical breathing room (px)
    strokeWidth: 1.4,
    moveMs: 650,
    drawMs: 900,
    storageKey: 'haidri-nav-last'
  };

  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function findNav() {
    for (var i = 0; i < CFG.navSelectors.length; i++) {
      var el = document.querySelector(CFG.navSelectors[i]);
      if (el && el.querySelectorAll(CFG.linkSelector).length >= 2) return el;
    }
    return null;
  }

  function fileOf(href) {
    try {
      var u = new URL(href, location.href);
      if (u.origin !== location.origin) return null;
      var p = u.pathname.replace(/\/+$/, '');
      var f = p.split('/').pop().replace(/\.(html?|php)$/i, '').toLowerCase();
      return f === '' || f === 'index' || f === 'home' ? 'home' : f;
    } catch (e) { return null; }
  }

  function injectStyles() {
    if (document.getElementById('nav-indicator-styles')) return;
    var s = document.createElement('style');
    s.id = 'nav-indicator-styles';
    s.textContent =
      '.nav-indicator{position:absolute;left:0;top:0;pointer-events:none;overflow:visible;z-index:0;' +
      'opacity:0;color:var(--nav-indicator-color,currentColor);' +
      'transition:transform ' + CFG.moveMs + 'ms cubic-bezier(.65,0,.2,1),' +
      'width ' + CFG.moveMs + 'ms cubic-bezier(.65,0,.2,1),' +
      'height ' + CFG.moveMs + 'ms cubic-bezier(.65,0,.2,1),opacity .3s ease;will-change:transform,width,height}' +
      '.nav-indicator.is-ready{opacity:1}' +
      '.nav-indicator.is-instant{transition:none}' +
      '.nav-indicator path{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;' +
      'vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:0}' +
      '.nav-indicator.is-drawing path{animation:nav-indicator-draw ' + CFG.drawMs + 'ms cubic-bezier(.5,0,.2,1) both}' +
      '@keyframes nav-indicator-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}' +
      '@media (prefers-reduced-motion:reduce){.nav-indicator{transition:none}.nav-indicator.is-drawing path{animation:none}}' +
      /* Mobile / touch: slightly thicker, tap-friendly oval that simply marks the active item */
      '@media (hover:none),(max-width:768px){.nav-indicator path{stroke-width:' + (CFG.strokeWidth + 0.4) + 'px}}';
    document.head.appendChild(s);
  }

  function buildSvg() {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'nav-indicator');
    svg.setAttribute('viewBox', '0 0 200 80');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(NS, 'path');
    // Slightly irregular, overlapping start/end like a real pen stroke
    path.setAttribute('d',
  'M12 47 C6 22,54 6,104 7 C156 8,197 20,193 42 C190 64,146 74,98 73 ' +
  'C52 72,7 62,11 35 C13 27,20 22,30 18');
    path.setAttribute('pathLength', '1');
    path.setAttribute('stroke-width', CFG.strokeWidth);
    svg.appendChild(path);
    return svg;
  }

  ready(function () {
    var nav = findNav();
    if (!nav) { console.warn('[nav-indicator] No navigation found.'); return; }

    injectStyles();

    var links = Array.prototype.slice.call(nav.querySelectorAll(CFG.linkSelector))
      .filter(function (a) { return a.getAttribute('href').charAt(0) !== '#' || a.textContent.trim(); });

    if (getComputedStyle(nav).position === 'static') nav.style.position = 'relative';

    var svg = buildSvg();
    nav.insertBefore(svg, nav.firstChild);

    var active = null;
    var hovered = null;

    function detectActive() {
      var found = null;
      CFG.activeSelectors.some(function (sel) {
        var el = nav.querySelector(sel);
        if (!el) return false;
        found = el.tagName === 'A' ? el : el.querySelector('a');
        return !!found;
      });
      if (found) return found;
      var here = fileOf(location.href);
      for (var i = 0; i < links.length; i++) {
        if (fileOf(links[i].href) === here) return links[i];
      }
      return null;
    }

    function setActive(link) {
      active = link;
      links.forEach(function (a) {
        if (a === link) a.setAttribute('aria-current', 'page');
        else if (a.getAttribute('aria-current') === 'page') a.removeAttribute('aria-current');
      });
    }

    function place(link, instant) {
      if (!link) { svg.classList.remove('is-ready'); return; }
      var lr = link.getBoundingClientRect();
      if (!lr.width || !lr.height) { svg.classList.remove('is-ready'); return; } // hidden (e.g. collapsed mobile menu)
      var nr = nav.getBoundingClientRect();
      var w = lr.width + CFG.padX * 2;
      var h = lr.height + CFG.padY * 2;
      var x = lr.left - nr.left - nav.clientLeft - CFG.padX;
      var y = lr.top - nr.top - nav.clientTop - CFG.padY;
      if (instant) svg.classList.add('is-instant');
      svg.style.width = w + 'px';
      svg.style.height = h + 'px';
      svg.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      svg.classList.add('is-ready');
      if (instant) { void svg.getBoundingClientRect(); svg.classList.remove('is-instant'); }
    }

    function redraw() {
      if (reduceMotion) return;
      svg.classList.remove('is-drawing');
      void svg.getBoundingClientRect();
      svg.classList.add('is-drawing');
    }

    function rest() { hovered = null; place(active); }

    // --- Initial state -----------------------------------------------------
    setActive(detectActive());
    var lastIdx = -1;
    try { lastIdx = parseInt(sessionStorage.getItem(CFG.storageKey), 10); } catch (e) {}
    var activeIdx = links.indexOf(active);

    if (active) {
      // If we arrived from another page, start at the previous item and glide over → continuity
      if (!reduceMotion && lastIdx >= 0 && lastIdx !== activeIdx && links[lastIdx]) {
        place(links[lastIdx], true);
        requestAnimationFrame(function () { requestAnimationFrame(function () { place(active); }); });
      } else {
        place(active, true);
        redraw(); // draw-in on first load
      }
    }

    // --- Hover / focus (desktop) ------------------------------------------
    links.forEach(function (a) {
      if (canHover) {
        a.addEventListener('pointerenter', function (e) {
          if (e.pointerType && e.pointerType !== 'mouse') return;
          hovered = a; place(a);
        });
      }
      a.addEventListener('focus', function () { hovered = a; place(a); });
      a.addEventListener('blur', function () { if (hovered === a) rest(); });
      a.addEventListener('click', function () {
        var idx = links.indexOf(a);
        try { sessionStorage.setItem(CFG.storageKey, String(idx)); } catch (e) {}
        // Same-page / anchor / SPA links: update immediately. Full page loads re-detect on arrival.
        setActive(a); hovered = null; place(a);
      });
    });
    if (canHover) nav.addEventListener('pointerleave', rest);

    // Remember where we were for the next page load
    window.addEventListener('pagehide', function () {
      try { sessionStorage.setItem(CFG.storageKey, String(links.indexOf(active))); } catch (e) {}
    });

    // --- Keep it fitted (resize, font load, menu open/close) ---------------
    function refit() { place(hovered || active, true); }
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(refit, 80); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    window.addEventListener('load', refit);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { clearTimeout(t); t = setTimeout(refit, 30); });
      links.forEach(function (a) { ro.observe(a); });
      ro.observe(nav);
    }
    // Back/forward cache restore
    window.addEventListener('pageshow', function (e) { if (e.persisted) { setActive(detectActive()); refit(); } });
  });
})();