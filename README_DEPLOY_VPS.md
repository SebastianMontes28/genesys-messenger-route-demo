# Genesys Cloud Messenger - Route Control Demo

## 1. Objetivo del Proyecto
Este proyecto es una maqueta estática (HTML, CSS y JS plano) diseñada para demostrar la integración del SDK de **Genesys Cloud Messenger** y el control selectivo de su visibilidad basándose en la ruta interna (URL) del navegador.

El objetivo funcional clave a demostrar es:
* **Ruta `/` (Inicio):** Muestra el launcher del chat de Genesys.
* **Ruta `/nosotros`:** Oculta el launcher.
* **Ruta `/contacto`:** Oculta el launcher.
* **Cualquier otra ruta no permitida:** Oculta el launcher.

---

## 2. Parámetros de Infraestructura VPS
Para el despliegue de esta maqueta en el entorno de producción, se definen los siguientes parámetros:

* **Directorio de despliegue en VPS:** `/srv/apps/genesys-messenger-route-demo`
* **Puerto local (bind a localhost):** `127.0.0.1:18088`
* **Nombre de contenedor Docker:** `genesys-messenger-route-demo`
* **Dominio de prueba:** `test-kranon.sky-nets.com.mx`

---

## 3. Comandos de Despliegue en VPS
Una vez configurado el repositorio en el servidor VPS, ejecute los siguientes comandos para actualizar el código y recrear el contenedor:

```bash
# Navegar al directorio de la aplicación
cd /srv/apps/genesys-messenger-route-demo

# Traer últimos cambios de la rama principal
git pull origin main

# Ejecutar el script idempotente de despliegue
bash deploy.sh
```

---

## 4. Comandos de Validación
Use estos comandos desde la consola del VPS para asegurar que el contenedor está levantado y responde correctamente en las distintas rutas:

```bash
# 1. Comprobar el estado del contenedor
docker compose ps

# 2. Revisar los logs en tiempo real
docker logs -f genesys-messenger-route-demo

# 3. Validar respuestas HTTP de Nginx interno (debe retornar HTTP 200)
curl -I http://127.0.0.1:18088
curl -I http://127.0.0.1:18088/nosotros
curl -I http://127.0.0.1:18088/contacto
```

---

## 5. Acceso Local desde Laptop (Túnel SSH)
Dado que el puerto del contenedor está enlazado únicamente a `127.0.0.1` (localhost) en el VPS por razones de seguridad, puede realizar pruebas locales en su navegador redirigiendo el puerto mediante un túnel SSH:

```bash
# Abra una terminal en su máquina local y ejecute:
ssh -L 18088:127.0.0.1:18088 deploy@IP_DEL_VPS
```

Una vez establecida la conexión, abra la siguiente URL en su navegador:
[http://localhost:18088](http://localhost:18088)

---

## 6. Configuración Recomendada en Genesys Cloud
Para evitar que el launcher nativo aparezca brevemente durante la inicialización de páginas no autorizadas (flickering), se debe realizar el siguiente ajuste en el panel de Genesys Cloud:

1. Ingrese a **Admin > Message Deployments**.
2. Seleccione su despliegue activo.
3. Configure la opción de visibilidad del launcher como:
   `Launcher Visibility = "Hide until triggered by business logic"` (Ocultar hasta que sea activado por lógica de negocio).
4. Guarde y publique los cambios.

Esta configuración instruye al SDK a permanecer invisible hasta que el archivo [app.js](file:///D:/Sebastian%20Enriquez/Documents/Proyectos/demo-message/genesys-messenger-route-demo/public/js/app.js) mande explícitamente el comando `Launcher.show`.

---

## 7. Configuración de Nginx en el Host (Reverse Proxy)
Para mapear el dominio de prueba (`test-kranon.sky-nets.com.mx`) al puerto local del contenedor, agregue el siguiente bloque de servidor en el Nginx del host del VPS (usualmente bajo `/etc/nginx/sites-available/`):

```nginx
server {
  listen 80;
  server_name test-kranon.sky-nets.com.mx;

  # Logs de acceso y error
  access_log /var/log/nginx/genesys_demo_access.log;
  error_log /var/log/nginx/genesys_demo_error.log;

  location / {
    proxy_pass http://127.0.0.1:18088;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

> [!IMPORTANT]
> **Terminación SSL:** Si desea habilitar HTTPS (altamente recomendado para producción ya que Genesys restringe por seguridad los widgets en HTTP), configure Certbot (Let's Encrypt) o el proxy de Cloudflare en este Nginx externo. El contenedor docker debe seguir respondiendo únicamente en HTTP por el puerto `18088`.

---

## 8. Seguridad y Buenas Prácticas
* **Sin Secretos en Frontend:** El `deploymentId` utilizado en [genesys-loader.js](file:///D:/Sebastian%20Enriquez/Documents/Proyectos/demo-message/genesys-messenger-route-demo/public/js/genesys-loader.js) es de dominio público y vive en el cliente. No representa un riesgo de seguridad en sí mismo, pero es importante que coincida exactamente con el de la cuenta autorizada.
* **Restricción de Dominios:** Recuerde registrar el dominio final (e.g. `test-kranon.sky-nets.com.mx`) en la lista de dominios autorizados dentro de Genesys Cloud Messenger. De lo contrario, Genesys bloqueará la conexión del iframe.
* **Aislamiento de Puertos:** Nunca exponga el puerto directamente en `0.0.0.0` en el archivo `docker-compose.yml`. El uso de `127.0.0.1:18088` asegura que solo peticiones procesadas por el reverse proxy (o túneles seguros) puedan acceder al contenedor.

---

## 9. ¿Cómo adaptar esto a Single Page Applications (SPA) y Frameworks?
Si el cliente migra este código a un framework de componentes (React, Vue, Angular, Svelte), la lógica de negocio se adapta de la siguiente manera:

### Concepto General
En lugar de reevaluar la ruta solo al cargar el DOM, el framework debe reaccionar a los cambios de ruta generados por su Router interno (React Router, Vue Router, Angular Router, etc.).

### Ejemplo en React (con React Router v6)
```jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ALLOWED_PATHS = ['/'];

export default function GenesysRouteController() {
  const location = useLocation();

  useEffect(() => {
    // Definimos función que evalúa la ruta
    const applyVisibility = () => {
      if (!window.Genesys) return;

      const isAllowed = ALLOWED_PATHS.includes(location.pathname);
      
      if (isAllowed) {
        window.Genesys("command", "Launcher.show", {});
      } else {
        window.Genesys("command", "Launcher.hide", {});
      }
    };

    // Si Genesys ya cargó
    if (window.Genesys) {
      applyVisibility();
    } else {
      // Si aún no carga, esperar el ready
      window.Genesys && window.Genesys("subscribe", "Messenger.ready", applyVisibility);
    }
  }, [location.pathname]);

  return null; // Componente lógico, no renderiza UI
}
```

### Ejemplo en Vue (con Vue Router)
```javascript
import { watch } from 'vue';
import { useRoute } from 'vue-router';

const ALLOWED_PATHS = ['/'];

export function setupGenesysRouteWatcher() {
  const route = useRoute();

  const applyVisibility = (path) => {
    if (!window.Genesys) return;
    
    const isAllowed = ALLOWED_PATHS.includes(path);
    if (isAllowed) {
      window.Genesys("command", "Launcher.show", {});
    } else {
      window.Genesys("command", "Launcher.hide", {});
    }
  };

  // Observa el cambio en la propiedad path de la ruta activa
  watch(() => route.path, (newPath) => {
    applyVisibility(newPath);
  }, { immediate: true });
}
```
