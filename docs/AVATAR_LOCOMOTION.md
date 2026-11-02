# Avatar 01 — locomoción y sonido integrados (0.6.0)

La demo carga `public/models/avatar-01/avatar-01_rigged_v2.glb`. Conserva textura, UV, 683 vértices y 643 caras de autoría (1338 triángulos equivalentes), siete mallas y quince huesos. El Blender original y el rig editable permanecen en `models/avatar_01`.

## Movimiento jugable

- Marcha máxima **0,8 m/s**, elegida por el usuario; aceleración 1,6 m/s² y frenada 2,4 m/s². La cámara responde inmediatamente.
- Avance, marcha atrás y curvas izquierda/derecha comparten fase y se mezclan en aproximadamente 0,2 s. Las diagonales y desplazamientos laterales reorientan progresivamente el chasis.
- El rumbo visual tiene una velocidad máxima de 0,7 rad/s. Girar la cámara en reposo mueve la cabeza sin arrastrar el cuerpo.
- `Head_Aim` recibe sólo el giro horizontal relativo, después de mezclar los clips. No recibe inclinación vertical; cámara y ataques conservan su apuntado hacia arriba/abajo.
- La fase sigue el desplazamiento real del motor, incluido su frenado. Empujar una pared no produce una caminata en el sitio.
- La marcha recta completa recorre 1,28 m por ciclo: a 0,8 m/s, un ciclo dura 1,6 s y los cuatro apoyos se separan aproximadamente 0,4 s. Las curvas adaptan su cadencia al cambio de rumbo, sin usar el sonido como reloj.
- El reposo mantiene expansión del casco y articulación de patas. El panel lateral muestra el mismo esqueleto animado que existe en la arena.

`TankLocomotion` decide rumbo, fase y mezclas. `TankAnimation` carga acciones, aplica el apuntado e interpreta los apoyos. Los parámetros están en `src/config/creatures.ts` y `src/config/locomotion.ts`; no dentro del motor físico.

## Apoyos y límites

Después de la mezcla se corrige cada pata con dos huesos y un apoyo en coordenadas del mundo. El pie de soporte conserva su posición mientras el cuerpo avanza; durante la elevación se anticipan traslación y giro. Esto permite pasos interiores más cortos y exteriores más amplios. El alcance está limitado a la longitud real de la pata; no se estiran los huesos ni se añaden caras.

La corrección está pensada para la arena plana actual. Los cambios instantáneos de dirección muy extremos pueden requerir una recolocación acotada de un apoyo para evitar hiperextensión. No es todavía un sistema de marcha sobre terreno irregular ni incluye clips exclusivos de salto, derrape o frenada. Durante Embestida y en el aire se suspenden apoyos y pisadas de marcha; se conserva el efecto de aterrizaje existente.

Como precedente, [Pose Warping de Epic](https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine) describe adaptar orientación y longitud de paso al movimiento, y [Lyra](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-in-lyra-sample-game-in-unreal-engine) separa locomoción y capas de apuntado. Esta demo aplica una implementación propia en Three.js.

## Pisada biomecánica original

Los archivos `biomech-step-01.wav` a `04.wav` combinan los golpes graves CC0 que ya tenía Avatar 01 con resonancias inarmónicas, fricción filtrada y una textura breve de caparazón articulado sintetizadas para este proyecto. `Cell's Walk Sound.mp3` sirvió sólo como referencia privada de timbre. El análisis del archivo muestra energía principalmente entre 500 y 4000 Hz; ninguna muestra del audio de Cell forma parte del resultado.

Cada sonido sale del **mismo evento de contacto que fija el pie al suelo**. No hay un temporizador de audio separado ni cambios de velocidad de reproducción. El orden del ciclo es posterior izquierda, anterior izquierda, posterior derecha, anterior derecha, según los nombres del rig. La fuerza varía levemente entre apoyos delanteros y posteriores. El sonido de caída fuerte sigue siendo un recurso independiente.

La propuesta para escuchar está en `models/avatar_01/avatar-01_pisadas-propuesta.wav`: cuatro ciclos a la cadencia de marcha recta. El generador reproducible es `scripts/prepare_biomech_steps.py`; sólo requiere los WAV CC0 previos y NumPy, no la referencia privada.

## Comprobaciones

La versión 0.6.0 pasó **169 pruebas unitarias y 12 pruebas en Chrome sin ventana y silenciado**. Incluyen carga del GLB/textura, movimientos, apuntado separado, apoyos rectos, alcance de huesos, respiración, pausa/reinicio, eventos Web Audio y regresión de las cuatro habilidades. La compilación de distribución pasó. La valoración del timbre y la sensación de peso requieren la escucha y prueba del jugador; el ensayo automático no utiliza su micrófono.
