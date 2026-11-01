# Lanzallamas 0.3

Se conserva Three.js, la arena métrica, distribución de interfaz, avatar y mecánicas de Coraza, Embestida y Pulso. El cambio de duración de Lanzallamas es deliberado: emite 5 segundos del reloj de simulación; después comienzan 5 segundos de recarga. Repetir una orden durante emisión o recarga no reinicia el reloj.

## Presentación

La ignición sube durante 0.2 s. Se emiten fragmentos angulares amarillos, naranjas, rojos y unos pocos claros en un pool de 128 instancias como máximo. Cada fragmento viaja en el mundo desde el emisor, crece y pierde opacidad. El apuntado dirige las nuevas emisiones y permite continuar WASD. Al cortar el ataque dejan de nacer fragmentos y los existentes terminan en un máximo de 0.34 s de simulación.

El fuego usa una llamada de dibujo por cámara, sin luces dinámicas, bloom ni texturas. Se comprueban obstáculos y la envolvente exterior se mantiene dentro de 10 metros del origen y del emisor actual. El daño usa su propio cono analítico y línea de visión, nunca las partículas. Las partículas remanentes al girar o apagar son presentación: no dejan daño residual. La pausa congela el reloj y los efectos visuales.

El sonido se habilita mediante el clic de Entrar. Tres archivos locales cubren ignición, bucle y apagado. El bucle entra gradualmente, se desvanece en 0.28 s y se detiene; una pausa corta la salida sin modificar el código de captura. El volumen inicial es 35%, ajustable dentro de Configurar voz. No se agregan servicios ni dependencias de pago. Los auriculares son recomendables para evaluar reconocimiento mientras suena el juego.

## Frases y diagnóstico

La biblioteca contiene 64 expresiones agrupadas como llamada breve, activación, ataque, contraataque y urgencia. Incluye “Llamas”, “Utiliza lanzallamas”, “Escupe fuego”, “Ataca con lanzallamas”, “Contraataca usando lanzallamas”, “Responde con fuego”, “Llamas, llamas” y “Lanza llamas, lanza llamas”. No se buscan subcadenas ni semejanzas fonéticas permisivas.

Se rechazan negaciones, preguntas, descripciones, instrucciones incompletas y fórmulas con “por favor”. El intérprete puede colapsar repeticiones contiguas no enumeradas, pero no reordena libremente palabras ni usa coincidencia difusa. La canalización evita una segunda solicitud si el reconocedor divide una repetición de la misma intervención; otra intervención posterior sigue siendo una orden nueva. La gramática del reconocedor incluye contraejemplos y desconocidos para evitar restringirla sólo a ataques. Aun así, si la ASR pierde una negación, el intérprete no puede reconstruirla con certeza.

La captura solicita ganancia automática, reducción de ruido y cancelación de eco. Gritar, hablar rápido o cambiar la entonación no aumenta la potencia: esas diferencias se resuelven en la transcripción acústica, y las repeticiones urgentes incluidas ayudan a representar el furor del PvP. La comprobación con voces humanas sigue siendo necesaria.

El diagnóstico muestra transcripción original, normalización, alias/estructura, habilidad, validación y motivo, duración real de la interpretación, activación lógica observada y tiempos restantes de emisión/recarga. Exportar sin transcripciones excluye también normalización y alias coincidente. No se guarda audio.

La flexibilidad textual está verificada; no constituye una mejora medida de precisión humana. La evaluación acústica y gráfica se documenta en VERIFICATION.md.

## Audio: procedencia y selección

Se revisaron las páginas originales de:

- [Synthesized Fire Sound Effect, Spring Spring](https://opengameart.org/content/synthesized-fire-sound-effect): CC0. Se descargó y decodificó el MP3; es la fuente utilizada por su clasificación sintética y tamaño reducido.
- [Fire Staff Sound Effects, LEGIT Audio](https://opengameart.org/content/fire-staff-sound-effects): CC0. Se inspeccionaron los 25 WAV, duración, picos, RMS y espectro. Se descartaron para esta entrega: archivos largos de 96 kHz y picos marcados, sin necesidad de sumar otra fuente a la mezcla compacta.
- [Digital Audio, Kenney](https://kenney.nl/assets/digital-audio): la página indica CC0; la descarga obtenida no fue un ZIP válido. No se incorporó ningún archivo de ese paquete.

Los tres WAV finales derivan del MP3 de Spring Spring y de pequeños barridos electrónicos originales, con filtrado, eliminación de DC, saturación suave y envolventes. El bucle tiene cruce para que el empalme no salte entre valores inconexos. Son mono PCM16 a 22050 Hz; sus tres archivos suman aproximadamente 106 KB.

La procedencia, transformaciones, niveles y hashes están en public/audio/flamethrower/manifest.json. El script opcional scripts/prepare_flame_audio.py reproduce el procesamiento desde el PCM de trabajo con NumPy; no se necesita para construir o jugar, porque los WAV finales están incluidos.

La evaluación se hizo por forma de onda, espectro, niveles, decodificación y eventos Web Audio en Chrome silenciado. No se afirma escucha estética ni cancelación de eco comprobadas. La prueba de jugador debe revisar timbre, equilibrio y reconocimiento con altavoces frente a auriculares.
