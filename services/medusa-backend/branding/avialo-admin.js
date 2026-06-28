/* Branding Avialo del panel admin de Medusa (se carga desde index.html).
   Sustituye el logo de Medusa por el de Avialo:
     - En las pantallas de AUTH (login, /reset-password, invite): heurística por cercanía al
       encabezado + primer <svg> "grande" (el logo del login NO comparte viewBox con el shell).
     - En el panel AUTENTICADO (sidebar/shell): el logotipo es el <svg> con viewBox "0 0 36 38"
       (los iconos de UI son 15x15), así que lo targeteamos por viewBox.
   También cambia "Medusa" → "Avialo" en encabezados y mantiene el título de la pestaña.
   El idioma español se fuerza en avialo-lang.js (antes del bundle). */
(function () {
  var LOGO_VIEWBOX = "0 0 36 38";

  // Sustituye un <svg> de logo por la imagen de Avialo (idempotente, conserva tamaño).
  function replaceSvgWithLogo(svg) {
    if (!svg || svg.dataset.avialoReplaced) return false;
    var rect = svg.getBoundingClientRect();
    var size = Math.round(rect.width || svg.clientWidth || 40);
    if (!size || size < 12) size = 40;
    var img = document.createElement("img");
    img.src = "/app/avialo-favicon.svg";
    img.alt = "Avialo";
    img.dataset.avialoReplaced = "1";
    img.style.width = size + "px";
    img.style.height = size + "px";
    img.style.objectFit = "contain";
    svg.replaceWith(img);
    return true;
  }

  // Logo cerca de un encabezado: subiendo por los ancestros, el primer hermano anterior con <svg>.
  function findLogoSvgNear(ref) {
    var node = ref;
    while (node && node !== document.body) {
      var sib = node.previousElementSibling;
      while (sib) {
        var svg = sib.matches && sib.matches("svg") ? sib : (sib.querySelector && sib.querySelector("svg"));
        if (svg) return svg;
        sib = sib.previousElementSibling;
      }
      node = node.parentElement;
    }
    return null;
  }

  // Primer <svg> razonablemente grande que no esté dentro de un botón/enlace/input (el logo
  // del login). Evita confundirlo con iconos pequeños (ojo de la contraseña, etc.).
  function findStandaloneAuthSvg() {
    var svgs = document.querySelectorAll("svg");
    for (var i = 0; i < svgs.length; i++) {
      var svg = svgs[i];
      if (svg.dataset.avialoReplaced) continue;
      if (svg.closest("button, a, input, [role='button']")) continue;
      var r = svg.getBoundingClientRect();
      if (r.width >= 24 && r.height >= 24) return svg;
    }
    return null;
  }

  function isAuthScreen() {
    var p = location.hash || location.pathname || "";
    return /login|reset-password|reset|invite|set-password/i.test(p);
  }

  // Nombre de marca en los encabezados ("Bienvenido a Medusa" → "...Avialo").
  function brandHeadings() {
    var heads = document.querySelectorAll("h1, h2, h3");
    for (var i = 0; i < heads.length; i++) {
      var text = heads[i].textContent || "";
      if (/Medusa/.test(text)) heads[i].textContent = text.replace(/Medusa/g, "Avialo");
    }
  }

  // Logo del shell autenticado (por viewBox, en cualquier ruta).
  function brandShellLogo() {
    var svgs = document.querySelectorAll('svg[viewBox="' + LOGO_VIEWBOX + '"]');
    for (var i = 0; i < svgs.length; i++) replaceSvgWithLogo(svgs[i]);
  }

  // Logo de las pantallas de auth (login/reset): cerca del encabezado, o el primer svg grande.
  function brandAuthLogo() {
    if (!isAuthScreen()) {
      // También cubrimos por contenido (por si la ruta no coincide pero hay encabezado de auth).
      var hasAuthHeading = false;
      var hs = document.querySelectorAll("h1, h2");
      for (var j = 0; j < hs.length; j++) {
        if (/Bienvenido|Welcome|Bienvenue|Avialo|Medusa|contrase|password|restablec|reset/i.test(hs[j].textContent || "")) {
          hasAuthHeading = true;
          break;
        }
      }
      if (!hasAuthHeading) return;
    }
    var heads = document.querySelectorAll("h1, h2");
    var matched = null;
    for (var i = 0; i < heads.length; i++) {
      if (/Bienvenido|Welcome|Bienvenue|Avialo|Medusa|contrase|password|restablec|reset/i.test(heads[i].textContent || "")) {
        matched = heads[i];
        break;
      }
    }
    var svg = matched ? findLogoSvgNear(matched) : null;
    if (!svg) svg = findStandaloneAuthSvg();
    if (svg) replaceSvgWithLogo(svg);
  }

  function brandTitle() {
    if (/Medusa/i.test(document.title)) {
      document.title = document.title.replace(/Medusa Admin|Medusa/gi, "Avialo");
    }
  }

  function applyAll() {
    brandShellLogo();
    brandAuthLogo();
    brandHeadings();
    brandTitle();
  }

  var titleEl = document.querySelector("title");
  if (titleEl) new MutationObserver(brandTitle).observe(titleEl, { childList: true });

  // SPA: reaplicamos ante cualquier cambio del DOM.
  new MutationObserver(applyAll).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  if (document.readyState !== "loading") applyAll();
  else document.addEventListener("DOMContentLoaded", applyAll);
})();
