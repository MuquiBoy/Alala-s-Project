# Avatar 01: presencia pesada

Se reutiliza el cuadrúpedo geométrico actual. El perfil identity de src/config/creatures.ts controla zancada, volumen relativo, asentamiento del cuerpo y respuesta de cámara. Embestida cuenta además con una señal de choque contra enemigos y otra de aterrizaje tras un salto amplio.

## Recursos utilizados

Se eligió [Monster footsteps on gravel de AudioPapkin](https://freesound.org/people/AudioPapkin/sounds/712066/), publicado como CC0. La descarga pública usada es la vista previa MP3 de alta calidad, no el WAV original que requiere cuenta. Está identificada y registrada por hash.

Se extrajeron cuatro apoyos distintos, bajando su tono, suavizando grava aguda, reforzando graves y añadiendo un resonador breve original. Una cuantización moderada de 12 bits aporta grano retro. Cada archivo dura entre 0.567 y 0.593 s, mono PCM16 a 22050 Hz. El nuevo `heavy-landing.wav` combina dos de esas muestras CC0 ralentizadas con resonancia grave y una breve cola de grava sintetizadas para esta demo. Se regenera con `scripts/prepare_heavy_landing.py`, sin dependencias externas. No se usaron sonidos de Greymon, Digimon ni series comerciales.

También se revisaron Kenney Impact Sounds y otras pisadas de Freesound. Se descartó Monster Footsteps 01 de juansua990 porque su página contiene comentarios que cuestionan su procedencia. No se incorporó ese archivo. La fuente seleccionada y su licencia están en public/audio/creatures/avatar-01/manifest.json y LICENSE.txt.

## Comportamiento

- HeavyGait mide desplazamiento horizontal real en suelo; no reproduce un bucle al mantener una tecla. No genera pasos al estar quieto, bloquearse contra una pared, caer, teletransportarse o hacer dash.
- La primera pisada llega tras recorrer 0.38 m; después, cada 2.2 m. A la velocidad de marcha completa son aproximadamente 1.3 apoyos por segundo.
- FootstepAudio alterna cuatro muestras, tono y fuerza de manera acotada. Máximo tres voces simultáneas. La pausa desvanece los pasos en curso y no deja nuevas pisadas programadas.
- HeavyGaitView anima las patas diagonales y asienta cuerpo/cabeza sobre la geometría disponible. Los cambios son visuales y no alteran colisiones ni emisión de ataques.
- Un paso tiene una respuesta vertical de cámara muy leve (hasta 6 mm). Un choque de Embestida usa una señal de 6 cm y el aterrizaje de una carga elevada una oscilación amortiguada de hasta 15 cm con una pequeña inclinación visual. Puede desactivarse en Configurar voz; nunca modifica la puntería lógica.
- ChargeLanding permanece atento al aterrizaje incluso después de que termine la habilidad. Exige caída vertical real de al menos 1 m, produce un solo evento y no confunde un dash terrestre con una caída. LandingAudio usa la misma salida de juego y el mismo volumen general; la pausa desvanece el sonido.
- Todos los efectos comparten una salida de juego y un volumen. La captura de voz conserva su propio contexto de entrada y no se desconecta por reproducir efectos.

Las sugerencias futuras se presentan en el chat, por petición expresa del usuario. No hay globos de texto dentro del juego. Polvo al pisar y resoplidos siguen siendo propuestas sin implementar.

## Evaluación del jugador

Escucha con auriculares y después con altavoces, a volumen cómodo. Compara caminar, frenar, una Embestida horizontal contra un enemigo y una Embestida elevada que aterrice. Revisa si el golpe al suelo suena más contundente que un paso sin tapar la orden de voz siguiente.

Se verifican duración, muestras, niveles y eventos de audio en segundo plano, sin reproducción audible. La semejanza estética con la referencia japonesa y la interferencia real sobre un micrófono requieren esta escucha manual.
