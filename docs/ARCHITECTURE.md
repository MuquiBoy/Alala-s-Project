# Arquitectura 0.5.2 — campo de entrenamiento físico

## Flujo principal

Game.ts coordina módulos existentes y nuevos. La arena actual es de 50 × 50 m con 2500 casillas de 1 m, barrera de 22 × 2 × 5 m y control FPS. El tick fijo de 1/60 s prepara las traslaciones, ejecuta Rapier y aplica combate. El render interpola posiciones. El estado en pausa congela habilidades y detiene captura; los errores de voz no bloquean el movimiento.

La cámara cenital ortográfica observa la misma escena. Usa un segundo renderer de 192×192 sin sombras y refresco limitado a 10 Hz durante el juego; las vistas en pausa se limitan a 4 Hz para ahorrar CPU. El avatar propio usa una capa visible en minimapa y presentación, excluida de FPS.

## Canal de voz

1. SpeechPort abstrae transcripciones, final de habla y estados.
2. VoskRecognizer usa AudioWorklet de 1024 muestras, AudioContext de 16 kHz y Vosk/WASM en Worker. Conserva tres paquetes de pre-roll, estima un umbral de energía y sólo envía voz y cola de silencio al reconocedor. El final de segmento usa 320 ms de muestras capturadas, no tiempo entre frames. La confianza final procede de Vosk.
3. WebSpeechRecognizer encapsula continuous/interimResults, español, sesgo de frases cuando existe, permisos/errores y recuperación acotada. Un contador de época invalida resultados de sesiones abortadas.
4. CommandInterpreter normaliza tildes, mayúsculas, puntuación y espacios. Compara órdenes completas y alias explícitos; sólo colapsa repeticiones contiguas de hasta cuatro palabras. Negación, pregunta, cortesía, conversación o más de una habilidad producen rechazo.
5. VoicePipeline previsualiza parciales y confirma finales. El modo experimental exige parcial estable y evento de fin de habla; sin confianza conocida espera al definitivo. Deduplica por identificador y también por habilidad dentro de una misma intervención de voz, conservando nuevas órdenes de intervenciones posteriores.
6. AbilitySystem recibe únicamente identificadores. Valida propiedad, disponibilidad, estado y recarga. No conoce texto, micrófono o DOM.

PersonalProfile guarda hasta ocho alias confirmados por habilidad en localStorage. CalibrationSession puntúa muestras etiquetadas durante la pausa y no llama al combate. La escucha se reutiliza entre muestras en lugar de recrear el micrófono. No se conservan grabaciones.

## Combate y física

CombatRuntime controla integridad y cinco criaturas de práctica; instancia y compone los comportamientos de src/attacks/registry.ts según los identificadores de cada criatura. Cada fábrica tiene estado independiente por actor. La configuración, frases y lógica de cada ataque viven juntas; src/config/abilities.ts sólo reexporta el registro. Avatar 01 equipa Lanzallamas, Ráfaga, Blindaje y Embestida. Las tres habilidades sustituidas se conservan en el registro para otro avatar.

Lanzallamas aplica un volumen cónico de 10 m y línea de visión tanto al daño como a HeatField. HeatField divide el piso en 2500 casillas de 1 m; cada exposición renueva 4 s de calor, y una casilla ocupada causa una sola tasa de daño gradual. Ráfaga programa 50 lanzamientos a intervalos de 0,1 s. La dirección de cada proyectil queda fija al salir; la adquisición admite objetivos visibles dentro de 15° y una corrección inicial máxima de 12°. Blindaje multiplica una sola vez por 0,25 el daño térmico o de proyectil y deja intacto el ambiental o cuerpo a cuerpo. Embestida prepara 2 s a velocidad reducida y lee el apuntado al lanzar: la componente vertical provoca un salto bajo gravedad, mientras el desplazamiento horizontal atraviesa el controlador de colisiones. La corrección hacia rivales claramente apuntados está acotada; un rival cercano a una trayectoria de escape no la invierte.

WorldQueries implementa intersección rayo/cajas, oclusión y volumen de fuego con las mismas cajas estáticas de la arena. El frente visual del fuego y cada sector del anillo se recortan por obstáculos. El cuerpo del jugador usa un collider cúbico de 3 × 2,5 × 3 m; los enemigos usan cápsulas cinemáticas. El SKP original se conserva en `public/models/arenas/training-02/source/`; el OBJ centrado y el PNG completo se usan en ejecución.

La referencia universal es 1 unidad = 50 kg. `CreatureDefinition.massKg` es independiente del tamaño visual, salud y defensa: Avatar 01 tiene 500 kg; M01–M04 y G01 tienen 100 kg. Rapier KCC resuelve el barrido de colisiones y paredes; como sus cuerpos cinemáticos no transfieren impulso automáticamente, `CollisionImpulse.solveImpact` calcula J a partir de las dos masas, la velocidad relativa, la normal, restitución y `collisionTransfer`. La transferencia ahora usa el impulso completo calculado (`collisionTransfer = 1`), con restitución 0,08 y rozamiento de reacción 2,4/s; el límite horizontal de seguridad es 16 m/s. `CharacterMotor.applyImpulse` convierte J en cambio de velocidad. El contacto real del KCC activa la transferencia una sola vez por enemigo y Embestida. Para choques ascendentes, `ascendingContactLift` añade una componente vertical acotada al vector de transferencia; el ajuste al suelo se desactiva durante velocidades ascendentes para no absorber un lanzamiento pequeño. El daño de Embestida es **30 puntos fijos por blanco y activación** y se aplica por separado. Blindaje modifica sólo daño térmico o de proyectiles, no masa ni impulso. Un contacto válido genera un pulso visual y un sonido grave, además de una respuesta mínima de cámara desactivable.

`TrainingController` comparte `CharacterMotor` con el jugador. Los magenta empiezan pasivos; el daño registra el identificador del atacante y habilita represalias durante 8 s. Cada disparo apunta una vez, vuela en línea recta y respeta la oclusión. Sus secuencias de tres disparos no se duplican si Lanzallamas mantiene el daño. Una reacción física entra en recuperación para que la patrulla no anule inmediatamente el impulso. El verde salta y se mueve sin ataque. `EnemyProjectiles` usa barridos por segmento para evitar que un proyectil atraviese al jugador entre fotogramas. El panel Diagnóstico expone masas, estados, daño, velocidad e impulso.

CombatView delega el fuego a flamethrower/FlameView: pool fijo de hasta 128 partículas, una malla instanciada, movimiento en el mundo, tamaño/opacidad por edad, corte por obstáculos y extinción de 0.34 s. HeatView colorea las casillas activas con otra malla instanciada. BarrageView dibuja proyectiles e impactos. Conserva el escudo, la señal de carga y la tira heredada de 64 sectores del pulso. El daño no depende de las partículas. La geometría provisional se escala a 3 × 2,5 × 3 m y permanece reemplazable por GLB, sin vincular daño o voz al modelo.

## Modelo local y distribución

Modelo: vosk-model-small-es-0.42, Apache-2.0. El script Python descarga el ZIP oficial y lo empaqueta con directorios explícitos, permisos y orden deterministas. Conserva los pesos acústicos y registra hashes. La gramática en ejecución incluye órdenes, vocabulario negativo y desconocidos para reducir falsos positivos.

El runtime vosk-browser 0.0.8 se prepara desde npm. La adaptación pública documentada desactiva dos sincronizaciones de caché persistente del modelo: el archivo ya está en el servidor local y el modelo permanece en RAM durante la sesión. Se mantienen derechos y licencia; no cambia la inferencia o los pesos.

La implementación no depende del código comercial de VoiceAttack o de juegos. La investigación orientó las decisiones; Vosk es la dependencia abierta efectivamente reutilizada.

## Latencia y límites de evidencia

Se usa performance.now para eventos recibidos, identificación y activación lógica. El inicio de habla es un evento del navegador o una detección de energía de un paquete, no el instante físico exacto en que la persona empezó a pronunciar. Los valores ausentes son null.

El intervalo transcripción→activación lógica no incluye el tiempo del reconocimiento ni el primer píxel visible. El informe distingue ambos. Las pruebas de voz sintética ejercitan el modelo real y no certifican acentos o micrófonos humanos.

El volumen y la entonación pertenecen al reconocimiento acústico y no modifican la habilidad. La captura solicita control automático de ganancia, cancelación de eco y reducción de ruido; la biblioteca incluye repeticiones urgentes para sesgar Vosk y Web Speech hacia esas transcripciones. Una ASR que omite una negación puede producir una orden válida errónea. La gramática y la evaluación negativa reducen el riesgo, pero no lo eliminan. Evitar ampliar alias automáticamente a partir de errores no confirmados.

## Futuro

Tras la evaluación del jugador: ajustar umbrales/alias con evidencia etiquetada, ampliar el conjunto de voces y ruido, decidir entre iterar en web o migrar a Godot con una comparación gráfica equivalente. PvP requerirá servidor autoritativo y sincronización; no está implementado.

## Sonido e identidad

AudioOutput posee una sola salida de juego desbloqueada con el clic de Entrar y un volumen común. FlameAudio y FootstepAudio comparten esa salida; Vosk conserva su contexto independiente de captura. No se modifica la captura para reproducir sonido.

HeavyGait deriva apoyos de distancia horizontal real y contacto con el suelo, excluyendo dash y teletransporte. Las muestras alternadas están precargadas y limitadas a tres voces. HeavyGaitView anima la geometría existente. ChargeLanding observa la trayectoria vertical de la Embestida, conserva el estado al terminar la habilidad y emite un único evento cuando una caída de al menos 1 m toca suelo. LandingAudio reproduce un recurso local CC0 derivado y la cámara añade una oscilación visual desactivable. Los eventos no cambian daño, colisiones ni puntería. El perfil de identidad pertenece a la criatura; no se duplica en ataques.

Los eventos de audio se validan con nodos Web Audio reales en Chrome silenciado. Los efectos no requieren servicios, paquetes nuevos ni sonido procedente de juegos comerciales. Procedencia y hashes se conservan junto a cada carpeta de audio.

La salida de calibración a combate crea una sesión de captura y órdenes nueva, conservando el modelo Vosk cargado, para separar el último ensayo de la partida. Calibración y combate comparten el rechazo de confianza acústica baja; el informe conserva confianza cuando existe. El banco sintético espera el final de cada fuente y añade 700 ms de silencio para impedir solapamiento entre muestras.
