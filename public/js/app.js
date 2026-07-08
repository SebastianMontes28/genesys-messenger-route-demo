/**
 * Kranon CX - Controlador de Visibilidad de Genesys Cloud Messenger
 * 
 * ==============================================================================
 * PUNTO CLAVE DE INTEGRACIÓN (Control de Rutas con Estado de Sesión):
 * 1. En la página de inicio ('/'), mostramos el widget (Launcher.show) y marcamos
 *    en sessionStorage que fue mostrado ('genesys_launcher_shown' = true).
 * 2. Si el usuario cambia a una página restringida ('/nosotros' o '/contacto'),
 *    verificamos sessionStorage. Si estuvo activo previamente, ejecutamos
 *    Launcher.hide y Messenger.close, desactivando la sesión activa.
 * 3. Si el usuario ingresa DIRECTAMENTE a una página restringida sin pasar por inicio,
 *    NO ejecutamos ningún comando de ocultamiento. Esto previene que el SDK de Genesys
 *    falle al tratar de ocultar un elemento de interfaz que nunca fue renderizado.
 * ==============================================================================
 */
(function () {
  const ALLOWED_MESSENGER_PATHS = ["/"];

  function normalizePath(pathname) {
    if (!pathname) return "/";
    const lower = pathname.toLowerCase();
    
    // Soporte para pruebas locales (file://) y rutas Nginx limpias
    if (lower.includes("nosotros")) return "/nosotros";
    if (lower.includes("contacto")) return "/contacto";
    if (lower.includes("index.html") || lower === "/" || lower.endsWith("/")) {
      return "/";
    }
    
    let normalized = pathname;
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  function shouldShowMessenger() {
    const currentPath = normalizePath(window.location.pathname);
    return ALLOWED_MESSENGER_PATHS.includes(currentPath);
  }

  function wasLauncherShownInSession() {
    return sessionStorage.getItem("genesys_launcher_shown") === "true";
  }

  function setLauncherSessionState(shown) {
    sessionStorage.setItem("genesys_launcher_shown", shown ? "true" : "false");
  }

  // ==============================================================================
  // EJECUCIÓN INMEDIATA (Encolado síncrono para prevenir parpadeo en recargas)
  // ==============================================================================
  const currentPathSync = normalizePath(window.location.pathname);
  const isAllowedSync = shouldShowMessenger();
  const wasShownSync = wasLauncherShownInSession();

  if (window.Genesys) {
    if (isAllowedSync) {
      window.Genesys("command", "Launcher.show", {});
      setLauncherSessionState(true);
    } else if (wasShownSync) {
      window.Genesys("command", "Launcher.hide", {});
      window.Genesys("command", "Messenger.close", {});
      setLauncherSessionState(false);
    }
    // Si no está permitido y no estuvo visible, no hacemos nada para evitar fallas
  }

  function logMessage(level, text) {
    const time = new Date().toLocaleTimeString();
    const formattedText = `[${time}] ${text}`;
    console.log(`[Genesys Demo] ${level.toUpperCase()}: ${text}`);

    const consoleContainer = document.getElementById("virtual-console");
    if (consoleContainer) {
      const logLine = document.createElement("div");
      logLine.className = "log-entry";
      
      const badge = document.createElement("span");
      badge.className = `log-tag tag-${level}`;
      badge.textContent = `[${level.toUpperCase()}]`;
      
      logLine.appendChild(badge);
      logLine.appendChild(document.createTextNode(` ${formattedText}`));
      consoleContainer.appendChild(logLine);
      consoleContainer.scrollTop = consoleContainer.scrollHeight;
    }
  }

  function updateVisualStatus(path, allowed, wasShown) {
    const routeDisplay = document.getElementById("route-display");
    const statusDisplay = document.getElementById("status-display");
    
    if (routeDisplay) {
      routeDisplay.textContent = path;
    }

    if (statusDisplay) {
      statusDisplay.className = "status-badge";
      if (allowed) {
        statusDisplay.textContent = "Habilitado - Visible";
        statusDisplay.classList.add("badge-allowed");
      } else if (wasShown) {
        statusDisplay.textContent = "Oculto - Comando Enviado";
        statusDisplay.classList.add("badge-blocked");
      } else {
        statusDisplay.textContent = "Oculto - Directo (Sin Comando)";
        statusDisplay.classList.add("badge-neutral");
      }
    }
  }

  function applyGenesysMessengerVisibility() {
    const currentPath = normalizePath(window.location.pathname);
    const allowed = shouldShowMessenger();
    const wasShown = wasLauncherShownInSession();

    updateVisualStatus(currentPath, allowed, wasShown);

    if (!window.Genesys) {
      logMessage("warn", "Genesys SDK no está disponible.");
      return;
    }

    if (allowed) {
      logMessage("info", "Ruta permitida. Mostrando widget (Launcher.show).");
      window.Genesys("command", "Launcher.show", {});
      setLauncherSessionState(true);
    } else if (wasShown) {
      logMessage("info", "Ruta no permitida (venía de Inicio). Ocultando widget (Launcher.hide & Messenger.close).");
      window.Genesys("command", "Launcher.hide", {});
      window.Genesys("command", "Messenger.close", {});
      setLauncherSessionState(false);
    } else {
      logMessage("info", "Ruta no permitida (ingreso directo). Omitiendo comandos para prevenir fallos del SDK.");
    }
  }

  function initGenesysRouteControl() {
    logMessage("info", "Inicializando controlador de visibilidad...");
    
    const currentPath = normalizePath(window.location.pathname);
    const allowed = shouldShowMessenger();
    const wasShown = wasLauncherShownInSession();
    
    updateVisualStatus(currentPath, allowed, wasShown);

    if (!window.Genesys) {
      logMessage("warn", "Objeto window.Genesys no encontrado.");
      return;
    }

    if (allowed) {
      logMessage("info", "Registro síncrono: Launcher.show encolado.");
    } else if (wasShown) {
      logMessage("info", "Registro síncrono: Launcher.hide y Messenger.close encolados.");
    } else {
      logMessage("info", "Registro síncrono: Ninguna acción requerida.");
    }

    window.Genesys("subscribe", "Messenger.ready", function () {
      logMessage("info", "Evento 'Messenger.ready' recibido. Aplicando visibilidad.");
      applyGenesysMessengerVisibility();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGenesysRouteControl);
  } else {
    initGenesysRouteControl();
  }
})();
