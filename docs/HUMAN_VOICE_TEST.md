# Prueba local del jugador

Este procedimiento se realiza con tu voz y micrófono. Los ensayos anteriores usan voz sintética y no sustituyen esta evaluación.

## Primera sesión

1. Abre JUGAR.cmd y la dirección local en Chrome/Edge. Si el equipo tiene dificultades gráficas, prueba http://127.0.0.1:4178/?quality=low: reduce resolución y sombras, conservando combate y voz.
2. Configura voz, elige Vosk local y modo Preciso. Acepta voluntariamente el micrófono. Espera a “Escuchando”.
3. Entra en la arena de 50 × 50 m, camina con WASD y apunta a uno de los cuatro enemigos magenta. Di “Lanzallamas”. La emisión sigue la mirada; apunta algo hacia abajo para calentar casillas. El suelo naranja sigue peligroso durante unos 4 segundos desde su última exposición. La pared debe bloquear llama y calor.
4. Di “Ráfaga” mirando a un enemigo visible. Deben salir 50 proyectiles sucesivos, sin atravesar la barrera. Cambiar la mirada afecta los siguientes disparos, no los que ya salieron. El verde salta y sirve para comprobar el apuntado aéreo.
5. Observa que un magenta no dispara antes de recibir daño. Después de golpearlo, debe responder con ráfagas de tres proyectiles; cada uno causa 8 puntos normales. Di “Blindaje” para reducir cada impacto a 2. El diagnóstico indica quién disparó y el daño aplicado.
6. Di “Embestida” mirando hacia el horizonte y golpea a un enemigo. Durante la preparación de 2 segundos puedes orientar el ratón. El tanque de 500 kg debe causarle 30 puntos de daño, empujarlo varios metros si no hay pared cercana y frenarse parcialmente. Deben verse y oírse señales breves del impacto. Repite tras la recarga mirando hacia arriba: un choque ascendente puede elevarlo. Al caer desde al menos 1 m, debe sonar un golpe grave distinto del paso y notarse una sacudida de cámara más marcada. Un dash terrestre no debe producir ese golpe de caída. El verde permite ensayar una intercepción aérea. Un giro de escape no debe invertirse por asistencia.
7. Esc pausa y cierra el micrófono. Reanuda para seguir. Reiniciar posición prepara otro ensayo y restaura enemigos, proyectiles, integridad y casillas calientes.

## Calibración etiquetada

Abre Diagnóstico con la partida en pausa. Activa la voz, selecciona una habilidad y pulsa Tomar muestra. Pronuncia una expresión válida una vez y espera el resultado antes de iniciar la siguiente muestra.

Realiza cinco repeticiones por habilidad: voz normal, más suave y más rápida, manteniendo un volumen cómodo. Después selecciona Conversación / ninguna habilidad y prueba:

- No uses lanzallamas.
- Creo que las llamas son bonitas.
- Cómo funciona la embestida.
- Blindaje y embestida.

Aquí no se ejecutan ataques. El registro puntúa intención esperada frente a transcripción interpretada. Una transcripción recurrente de tu pronunciación puede añadirse como alias breve sólo después de confirmarla. No guardes una frase ambigua o de conversación como alias.

Descarga el informe JSON. Marca Incluir transcripciones únicamente si quieres conservar el texto reconocido en tu archivo. No se guarda audio. El perfil de alias queda en el navegador y puede borrarse desde el diagnóstico.

## Qué revisar

- Órdenes correctas / muestras positivas, por habilidad y por voz.
- Órdenes ignoradas y tiempos agotados.
- Conversación que activaría una habilidad: falsos positivos entre muestras negativas.
- Errores al pronunciar órdenes consecutivas, incluso durante recargas.
- Tiempo observado de reconocimiento frente a transcripción→activación lógica.
- Movimiento y mirada durante la escucha, efectos y errores del reconocedor.

La calibración de vocabulario no modifica el modelo acústico. Una prueba con una sola persona no demuestra compatibilidad con todas las voces. Para comparar una modificación conserva una sesión de evaluación separada de las muestras usadas para elegir alias.

## Si la voz no funciona

Revisa el estado mostrado, micrófono, permiso del sitio y dirección localhost/HTTPS. Si falla Vosk, prueba Web Speech tras leer su aviso de procesamiento externo. Si falla Web Speech, detén y reactiva; no se garantiza escucha continua. La partida debe seguir disponible aunque la voz falle.

Para aislar la prueba de Blindaje también puedes activar Ensayo de daño: una baliza fija aplica 12 puntos de proyectil cada 3 segundos con visión directa; protegida, la criatura recibe 3. Está inicialmente apagada.

## Sesión de rol: ataque, respuesta y urgencia

Conserva el mismo micrófono y distancia para comparar. Realiza primero una sesión con auriculares. Prueba “Ahora usa lanzallamas”, “Ataca con lanzallamas”, “Ataca, ahora con llamas”, “Contraataca usando lanzallamas”, “Contraataca con llamas”, “Escupe llamas” y “Responde con fuego”. Haz una pasada con voz normal, otra rápida y otra con la energía que usarías en un PvP. No necesitas forzar la garganta: un grito no debe cambiar potencia, duración ni daño.

Después prueba “Llamas, llamas”, “Lanzallamas, lanzallamas” y “Lanza llamas, lanza llamas”. Cada intervención debe producir una sola solicitud. Haz una pausa clara y repite la orden para comprobar que una intervención posterior se procesa como nueva y que el ejecutor decide según el estado del ataque.

Añade como muestras negativas: “No quiero usar lanzallamas”, “¿Puedo usar lanzallamas?”, “Estoy probando si reconoce lanzallamas”, “El ataque se llama lanzallamas”, “Usar”, “Ataca con” y “No ataques”. Registra aciertos, órdenes ignoradas, habilidades incorrectas, tiempos agotados y falsos positivos. No añadas los ejemplos negativos como alias.

En combate, recorre el área mientras apuntas y repite una orden durante la emisión: no debe reiniciarse ni superponerse otro bucle. Cuando termine la emisión, las partículas y el sonido deben extinguirse y comenzar la recarga. Al volver a estar disponible debe aceptar otra intervención.

Camina, frena, empuja contra una pared y prepara Embestida. Los pasos deben seguir apoyos reales y espaciarse al reducir velocidad. Revisa sus graves, repetición y volumen frente al fuego. Desactiva Sensación de peso si no quieres movimiento adicional de cámara.

Repite órdenes mientras caminas y suena Lanzallamas, primero con auriculares y después con altavoces. Guarda por separado las condiciones y resultados. Así se comprueba interferencia real, que el flujo sintético no mide. No es necesario grabar audio.
