# Verificación 0.5.2 — Embestida y campo de entrenamiento de 50 × 50 m

Fecha: 1 de noviembre de 2026. Se ejecutaron pruebas con Chrome sin ventana, perfil aislado y audio silenciado. No se usaron ventanas del usuario ni su micrófono físico.

## Resultado

| Comprobación | Estado |
| --- | --- |
| TypeScript y compilación de distribución | Correctos |
| Pruebas unitarias de arena, voz, física, combate y entrenamiento | 163 aprobadas |
| Escenarios de Chrome en segundo plano | 11 aprobados |
| Carga local de arena OBJ v2 y textura PNG v2 | Correcta |
| Ataques por transcripciones simuladas en Chrome | Las cuatro habilidades activadas; Ráfaga bloqueada correctamente durante otra emisión principal |
| Voz humana y calidad audiovisual percibida | Pendiente de la prueba del jugador |

## Lo comprobado del nuevo combate

Avatar 01 equipa exactamente Lanzallamas, Ráfaga, Blindaje y Embestida. La biblioteca conserva Coraza, Embestida anterior y Pulso térmico para futuros personajes. El cuerpo jugable tiene colisión de 3 × 2,5 × 3 metros; Chrome verifica que se detiene delante de la nueva barrera sin atravesarla. La arena usa 2500 casillas de 1 m y el modelo SKP del usuario convertido a OBJ.

Lanzallamas usa un cono de 10 m y 35° de apertura total para daño, partículas y exposición del suelo. Las casillas de 1 m se encienden sólo si el cono llega a su superficie y hay línea de visión. El calor dura 4 s desde la última exposición y causa daño gradual sin multiplicar instancias. La prueba confirma que no se calienta el suelo al apuntar hacia arriba y que el calor expira.

Ráfaga programa 50 disparos a razón de uno cada 0,1 s. Una prueba adicional detectó y corrigió un fallo que extinguía cada proyectil tras el primer tramo. Ahora se confirma daño a una sonda visible y ausencia de daño a otra situada detrás de la pared. La dirección de cada proyectil queda fijada al dispararse.

Blindaje dura 5 s y reduce una sola vez al 25% el daño térmico o de proyectil, incluso si un impacto tiene ambas categorías. No reduce daño cuerpo a cuerpo. La baliza de ensayo se clasifica como proyectil y su impacto de 12 puntos se convierte en 3 con Blindaje. La recarga de 15 s empieza al terminar el efecto.

Embestida prepara 2 s con movimiento al 15%. El apuntado puede cambiar durante esa preparación; el impulso usa la orientación final. Se comprobó el desplazamiento y el salto físico bajo gravedad. La recarga de 9 s comienza después del impulso. La asistencia angular está limitada y no debe convertir una huida en persecución.

Se probaron las masas de 50, 100 y 500 kg con el mismo choque: el objetivo más pesado recibe menor cambio de velocidad. La Embestida del tanque de 500 kg detectó contacto real contra un enemigo de 100 kg, aplicó un solo daño de **30 puntos** y lo desplazó. En una prueba abierta el blanco retrocedió **5,01 m** y el tanque perdió velocidad; cerca de la barrera el blanco no la atravesó. La prueba ascendente detectó lanzamiento vertical efectivo y aterrizaje posterior; otra interceptó al verde ya en el aire y alteró su velocidad sin suspender gravedad ni colisiones. Los topes de velocidad y la fricción se configuran por separado de las masas. La percepción de contundencia deberá confirmarse con la prueba humana, ya que las pruebas automatizadas sólo miden movimiento y eventos.

Una prueba física verifica que el aterrizaje de una Embestida elevada emite un único evento al caer más de 1 m y que un dash terrestre no lo emite. Chrome sin ventana cargó el WAV nuevo y comprobó que el navegador inicia su reproducción al aterrizar. La amplitud de la sacudida está acotada y puede desactivarse; la apreciación subjetiva del audio y de la cámara requiere la prueba del jugador.

Los cuatro magenta comienzan pasivos. Después de recibir daño, una prueba comprueba la secuencia de tres proyectiles, impactos reales contra Avatar 01, identificación del atacante y regreso a pasivo. Sin Blindaje cada proyectil causa 8 puntos; con Blindaje causa 2, aunque el tanque pese 500 kg. El blanco verde salta, cae, se desplaza y no dispara.

El intérprete sólo acepta habilidades equipadas, órdenes completas y repeticiones urgentes como una sola solicitud. Rechaza negaciones, preguntas, conversación y expresiones con «por favor». Chrome comprobó el flujo de voz simulado, los estados de interfaz, las recargas, el movimiento simultáneo, las pisadas y la reanudación después de calibrar.

## Límites de esta pasada

El informe `SYNTHETIC_AUDIO_REPORT.json` pertenece a la versión anterior y no evalúa acústicamente las nuevas palabras Ráfaga y Blindaje. Estas se verificaron mediante transcripciones simuladas y reglas textuales, no con voces reales. Las voces, acentos, gritos, ruido de sala, cancelación de eco y equilibrio de efectos necesitan la prueba humana descrita en `HUMAN_VOICE_TEST.md`.

Las pruebas físicas usan el controlador cinemático Rapier y un coeficiente arcade de transferencia de impulso. No constituyen una simulación de cuerpos rígidos completamente dinámica. Esta entrega no implementa otro jugador ni red PvP. Los FPS observados con SwiftShader no representan el rendimiento de la GPU del jugador. La compilación emite una advertencia por el tamaño del módulo físico Rapier/WASM; no impide iniciar la demo.

El acceso directo del escritorio apunta a `JUGAR.cmd`, que sirve la distribución local. El proyecto mantiene código, recursos, modelo de voz y salida compilada en la misma carpeta. No se publicó a GitHub porque no hay remoto configurado.
