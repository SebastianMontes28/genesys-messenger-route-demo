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
   * Utilidades para consultar y guardar el estado del Launcher en sessionStorage.
   * Esto nos permite persistir la información de si el launcher fue mostrado 
   * a lo largo de la navegación en la pestaña activa.
   */
  function wasLauncherShownInSession() {
    return sessionStorage.getItem("genesys_launcher_shown") === "true";
  }

  function setLauncherSessionState(shown) {
    sessionStorage.setItem("genesys_launcher_shown", shown ? "true" : "false");
  }

  // ==============================================================================
  // CONTROL DE ENCOLADO INMEDIATO ESTADO (sessionStorage)
  // ==============================================================================
  // Este bloque de control se ejecuta síncronamente al cargar el script.
  // Evita llamadas innecesarias a Launcher.hide si el usuario entra directo a /nosotros.
  // ==============================================================================
  const currentPathSync = normalizePath(window.location.pathname);
  const isAllowedSync = shouldShowMessenger();
  const wasShownSync = wasLauncherShownInSession();

  if (window.Genesys) {
    if (isAllowedSync) {
      window.Genesys("command", "Launcher.show", {});
      setLauncherSessionState(true);
    } else if (wasShownSync) {
      // Solo encolamos ocultamiento si estuvo visible previamente en la sesión
      window.Genesys("command", "Launcher.hide", {});
      window.Genesys("command", "Messenger.close", {});
      setLauncherSessionState(false);
    }
    // Si no está permitido y no estuvo visible, no hacemos nada (evita errores del SDK)
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
  function updateVisualStatus(path, allowed, wasShown) {
    const routeDisplay = document.getElementById("route-display");
    const statusDisplay = document.getElementById("status-display");
    const statusContainer = document.getElementById("status-container");

    if (routeDisplay) {
      routeDisplay.textContent = path;
    }

    if (statusDisplay) {
      if (allowed) {
        statusDisplay.textContent = "Habilitado (Visible)";
      } else if (wasShown) {
        statusDisplay.textContent = "Oculto (Acción Launcher.hide)";
      } else {
        statusDisplay.textContent = "Oculto (Directo - Sin Comando)";
      }
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
    const wasShown = wasLauncherShownInSession();

    // Actualizar estado en pantalla
    updateVisualStatus(currentPath, allowed, wasShown);

    if (!window.Genesys) {
      logMessage("warn", "Genesys SDK no está disponible para ejecutar comandos.");
      return;
    }

    if (allowed) {
      logMessage("info", `Ruta "${currentPath}" permitida. Ejecutando Launcher.show...`);
      window.Genesys("command", "Launcher.show", {});
      setLauncherSessionState(true);
    } else if (wasShown) {
      logMessage("info", `Ruta "${currentPath}" NO permitida y launcher visible previamente. Ejecutando Launcher.hide y Messenger.close...`);
      window.Genesys("command", "Launcher.hide", {});
      window.Genesys("command", "Messenger.close", {});
      setLauncherSessionState(false);
    } else {
      logMessage("info", `Ruta "${currentPath}" NO permitida. Acceso directo: omitiendo comandos para evitar fallas del SDK.`);
    }
  }

  /**
   * Suscribe el controlador al evento de inicialización de Genesys.
   */
  function initGenesysRouteControl() {
    logMessage("info", "Inicializando controlador de visibilidad...");
    
    const currentPath = normalizePath(window.location.pathname);
    const allowed = shouldShowMessenger();
    const wasShown = wasLauncherShownInSession();
    
    updateVisualStatus(currentPath, allowed, wasShown);

    if (!window.Genesys) {
      logMessage("warn", "No se encontró el objeto global window.Genesys. Asegúrese de que genesys-loader.js cargó correctamente.");
      return;
    }

    // Reportamos las acciones preventivas tomadas al cargar
    if (allowed) {
      logMessage("info", `Medida Preventiva: Encolado síncrono de Launcher.show aplicado.`);
    } else if (wasShown) {
      logMessage("info", `Medida Preventiva: Encolado síncrono de Launcher.hide y Messenger.close aplicado (Usuario venía de Inicio).`);
    } else {
      logMessage("info", `Medida Preventiva: Ninguna acción requerida (Usuario ingresó directo a ruta restringida).`);
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

    logMessage("info", `Monitoreo listo. Ruta actual normalizada: "${currentPath}" (Permitida: ${allowed}, Visible Previo: ${wasShown})`);
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGenesysRouteControl);
  } else {
    initGenesysRouteControl();
  }
})();
