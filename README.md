# ALALA'S CHILDREN — Demo de combate por voz 0.5.2

Un avatar cuadrúpedo provisional, control FPS y cuatro habilidades activadas exclusivamente por voz. La nueva arena mide 50 × 50 m y contiene 2500 casillas de 1 × 1 m. Integra el modelo SKP y el PNG nuevos del usuario.

## Jugar localmente

1. Abre el acceso directo **ALALA'S CHILDREN** del escritorio, o **JUGAR.cmd** dentro de esta carpeta.
2. Abre http://127.0.0.1:4178 en **Chrome o Edge de escritorio**.
3. Pulsa **Configurar voz**. El motor predeterminado es **Vosk español local**, incluido en la demo.
4. Lee el aviso, marca el consentimiento y pulsa **Activar micrófono**. Espera a “Escuchando”. La primera carga del modelo puede tardar.
5. Pulsa **Entrar en la arena**. Muévete con WASD, apunta con el ratón y pronuncia una habilidad.
6. **Esc** pausa, libera el cursor y detiene el micrófono. Reanudar vuelve a iniciar la voz si la autorizaste en esta sesión.
7. **Reiniciar posición** restablece también integridad, enemigos, proyectiles y recargas.

El personaje ya está preseleccionado: **Avatar 01 / tanque cuadrúpedo**, de 3 m de ancho, 3 m de largo y 2,5 m de alto. Su modelo es geométrico y provisional. El jugador puede caminar y apuntar mientras habla. Durante la preparación de Embestida avanza al 15% de su velocidad normal.

El lanzador necesita Node.js >=22.12; detecta también el runtime incluido con Codex en este equipo. La compilación está en **dist/**. No necesitas instalar dependencias para usarla. Cerrar la consola del servidor o pulsar Ctrl+C detiene la demo. No abras el HTML mediante file://.

La lista completa de órdenes de Lanzallamas está en **COMANDOS-LANZALLAMAS.txt**: 64 expresiones de combate organizadas por intención y sin combinaciones de cortesía. Se genera desde el vocabulario real al compilar.

## Identidad y sonido

Lanzallamas tiene ignición, emisión de cinco segundos y extinción gradual, con fuego angular retro y tres capas sonoras locales. Acepta órdenes como “Escupe fuego”, “Ahora usa lanzallamas”, “Ataca con lanzallamas”, “Contraataca con llamas” y repeticiones urgentes como “Llamas, llamas”. Conserva deduplicación, rechazo de conversación y recargas.

Avatar 01 usa pasos graves de criatura adaptados desde un recurso CC0 de AudioPapkin: cuatro variantes sincronizadas con distancia real. Una Embestida elevada que termina en una caída de al menos 1 m reproduce un golpe grave distinto y sacude la cámara más que un paso; un dash a ras del suelo no activa ese sonido. La geometría actual anima patas y apoyo del cuerpo. En **Configurar voz** puedes ajustar el volumen general de efectos y desactivar la respuesta de cámara.

Prueba inicialmente con auriculares. No se detiene la escucha por reproducir efectos; el eco de altavoces debe evaluarse con tu micrófono. Fuentes, cambios y límites en **docs/FLAMETHROWER_UPDATE.md** y **docs/AVATAR_IDENTITY.md**.

## Moveset 2.0 configurable

| Di | Habilidad | Efecto | Recarga |
| --- | --- | --- | --- |
| Lanzallamas / ataca con llamas / contraataca con fuego | Lanzallamas | Cono de 10 m durante 5 s; calienta casillas de 1 m durante 4 s desde su última exposición. Fuego y calor respetan obstáculos | 5 s después de terminar |
| Ráfaga / dispara / ataca con ráfaga | Ráfaga | 50 proyectiles en 5 s, alcance de 18 m y asistencia inicial limitada dentro de 15°; cada proyectil conserva su dirección | 4 s después de terminar |
| Blindaje / protégete / activa blindaje | Blindaje | Durante 5 s reduce un 75% el daño térmico y de proyectiles; una sola reducción aunque coincidan categorías | 15 s después de terminar |
| Embestida / embiste / carga | Embestida | Prepara 2 s; la mirada al final determina dash o salto físico de hasta 10 m. Un contacto real causa 30 puntos de daño y transmite impulso según ambas masas y la velocidad relativa | 9 s después del impulso |

El campo tiene **cuatro enemigos magenta M01–M04** y un **blanco verde G01**, todos de 100 kg y 100 puntos de salud. M01 está quieto; M02 y M04 se mueven lateralmente; M03 patrulla. G01 salta y se desplaza, sin disparar. Los magenta permanecen pasivos hasta recibir daño; después disparan ráfagas de tres proyectiles, separados por 0,6 s, con 3 s entre ráfagas. Cada proyectil alcanza hasta 15 m, viaja a 8 m/s y causa 8 puntos de daño, o 2 con Blindaje. Necesitan línea de visión para disparar. La baliza antigua **Ensayo de daño** sigue disponible como prueba opcional y está desactivada inicialmente.

La unidad universal de masa es **1,00 = 50 kg**. Avatar 01 pesa 500 kg (10 unidades), cinco veces la masa de cada enemigo (2 unidades). La masa afecta la respuesta a choques e impulsos; **no reduce el daño de proyectiles**. Embestida toma la velocidad relativa y ambas masas en el contacto real. Un choque horizontal empuja; si la carga asciende, el contacto puede añadir un lanzamiento vertical limitado. Cada enemigo recibe como máximo un impacto completo por activación. En una prueba controlada sin pared cercana, el blanco de 100 kg retrocedió aproximadamente 5 m. El impacto tiene una señal visual y sonora breve. Los personajes desplazados conservan gravedad, chocan con paredes y recuperan su patrón de movimiento al estabilizarse. Consulta el panel **Diagnóstico** para inspeccionar velocidades, impulso y respuesta enemiga.

Los ataques compartidos están en **src/attacks/**, con un registro único y una carpeta por ataque. Cada criatura elige identificadores en **src/config/creatures.ts**. Coraza, Embestida anterior y Pulso térmico permanecen en la biblioteca global para futuros personajes, sin estar equipados en Avatar 01. Guía de reutilización: **docs/ATTACKS.md**. No hay ataques asignados al teclado, ratón o botones de la experiencia normal.

## Reconocimiento y calibración

**Vosk local:** modelo acústico español preentrenado, inferencia en un trabajador WebAssembly y captura con AudioWorklet. Audio procesado en este equipo, sin grabación ni servidor propio. Incluye vocabulario de órdenes, negaciones, conversación y una categoría desconocida para reducir la conversión accidental de conversación en ataques.

**Web Speech:** alternativa del navegador, con disponibilidad variable. Puede enviar audio a su proveedor y requerir Internet. La opción Web Speech sólo local es experimental, exige un paquete de idioma compatible y nunca cambia a remoto automáticamente.

El modo **Preciso** espera el resultado final. **Ágil experimental** sólo puede adelantar un parcial estable al recibir un final de habla, con confianza suficiente; puede adelantarse a una revisión posterior. Vosk entrega confianza en resultados finales, por lo que conserva el comportamiento preciso.

En **Diagnóstico** puedes:

- Ver transcripción, habilidad, rechazo, contadores y tiempos observables.
- Tomar muestras etiquetadas, con la partida en pausa y el combate deshabilitado.
- Añadir un alias breve y confirmado, por ejemplo una transcripción recurrente de tu pronunciación. Se guarda en el navegador; no modifica pesos acústicos.
- Descargar un JSON local. Las transcripciones se excluyen inicialmente; puedes incluirlas expresamente.
- Probar frases negativas y de conversación además de las órdenes.

Di una orden por intervención. Una frase con dos habilidades se rechaza como ambigua. Las repeticiones enfáticas de Lanzallamas dentro de la misma intervención producen una sola solicitud, incluso si el navegador las entrega en dos resultados. El sistema bloquea órdenes como “no uses lanzallamas”, preguntas, fórmulas de cortesía y frases descriptivas que transcriba correctamente. Si el reconocedor omite una palabra negativa, el intérprete no puede reconstruirla con certeza: usa la calibración para evaluar ese riesgo con tu micrófono.

## Qué se comprobó

- **163 pruebas automatizadas** de fundamentos, intérprete, voz, combate y entrenamiento.
- **11 pruebas de navegador**, Chrome aislado sin ventana: controles, colisiones, aterrizaje con sonido, Ráfaga visible, moveset mediante transcripciones simuladas, duplicados, errores y movimiento simultáneo.
- El informe de **22 muestras de audio sintético** documenta el vocabulario de la versión anterior. Ráfaga y Blindaje aún requieren evaluación acústica con tu voz; consulta **docs/SYNTHETIC_AUDIO_REPORT.json** y **docs/VERIFICATION.md**.

Las voces humanas, sus acentos, ruido de habitación y micrófonos aún requieren tus pruebas. Los resultados sintéticos no son una tasa de precisión general. Procedimiento en **docs/HUMAN_VOICE_TEST.md**; evidencia y límites en **docs/VERIFICATION.md**.

## Desarrollo y pruebas

Requisitos de desarrollo: Node.js >=22.12, pnpm 11.25.0 y Python 3 para preparar el modelo desde una copia nueva del repositorio.

    npm install --global pnpm@11.25.0
    pnpm install --frozen-lockfile
    pnpm model:prepare
    pnpm dev

El modelo oficial se descarga desde Alpha Cephei. No se entrena una red acústica nueva. La preparación conserva los pesos y genera el archivo tar.gz que espera Vosk-Browser.

    pnpm test
    pnpm build
    pnpm test:browser

El build prepara reproduciblemente el runtime Vosk local. En una distribución compilada puede restaurar el modelo desde dist/ antes de reconstruir.

Para repetir el banco de audio en este Windows con la voz instalada Microsoft Helena:

    powershell -NoProfile -File scripts/generate_synthetic_voice.ps1
    pnpm start
    pnpm test:voice-audio

La generación escribe WAV sintéticos en work/ y no reproduce sonido. La prueba usa Chrome headless y sustituye únicamente la entrada de micrófono por un flujo de audio sintético; ejecuta Vosk y el juego reales. No controla tus ventanas ni usa un micrófono físico. Los WAV de este ensayo y sus resultados deben identificarse siempre como sintéticos.

## Código y recursos

| Carpeta | Contenido |
| --- | --- |
| src/config | Arena, criaturas y fachada de compatibilidad de habilidades |
| src/attacks | Registro, definiciones, gramática y comportamientos compartidos; efectos de Lanzallamas |
| src/audio, src/identity | Salida de sonido común, pisadas, cadencia y animación de peso |
| src/input, src/camera, src/physics | WASD, mirada, cámaras FPS y física Rapier |
| src/voice | Adaptadores Vosk/Web Speech, intérprete, perfil, calibración y canal de órdenes |
| src/combat | Ejecutor por identificadores, daño, IA reactiva, proyectiles, oclusión e impulso |
| src/render, src/ui | Efectos económicos, cámara cenital de la misma escena e interfaz |
| public/models/arenas, public/textures/arenas | Arena de entrenamiento v2: SKP original, OBJ convertido y PNG; recursos anteriores conservados |
| public/models/speech/vosk-es | Modelo local y manifiesto de procedencia |
| public/audio | Audio de efectos CC0, organizado por ataque y criatura, con licencias y manifiestos |
| public/vendor/vosk | Runtime preparado, licencia y avisos de terceros |
| tests, benchmarks | Pruebas y evaluación breve de motores |
| docs | Arquitectura, investigación, informes y protocolo humano |

Los originales del usuario permanecen intactos. El nuevo SKP se conservó en `public/models/arenas/training-02/source/`; su malla se convirtió a `arena-v2.obj` y se centró sin abrir SketchUp. `python scripts/convert_training_skp.py` regenera el OBJ en un equipo con SketchUpAPI.dll instalado. La barrera central ocupa 22 × 2 × 5 m. El PNG de 1000 × 1000 px cubre los 50 × 50 m: 20 px/m. La física usa cajas coherentes con el modelo; cambiar el arte en el futuro requiere actualizar también esas cajas.

## GitHub y motor

Hay un repositorio Git local y CI para pruebas y compilación. Aún no hay remoto configurado. El modelo y el runtime generado se excluyen de Git; los scripts permiten reconstruirlos. La autorización del usuario permite publicar cuando sea necesario; esta validación local no requirió una publicación.

Godot 4.6.1 se evaluó en modo sin ventana. La decisión de esta entrega es conservar Three.js: hay una ruta de voz local funcional y las mediciones parciales no demuestran una ventaja del juego completo al migrar. Lee **docs/ENGINE_EVALUATION.md**.

No hay PvP online, progresión, historia o diseños finales en esta versión. Los cinco enemigos de entrenamiento permiten probar ataques, defensa y colisiones antes del futuro PvP. Esta versión requiere tu nueva prueba de voz y jugabilidad como jugador.
