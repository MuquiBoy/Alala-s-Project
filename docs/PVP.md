# PvP 0.7.0

Un proceso Node sirve cliente y WebSocket desde el mismo origen. POST /api/rooms genera una invitación aleatoria; /duel admite dos plazas. Cada sala tiene un mundo Rapier aislado, dos CombatRuntime y la biblioteca global de ataques existente.

El servidor avanza a 60 Hz y transmite estados a 20 Hz. Valida entradas, limita mensajes, deduplica solicitudes y resuelve salud, recargas, calor, proyectiles, contactos de Embestida, muerte y revancha. El cliente interpola posiciones y aplica animación; la cámara responde localmente. Los estados visuales y contadores de impactos proceden del servidor. El cliente no determina la salud del rival.

La voz se reconoce en cada navegador. Sólo se transmite identificador de habilidad y solicitud. No se envían audio ni transcripciones al servidor PvP. El token de reconexión permanece en sessionStorage de esa pestaña y no forma parte del enlace de invitación.

## Flujo

Crear/invitar → dos conexiones → selección de Avatar 01 → ambos confirman → configuración de voz y entrada → combate → victoria/empate → ambos solicitan revancha. Esc detiene el control propio, sin pausar al rival. La desconexión congela la sala. La pestaña intenta recuperar su plaza; si falla, recargar permite reintentarlo mientras exista la sala. Una pestaña sin token no ocupa una plaza reservada.

El catálogo y las definiciones de criatura están separados del protocolo y del combate. La primera entrega admite únicamente Avatar 01. Ampliar el roster requiere añadir definición, recursos, opción visible y validación del identificador en el servidor; no reescribir WebSocket ni las habilidades compartidas.

La arena, barrera, unidades de 1 m y movimientos se reutilizan. Los enemigos de práctica se excluyen únicamente de PvP. El menú conserva acceso al modo individual.

## Ejecución

pnpm build genera dist/ y server-dist/server.mjs. pnpm start inicia ambos desde el mismo servidor. PORT (o ALALAS_PORT) controla el puerto; HOST predetermina 127.0.0.1. Un alojamiento público necesita HOST=0.0.0.0, el puerto de la plataforma y HTTPS/WSS. /__alalas/status informa la versión y disponibilidad de PvP.

GitHub se verificó antes del despliegue. El [Blueprint](https://dashboard.render.com/blueprint/exs-dbk074942hec73e8e080) ya sirve [el juego público](https://alalas-project.onrender.com) en plan Free. Usa Node 24, dependencias fijadas por pnpm-lock, preparación del modelo oficial de voz, PORT de Render, HOST=0.0.0.0 y health check. No requiere base de datos, disco persistente ni segundo servicio. Render proporciona HTTPS/WSS.

Los rechazos de sala se transmiten como mensajes explícitos antes de cerrar WebSocket: un proxy puede perder un cierre enviado inmediatamente durante la apertura. El cliente limita además la espera de bienvenida a 15 s. Para ejecutar la prueba contra el servicio público, define ALALAS_TEST_URL=https://alalas-project.onrender.com y ejecuta pnpm exec playwright test tests/pvp.e2e.ts. Se crean salas temporales de prueba; no se usa un micrófono real.

## Pruebas y límites

pvp.test.ts prueba la simulación real: selección y entrada, movimiento, colisiones, Lanzallamas contra Blindaje, Ráfaga y oclusión, daño único y empuje de Embestida, desconexión, victoria y revancha. pvp.e2e.ts prueba dos contextos Chrome independientes: invitación, confirmación, orden vocal simulada y daño observado en ambos; también tercero rechazado e invitación inválida. Se conserva la suite individual.

No incluye predicción local, cuentas, antitrampas competitivo ni certificación de carga. La conexión de dos navegadores no sustituye la prueba de experiencia con dos personas y micrófonos físicos.
