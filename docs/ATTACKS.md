# Ataques compartidos y órdenes de voz

El registro único está en src/attacks/registry.ts. Una criatura declara únicamente identificadores en su lista abilities de src/config/creatures.ts. Dos criaturas con "flamethrower" reutilizan exactamente la misma definición, gramática y función de ejecución.

Cada activación valida primero la propiedad del ataque, pausa, duplicados, exclusión entre emisiones principales y recarga. La fábrica crea estado independiente por criatura: trayectoria de Embestida, proyectiles de Ráfaga y reloj de habilidades nunca se comparten entre jugadores. Las definiciones se congelan para evitar modificaciones accidentales.

## Organización

| Ruta bajo src/attacks | Responsabilidad |
| --- | --- |
| types.ts | Contratos de configuración, contexto y comportamiento |
| registry.ts | Una entrada por ataque; lista de definiciones para voz, interfaz y ejecutor |
| shared/tuning.ts | Parámetros comunes del campo de pruebas |
| flamethrower/definition.ts | Duración 5 s, recarga posterior 5 s, alcance 10 m, daño y calor |
| flamethrower/commands.ts | Biblioteca finita por intención: llamada, activación, ataque, contraataque y urgencia |
| flamethrower/behavior.ts | Volumen analítico y oclusión; no depende del sonido ni del dibujo |
| flamethrower/FlameSimulation.ts | Pool de partículas, recorrido, tamaño, extinción y límites |
| flamethrower/FlameView.ts | Una malla instanciada; colores y facetas de fuego artificial |
| flamethrower/FlameAudio.ts | Salida de audio, inicio, bucle, apagado y volumen |
| flamethrower/HeatView.ts y src/combat/HeatField.ts | Casillas calientes de 1 m, exposición y daño gradual |
| barrage/ | 50 proyectiles, adquisición limitada, impactos y presentación |
| armor/ | Protección selectiva contra daño térmico y de proyectiles |
| charge/ | Preparación, impulso terrestre o salto según el apuntado final |
| armor_guard/, charge_dash/, thermal_pulse/ | Habilidades anteriores conservadas en la biblioteca global |

src/config/abilities.ts conserva una fachada de compatibilidad. No contiene una segunda lista de ataques. CombatRuntime compone los comportamientos de los ataques que posee cada criatura; no contiene ramas de daño o desplazamiento por nombre de ataque.

## Compartir un ataque

En la definición de cualquier criatura, añade el identificador a su lista:

    abilities: ['flamethrower', 'barrage', 'armor', 'charge']

No copies archivos ni crees una implementación por personaje. Ajusta el emisor primary del personaje para colocar el origen del ataque en su modelo. No se añadieron personajes en esta actualización.

## Modificar o crear un ataque

1. Cambia sus valores en su propia definition.ts; no edites el reloj genérico.
2. Mantén las frases completas y sus estructuras junto a esa definición. Se usan como vocabulario del reconocedor y validación posterior. Negaciones, preguntas, cortesía y conversación se comprueban antes de aceptar una orden. Las repeticiones urgentes se expresan como variantes de la misma habilidad, no como ataques nuevos.
3. Implementa comportamiento en una fábrica que reciba AttackContext. Guarda allí el estado mutable por actor. Usa los hooks onActivate, prepare, afterPhysics, damageMultiplier y reset que necesites.
4. Para un ataque nuevo, añade su identificador en types.ts y una sola entrada en registry.ts. Las listas de voz e interfaz se derivan automáticamente del registro.
5. Los efectos visuales y sonoros permanecen fuera del daño. CombatView coordina las vistas de fuego, calor y proyectiles, además del escudo y la señal de carga. Un ataque futuro con presentación propia debe conectarla a la vista y al ciclo de limpieza.
6. Ejecuta pruebas unitarias, build y navegador; si cambias vocabulario Vosk, repite el banco acústico. Comprueba también otro actor que comparte el ataque.

## Canal de voz

Audio → reconocedor → frase completa validada → deduplicación por intervención → identificador → AbilitySystem → comportamiento del registro.

La referencia a VoiceAttack describe la mecánica de órdenes de voz. Esta demo usa Vosk y código propio; no incorpora el código comercial de VoiceAttack ni afirma haber entrenado sus pesos acústicos. Los alias personales sólo se agregan con confirmación. No se necesitan botones de ataque.
