/**
 * Snippet oficial de Genesys Cloud Messenger.
 *
 * Este bloque carga de manera asíncrona el SDK de Genesys y registra el deploymentId.
 *
 * Nota importante para el desarrollo e implementación:
 * - El deploymentId no es un secreto de backend. Es una clave pública que vive en el navegador.
 * - Si el cliente usa otro entorno o deployment de Genesys, debe reemplazar deploymentId.
 * - La restricción por dominios autorizados se configura directamente en el panel de Genesys Cloud.
 * - La restricción por ruta interna (URL) se controla en app.js.
 */
(function (g, e, n, es, ys) {
  g["_genesysJs"] = e;
  g[e] = g[e] || function () {
    (g[e].q = g[e].q || []).push(arguments);
  };
  g[e].t = 1 * new Date();
  g[e].c = es;
  ys = document.createElement("script");
  ys.async = 1;
  ys.src = n;
  ys.charset = "utf-8";
  document.head.appendChild(ys);
})(window, "Genesys", "https://apps.mypurecloud.com/genesys-bootstrap/genesys.min.js", {
  environment: "prod",
  deploymentId: "b6f9fa59-e9d1-4aaa-a352-194d2ca533bc"
});
