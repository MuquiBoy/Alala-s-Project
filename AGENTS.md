# ALALA'S CHILDREN — reglas del proyecto

## Encargo vigente

La versión 0.5.2 usa la nueva arena de 50 × 50 m, cuatro enemigos magenta y un blanco verde, masas configurables, impulso de Embestida y proyectiles reactivos. Embestida causa 30 puntos por contacto válido y produce un empuje físico perceptible; daño y masa siguen separados. Una caída real tras la Embestida produce sonido grave y sacudida visual; el dash terrestre no. El usuario quiere sugerencias en el chat, sin globos ni ayudas emergentes nuevas en el juego. Conservar Three.js, la distribución general de interfaz y VoiceAttack. No migrar a Godot en este hito. La evaluación del micrófono real y la sensación de juego le corresponde al usuario. Las pruebas del agente son en segundo plano y silenciadas.

La versión 0.7.0 integra el GLB animado del usuario, marcha de 0,8 m/s, pisadas biomecánicas y PvP privado 1 vs. 1 autorizado. Conservar siempre el entrenamiento. GitHub principal: MuquiBoy/Alala-s-Project; verificar la copia remota antes de desplegar Render. Los jugadores sólo necesitan navegador; Node y Python son requisitos del desarrollador/servidor.

## Fundamentos

- Three.js + TypeScript estricto + Vite; Rapier para física. Conservar la base funcional.
- Una unidad espacial es un metro; Y vertical, frente -Z. Arena 50 × 50 m centrada, 2500 módulos de 1 × 1 m, suelo Y=0 y un único collider de base.
- WASD mueve y el ratón apunta. **Las habilidades del juego normal se activan exclusivamente mediante voz. Nunca añadir ataques a teclas o botones.**
- Avatar 01 es provisional, cuadrúpedo y mecánico. No se necesitan modelos finales ni seis personajes para el hito actual.
- Moveset equipado: Lanzallamas, Ráfaga, Blindaje y Embestida. Mantener el resto de ataques en la biblioteca global.
- Escala de masa: 1,00 = 50 kg; Avatar 01 = 500 kg y cada blanco = 100 kg. La masa afecta impulsos; Blindaje y salud son independientes.
- Cuatro magenta disparan sólo después de daño recibido; el verde salta sin disparar. Conservar controladores separados de las entidades físicas.
- Embestida y empujes usan el controlador físico. Daño y efectos respetan obstáculos.
- Ataques en src/attacks/<id>, una sola entrada en el registro. Las criaturas sólo eligen identificadores. Estado mutable por actor, nunca global entre personajes.
- Audio con una salida de juego compartida y captura independiente; no silenciar el micrófono por efectos. Pasos sólo por desplazamiento real en suelo.
- Datos, modelo visible, movimiento, reconocimiento, interpretación y ejecutor permanecen separados.
- No añadir lore, progresión, inventarios, rankings ni matchmaking. El PvP privado está autorizado: autoridad de simulación en servidor, voz local por jugador y habilidades compartidas.

## Voz y datos

- Vosk local es un modelo preentrenado de español; la adaptación es de vocabulario y canal de comandos. No afirmar que se entrenaron pesos con voces humanas.
- Captura mediante AudioWorklet, clasificación en Worker, silencio descartado con pre-roll. Nunca grabar audio o enviarlo a un servidor propio.
- Web Speech puede usar el servicio del navegador: avisar antes de solicitar permiso. Sólo local debe fallar explícitamente si no está disponible; no cambiar silenciosamente a remoto.
- Predeterminar resultados finales; el modo temprano exige final de habla, estabilidad y confianza. Documentar los riesgos de revisiones tardías.
- Interpretar frases completas; rechazar preguntas, negaciones, descripciones y ambigüedades. No usar coincidencia difusa permisiva.
- Deduplicar por sesión y resultado, conservar nuevas órdenes independientes y validar recargas en el ejecutor.
- No crear marcas temporales inexistentes. Diferenciar reconocimiento observado, activación lógica y presentación gráfica.
- Calibración pausada nunca ejecuta habilidades. Guardar alias sólo con confirmación del usuario. Exportar datos localmente y excluir transcripciones inicialmente.
- Preservar licencias Apache y avisos de Vosk; el runtime se genera con scripts/prepare_vosk_runtime.mjs.

## Recursos y evaluación

Geometría en public/models y texturas en public/textures, una carpeta por recurso/arena. Conservar originales OBJ/MTL/PNG y SKP de la arena v2. El PNG cubre toda la arena, no se repite completo por baldosa. Preferir GLB para nuevos modelos.

**No interferir con el escritorio del usuario:** pruebas en Chrome headless, un trabajador, perfil aislado. Godot sólo --headless. No abrir ni activar ventanas del usuario.

Después de cambios de lógica ejecutar pnpm test; tras código o tipos, pnpm build; tras UI/controles, pnpm test:browser. Para reconocimiento acústico ejecutar el banco sintético si cambió el canal local. Nunca presentar estos resultados como validación de voces humanas.

Mantener README, informes y manifiestos actualizados. No subir node_modules, dist, modelos generados, WAV de trabajo, secretos ni perfiles personales. La publicación requiere un destino definido. Evaluar una migración con alcance comparable; una prueba headless sin gráficos no determina FPS de juego.
