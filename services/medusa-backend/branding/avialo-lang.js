/* Fuerza el idioma del panel admin a español ANTES de que cargue el bundle.
   Se carga como <script> clásico (bloqueante) en <head>, así corre antes del
   módulo diferido de Medusa y su detector de i18next ve español.

   El admin de Medusa usa un detector con clave de localStorage "lng" (orden
   [cookie, localStorage, header]) además del estándar "i18nextLng". Cubrimos
   TODAS las vías: cookies, ambas claves de localStorage y navigator. */
(function () {
  function set(storage, key, val) {
    try { storage.setItem(key, val); } catch (e) { /* ignore */ }
  }

  // localStorage (ambas claves usadas por Medusa / i18next).
  set(window.localStorage, "lng", "es");
  set(window.localStorage, "i18nextLng", "es");
  set(window.sessionStorage, "lng", "es");
  set(window.sessionStorage, "i18nextLng", "es");

  // Cookies (el detector las consulta primero).
  try {
    document.cookie = "lng=es; path=/";
    document.cookie = "i18next=es; path=/";
  } catch (e) { /* ignore */ }

  // navigator (último recurso si el detector lo usa).
  try {
    Object.defineProperty(navigator, "language", {
      get: function () { return "es"; },
      configurable: true,
    });
    Object.defineProperty(navigator, "languages", {
      get: function () { return ["es", "es-ES"]; },
      configurable: true,
    });
  } catch (e) { /* algunos navegadores no permiten redefinir; seguimos */ }
})();
