# HUD neutral — 2 de noviembre de 2026

La vista principal mantiene el canvas FPS. La columna lateral ordena retrato 2D, identidad, integridad, estado y telemetría, cuatro habilidades por voz y cámara de tercera persona del mismo esqueleto animado. Las habilidades muestran disponibilidad, duración y recarga; su descripción permanece en el título de cada tarjeta. No son botones de ataque.

El retrato es un módulo DOM independiente de WebGL, con estado sincronizado con la sesión y una cara geométrica de reserva. `Hud.setPortrait(source)` permite incorporar posteriormente una imagen animada (APNG, WebP o GIF); restaura la reserva si la carga falla. No usa una cámara ni solicita vídeo.

Se conserva MinimapView, su canvas, construcción y liberación. Su sección está oculta y el bucle omite dibujarla mientras permanezca oculta. La cámara de tercera persona conserva su límite de actualización y renderiza el mismo avatar de la escena.

Paleta base: grafito, gris azulado y texto claro. Ámbar se reserva para habilidades activas. En pantallas estrechas la columna pasa debajo de la vista FPS para conservar controles legibles.

Las habilidades incluyen símbolos SVG propios (llama, proyectiles, escudo y avance). Su estado activo enciende símbolo, nombre y las cuatro esquinas con un acento ámbar; la recarga atenúa el símbolo. Integridad tiene símbolo, cifra y barra. Tipografía técnica condensada con alternativas locales, sin depender de fuentes descargadas.

Verificación: compilación cliente/servidor correcta. Suite de navegador: 13 casos aprobados y una expectativa antigua del minimapa actualizada; su repetición focalizada pasó. Tras los símbolos y esquinas, pasaron de nuevo el caso de voz/movimiento y los dos escenarios PvP (combate, salud, resultado y revancha, sala llena e invitación inválida). Las transcripciones son simuladas y Chrome se ejecutó sin ventanas, silenciado.
