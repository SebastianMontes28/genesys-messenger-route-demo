/**
 * Genesys Cloud Messenger - Route Visibility Controller
 *
 * Este script administra la visibilidad del launcher de Genesys según la ruta activa.
 * 
 * Lógica funcional:
 * 1. Mantiene una lista de rutas permitidas (ej. ["/"]).
 * 2. Normaliza la ruta del navegador para evitar discrepancias (por ejemplo, "/" vs "/nosotros/").
 * 3. Se suscribe al evento 'Messenger.ready' del SDK oficial de Genesys.
 * 4. Ejecuta los comandos "Launcher.show" o "Launcher.hide" según corresponda.
 */
(function () {
  /**
   * Lista de rutas (pathnames) internas permitidas para mostrar el launcher.
   * - En este demo, únicamente se permite en la página principal ('/').
   * - Si desea habilitar Genesys Messenger en /contacto, agréguelo aquí: ["/", "/contacto"]
   */
  const ALLOWED_MESSENGER_PATHS = ["/"];

  /**
   * Normaliza el pathname para evitar problemas con trailing slashes (/nosotros/),
   * extensiones (.html), y soportar pruebas directas de archivos locales (file://).
   *
   * @param {string} pathname Ruta actual extraída de window.location.pathname
   * @returns {string} Ruta normalizada en formato limpio (ej: "/", "/nosotros", "/contacto")
   */
  function normalizePath(pathname) {
    if (!pathname) return "/";
    
    const lower = pathname.toLowerCase();
    
    // Soporte para apertura directa de archivos locales (.html) en navegador
    if (lower.includes("nosotros")) {
      return "/nosotros";
    }
    if (lower.includes("contacto")) {
      return "/contacto";
    }
    if (lower.includes("index.html") || lower === "/" || lower.endsWith("/")) {
      return "/";
    }
    
    // Normalización estándar de URL limpia
    let normalized = pathname;
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  /**
   * Verifica si la ruta actual está permitida dentro del arreglo ALLOWED_MESSENGER_PATHS.
   */
  function shouldShowMessenger() {
    const currentPath = normalizePath(window.location.pathname);
    return ALLOWED_MESSENGER_PATHS.includes(currentPath);
  }

  /**
   * Registra los mensajes en la consola del navegador y los escribe 
   * en la consola virtual de la interfaz gráfica si existe en la pantalla.
   */
  function logMessage(level, text) {
    const time = new Date().toLocaleTimeString();
    const formattedText = `[${time}] [Genesys Demo] ${text}`;
    
    if (level === "info") {
      console.info(formattedText);
    } else if (level === "warn") {
      console.warn(formattedText);
    } else {
      console.log(formattedText);
    }

    // Actualiza el visor de logs en la UI (consola virtual)
    const consoleContainer = document.getElementById("virtual-console");
    if (consoleContainer) {
      const logLine = document.createElement("div");
      logLine.className = `log-line log-${level}`;
      
      const badge = document.createElement("span");
      badge.className = `log-badge badge-${level}`;
      badge.textContent = level.toUpperCase();
      
      const messageText = document.createTextNode(` ${text}`);
      
      logLine.appendChild(badge);
      logLine.appendChild(messageText);
      consoleContainer.appendChild(logLine);
      
      // Auto-scroll al final del log
      consoleContainer.scrollTop = consoleContainer.scrollHeight;
    }
  }

  /**
   * Actualiza el panel informativo de la maqueta con el estado de la ruta y visibilidad.
   */
  function updateVisualStatus(path, allowed) {
    const routeDisplay = document.getElementById("route-display");
    const statusDisplay = document.getElementById("status-display");
    const statusContainer = document.getElementById("status-container");

    if (routeDisplay) {
      routeDisplay.textContent = path;
    }

    if (statusDisplay) {
      statusDisplay.textContent = allowed 
        ? "Habilitado (Visible)" 
        : "Oculto (No Permitido)";
    }

    if (statusContainer) {
      statusContainer.className = allowed ? "status-allowed" : "status-blocked";
    }
  }

  /**
   * Decide y aplica los comandos correspondientes de Genesys Cloud Messenger.
   */
  function applyGenesysMessengerVisibility() {
    const currentPath = normalizePath(window.location.pathname);
    const allowed = shouldShowMessenger();

    // Actualizar estado en pantalla
    updateVisualStatus(currentPath, allowed);

    if (!window.Genesys) {
      logMessage("warn", "Genesys SDK no está disponible para ejecutar comandos.");
      return;
    }

    if (allowed) {
      logMessage("info", `Ruta "${currentPath}" permitida. Ejecutando Launcher.show...`);
      // Comando para mostrar el launcher oficial de Genesys
      window.Genesys("command", "Launcher.show", {});
    } else {
      logMessage("info", `Ruta "${currentPath}" NO permitida. Ejecutando Launcher.hide...`);
      // Comando para ocultar el launcher oficial de Genesys
      window.Genesys("command", "Launcher.hide", {});
    }
  }

  /**
   * Suscribe el controlador al evento de inicialización de Genesys.
   */
  function initGenesysRouteControl() {
    logMessage("info", "Inicializando controlador de visibilidad...");
    
    const currentPath = normalizePath(window.location.pathname);
    const allowed = shouldShowMessenger();
    updateVisualStatus(currentPath, allowed);

    if (!window.Genesys) {
      logMessage("warn", "No se encontró el objeto global window.Genesys. Asegúrese de que genesys-loader.js cargó correctamente.");
      return;
    }

    /**
     * IMPORTANTE:
     * Nos suscribimos al evento 'Messenger.ready' antes de llamar a show/hide.
     * Esto evita errores de comandos tempranos antes de la carga del iframe oficial de Genesys.
     */
    window.Genesys("subscribe", "Messenger.ready", function () {
      logMessage("info", "Recibido evento 'Messenger.ready' desde el SDK de Genesys.");
      applyGenesysMessengerVisibility();
    });

    logMessage("info", `Monitoreo listo. Ruta actual normalizada: "${currentPath}" (Permitida: ${allowed})`);
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGenesysRouteControl);
  } else {
    initGenesysRouteControl();
  }
})();
