# Genesys Cloud Messenger - Route Control Demo

## 1. Objetivo del Proyecto
Este proyecto es una maqueta estática diseñada para demostrar la integración del SDK de **Genesys Cloud Messenger** y el control selectivo de su visibilidad basándose en la ruta interna (URL) del navegador.

El objetivo funcional clave a demostrar es:
* **Ruta `/` (Inicio):** Muestra el launcher del chat de Genesys.
* **Ruta `/nosotros`:** Oculta el launcher.
* **Ruta `/contacto`:** Oculta el launcher.
* **Cualquier otra ruta no permitida:** Oculta el launcher de forma segura sin lanzar errores del SDK.

---

## 2. Parámetros de Infraestructura VPS
Para el despliegue de esta maqueta, se definen los siguientes parámetros:

* **Directorio de despliegue en VPS:** `/srv/apps/genesys-messenger-route-demo`
* **Puertos expuestos (Públicos):** `80` (HTTP) y `443` (HTTPS)
* **Contenedor Web:** `genesys-messenger-route-demo` (Nginx interno)
* **Contenedor SSL Proxy:** `caddy-ssl-proxy` (Caddy)
* **Dominio de prueba:** `test-kranon.sky-nets.com.mx`

---

## 3. Comandos de Despliegue en VPS
Una vez configurado el repositorio en el servidor VPS, ejecute los siguientes comandos para actualizar el código y recrear el contenedor:

```bash
# Navegar al directorio de la aplicación
cd /srv/apps/genesys-messenger-route-demo

# Traer últimos cambios de la rama principal
git pull origin main

# Ejecutar el script de despliegue
bash deploy.sh
```

---

## 4. Comandos de Validación
Use estos comandos desde la consola del VPS para asegurar que el contenedor está levantado y responde correctamente en las distintas rutas:

```bash
# 1. Comprobar el estado de los contenedores
docker compose ps

# 2. Revisar los logs de Caddy para verificar la obtención del certificado SSL
docker logs -f caddy-ssl-proxy

# 3. Revisar los logs del servidor web interno
docker logs -f genesys-messenger-route-demo

# 4. Validar respuestas HTTP locales de Nginx interno
curl -I http://127.0.0.1:18088  # Si estuviera mapeado (actualmente expuesto sólo internamente)
```

---

## 5. SSL y HTTPS Automáticos (Caddy)
El contenedor de **Caddy** se encarga de todo el proceso de enrutamiento y cifrado. Cuando se ejecuta `docker compose up -d`:
1. Caddy detecta que el dominio configurado es `test-kranon.sky-nets.com.mx`.
2. Realiza el protocolo ACME con **Let's Encrypt** o **ZeroSSL**.
3. Descarga el certificado SSL e instala HTTPS en el puerto `443`.
4. Configura redirecciones automáticas de HTTP (`80`) a HTTPS (`443`).
5. Renueva los certificados automáticamente cuando están próximos a vencer.

> [!IMPORTANT]
> **DNS Prerrequisito:** Para que Caddy pueda generar el certificado SSL con éxito, el registro DNS de tipo `A` para `test-kranon.sky-nets.com.mx` debe estar apuntando a la dirección IP pública del VPS *antes* de levantar los contenedores.

---

## 6. Configuración Recomendada en Genesys Cloud
Para evitar que el launcher nativo aparezca brevemente durante la inicialización de páginas no autorizadas (flickering), se debe realizar el siguiente ajuste en el panel de Genesys Cloud:

1. Ingrese a **Admin > Message Deployments**.
2. Seleccione su despliegue activo.
3. Configure la opción de visibilidad del launcher como:
   `Launcher Visibility = "Hide until triggered by business logic"` (Ocultar hasta que sea activado por lógica de negocio).
4. Guarde y publique los cambios.
5. **Importante (CORS):** Agregue `https://test-kranon.sky-nets.com.mx` a la lista de **Allowed Domains** en esta misma pantalla de configuración.

---

## 7. Seguridad y Buenas Prácticas
* **Aislamiento de Puertos:** Ningún puerto del contenedor Nginx de la web (`genesys-messenger-route-demo`) se expone directamente a la red del VPS. Todo el tráfico entrante del host pasa obligatoriamente por el proxy de Caddy.
* **Sin Herramientas en Host:** Al estar Caddy y Nginx en contenedores aislados, no necesitas instalar Certbot ni servidores web en el sistema operativo del VPS, lo que mantiene el servidor limpio y seguro.

---

## 8. ¿Cómo adaptar esto a Single Page Applications (SPA) y Frameworks?
Si el cliente migra este código a un framework de componentes (React, Vue, Angular, Svelte), la lógica de negocio se adapta de la siguiente manera:

### Concepto General
En lugar de reevaluar la ruta solo al cargar el DOM, el framework debe reaccionar a los cambios de ruta generados por su Router interno (React Router, Vue Router, Angular Router, etc.).

### Ejemplo en React (con React Router v6)
```jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ALLOWED_PATHS = ['/'];

// Utility to check session state
const wasShownInSession = () => sessionStorage.getItem("genesys_launcher_shown") === "true";
const setSessionState = (shown) => sessionStorage.setItem("genesys_launcher_shown", shown ? "true" : "false");

export default function GenesysRouteController() {
  const location = useLocation();

  useEffect(() => {
    const applyVisibility = () => {
      if (!window.Genesys) return;

      const isAllowed = ALLOWED_PATHS.includes(location.pathname);
      const wasShown = wasShownInSession();
      
      if (isAllowed) {
        window.Genesys("command", "Launcher.show", {});
        setSessionState(true);
      } else if (wasShown) {
        window.Genesys("command", "Launcher.hide", {});
        window.Genesys("command", "Messenger.close", {});
        setSessionState(false);
      }
    };

    if (window.Genesys) {
      applyVisibility();
    } else {
      window.Genesys && window.Genesys("subscribe", "Messenger.ready", applyVisibility);
    }
  }, [location.pathname]);

  return null;
}
```
