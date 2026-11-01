# Evaluación breve: Three.js/Rapier y Godot

31 de octubre de 2026. Decisión para 0.2: **conservar la demo web actual**. El usuario autoriza migrar si una prueba posterior demuestra una mejora suficiente.

Esta medición es histórica y usó la arena anterior de 625 casillas; no representa una comparación de rendimiento de la arena actual de 2500 casillas.

## Ejecución en segundo plano

Se ejecutó la instalación indicada, **Godot 4.6.1 stable**, con --headless, sin editor o ventana de juego. La sonda reproduce seis cajas estáticas, cuatro cápsulas y 625 instancias de suelo. Se descartaron 60 pasos de calentamiento y se midieron 600 pasos.

La primera ejecución con acceso restringido falló al crear logs de usuario. Se repitió con permiso de ejecución y registro en work/, y finalizó correctamente. No se interpreta ese fallo del entorno como un resultado de rendimiento.

| Medición | Godot 4.6.1 | Rapier 0.21 / Node 24 |
| --- | --- | --- |
| Operaciones incluidas | 4 llamadas move_and_slide | 4 consultas KCC y world.step |
| Media observada | 111.97 µs | 203.72 µs |
| Percentil 95 | 125 µs | 387.40 µs |
| Render GPU medido | No | No |
| Voz medida aquí | No | No |

Los ámbitos difieren: el paso físico global queda fuera del temporizador de Godot y dentro del de Rapier. No permiten afirmar que un motor ejecute el juego completo más rápido. Sí muestran que la física simple ensayada ocupa una fracción de los 16.67 ms de un objetivo de 60 FPS.

Scripts y resultados originales: benchmarks/godot/ y benchmarks/rapier.mjs. Son sondas técnicas, no una migración parcial.

## Decisión

La base actual tiene voz local en Worker, AudioWorklet, física, interfaz, cámara cenital y modelos reemplazables. Migrar requiere integrar y verificar de nuevo captura, intérprete, ejecutor y distribución. No se demostró una mejora global suficiente para hacerlo en esta entrega.

Godot ofrece herramientas de escenas, animación e [instancias MultiMesh](https://docs.godotengine.org/en/4.4/tutorials/performance/using_multimesh.html). Sus [exportaciones web](https://docs.godotengine.org/en/4.4/tutorials/export/exporting_for_web.html) tienen requisitos y límites de audio e hilos. Una exportación web debe evaluarse con el mismo objetivo de distribución, además de una posible versión nativa.

## Antes de migrar

Preparar escenas equivalentes: misma resolución, arena, modelos, sombras, efectos, cuatro habilidades y reconocimiento local. Medir frame p50/p95, memoria, comandos durante movimiento, errores, latencia y arranque con GPU real, sin interferir con el usuario.

Los FPS de Chrome headless con SwiftShader son de software y no representan una sesión GPU normal. El modo ligero reduce sombras y resolución, conservando física y voz. Después de la prueba del jugador se decidirá si optimizar la base o migrar con evidencia comparable.
