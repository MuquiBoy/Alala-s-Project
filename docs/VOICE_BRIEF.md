# TAREA: IMPLEMENTAR UN SISTEMA DE COMBATE EN TIEMPO REAL ACTIVADO MEDIANTE VOZ

> Documento histórico de la primera implementación de voz. La arena vigente mide 50 × 50 m y tiene 2500 casillas; consulta README.md y docs/ARCHITECTURE.md.

## 1. Contexto del proyecto

Este proyecto es un prototipo funcional de combate tridimensional entre criaturas digitales.

El juego ya dispone de una versión ejecutable. Tu trabajo consiste en ampliarla y corregir los sistemas necesarios, sin reconstruir innecesariamente el código existente.

El entorno principal es una arena de 25 × 25 metros, dividida visualmente en 625 casillas de 1 × 1 metro.

El jugador controla directamente a una criatura mediante:
- WASD para desplazarse.
- Ratón para orientar la cámara FPS y apuntar.
- Micrófono para activar todas las habilidades.

La mecánica central es la activación verbal de habilidades en tiempo real.

El jugador debe poder desplazarse y apuntar mientras habla. El reconocimiento de voz no debe interrumpir el movimiento ni bloquear el renderizado.

El objetivo de esta tarea es implementar un sistema funcional de reconocimiento e interpretación de comandos vocales, utilizando como primera criatura de prueba un tanque cuadrúpedo mecánico con capacidades térmicas.

## 2. Instrucciones iniciales

Antes de modificar archivos:

1. Inspecciona el repositorio existente.
2. Identifica el motor gráfico, las dependencias y el lenguaje de programación.
3. Localiza los sistemas actuales de movimiento, cámara, personajes e interfaz.
4. Identifica la forma más segura de incorporar un sistema de habilidades y reconocimiento de voz.
5. Reutiliza la arquitectura existente cuando sea adecuada.
6. No reemplaces sistemas funcionales sin una justificación técnica.
7. Conserva la compatibilidad con la ejecución web.

Si el juego utiliza Three.js, integra el sistema mediante TypeScript o JavaScript según la arquitectura existente.

No introduzcas dependencias pesadas si las APIs disponibles permiten resolver el prototipo.

## 3. Criatura experimental: tanque cuadrúpedo

Implementa una configuración de personaje especializada en combate térmico.

Su identidad es la de una criatura digital mecánica, lenta, pesada y resistente.

El personaje dispone de cuatro habilidades:

### Habilidad 01 — Lanzallamas

Identificador: `flamethrower`

Tipo: ofensiva sostenida.

Funcionamiento:
- Genera una emisión visual continua de fuego desde el punto de origen del hocico.
- El alcance máximo será de 10 metros.
- La habilidad dura inicialmente 2.5 segundos después de reconocer el comando.
- El jugador puede seguir moviéndose y apuntando durante la ejecución.
- La emisión sigue la orientación del punto de ataque durante su duración.
- Debe existir un volumen abstracto de detección de impactos para la simulación del combate.
- Los efectos visuales deben ser estilizados y de bajo costo gráfico.
- Tiempo de recarga inicial: 5 segundos después de terminar la emisión.

Comandos válidos:
- "Lanzallamas"
- "Usa lanzallamas"
- "Ataca con llamas"
- "Llamas"

### Habilidad 02 — Coraza

Identificador: `armor_guard`

Tipo: defensiva.

Funcionamiento:
- La criatura entra en un estado de protección.
- Duración inicial: 2 segundos.
- Reducción provisional del daño recibido: 65 %.
- Durante la protección, la velocidad de desplazamiento disminuye.
- El efecto visual debe representar una postura defensiva o placas protectoras.
- Tiempo de recarga: 8 segundos.

Comandos válidos:
- "Coraza"
- "Protección"
- "Protégete"
- "Activa coraza"

### Habilidad 03 — Embestida

Identificador: `charge_dash`

Tipo: movilidad.

Funcionamiento:
- La criatura realiza un desplazamiento rápido de 3 metros.
- La dirección inicial será la orientación horizontal de la cámara.
- La habilidad debe utilizar el controlador de colisiones existente.
- El personaje no puede atravesar paredes ni abandonar la arena.
- El desplazamiento debe sentirse pesado y contundente, no como un teletransporte.
- Tiempo de recarga: 6 segundos.

Comandos válidos:
- "Embestida"
- "Embiste"
- "Dash"
- "Carga"

### Habilidad 04 — Pulso térmico

Identificador: `thermal_pulse`

Tipo: ofensiva de área y control de espacio.

Funcionamiento:
- Genera una onda visual circular que se expande desde el personaje.
- Radio máximo: 3 metros.
- Produce un efecto de impacto y un breve empuje sobre los objetivos próximos.
- No debe atravesar obstáculos sólidos.
- La expansión debe representarse mediante un efecto estilizado.
- Tiempo de recarga: 7 segundos.

Comandos válidos:
- "Pulso"
- "Pulso térmico"
- "Expulsa calor"
- "Activa pulso"

Todos los valores anteriores son parámetros iniciales modificables mediante archivos de configuración.

## 4. Arquitectura del reconocimiento de voz

La tarea principal es implementar un sistema capaz de interpretar comandos vocales durante una partida en tiempo real.

No entrenes inicialmente un modelo generativo de inteligencia artificial desde cero.

Utiliza un sistema compuesto por tres módulos independientes.

### Módulo A — Reconocimiento de voz

Responsable de:
- Solicitar autorización para utilizar el micrófono.
- Detectar disponibilidad del reconocimiento de voz.
- Convertir voz en texto.
- Entregar transcripciones al intérprete de comandos.
- Gestionar interrupciones y errores.
- Mantener el reconocimiento activo durante la partida cuando el navegador lo permita.

Evalúa la Web Speech API como primera implementación si el juego utiliza tecnologías web compatibles.

Prueba las propiedades `continuous` e `interimResults`, pero no asumas que garantizan escucha ininterrumpida o reconocimiento inmediato.

Verifica primero la compatibilidad del navegador.

El jugador deberá activar voluntariamente el micrófono al iniciar la sesión.

El sistema no debe almacenar grabaciones de voz ni transmitir audio a servicios propios innecesariamente.

### Módulo B — Intérprete semántico de comandos

Responsable de transformar una transcripción en una habilidad identificada.

Debe funcionar mediante un vocabulario configurable de palabras clave, frases equivalentes y alias.

Por ejemplo:

Entrada: "Usa lanzallamas"

Resultado esperado: `flamethrower`

Entrada: "Ataca con llamas"

Resultado esperado: `flamethrower`

Entrada: "Protégete"

Resultado esperado: `armor_guard`

Entrada: "Embiste"

Resultado esperado: `charge_dash`

Entrada: "Pulso térmico"

Resultado esperado: `thermal_pulse`

Implementa normalización de:
- Mayúsculas y minúsculas.
- Tildes.
- Puntuación.
- Espacios redundantes.
- Variaciones sencillas de expresiones.

El intérprete debe dar prioridad a coincidencias completas y expresiones inequívocas.

No debe activar habilidades ante coincidencias accidentales dentro de conversaciones ajenas al combate.

Ejemplos que deben ignorarse:
- "No uses lanzallamas".
- "Creo que las llamas son bonitas".
- "Quizás debería activar el escudo".
- "¿Cómo funciona la embestida?".

Las frases negativas, interrogativas, ambiguas o meramente descriptivas no deben activar acciones automáticamente.

Si una transcripción coincide con varias habilidades, recházala cuando no exista una correspondencia inequívoca.

Evita utilizar coincidencias aproximadas demasiado permisivas que puedan activar ataques por error.

### Módulo C — Ejecutor de habilidades

Responsable de:
- Recibir identificadores válidos de habilidades.
- Comprobar si la criatura posee esa habilidad.
- Verificar los tiempos de recarga.
- Comprobar si las condiciones de activación se cumplen.
- Ejecutar el efecto correspondiente.
- Actualizar los estados del personaje y la interfaz.
- Evitar ejecuciones duplicadas.

Separa completamente este módulo del reconocimiento de voz.

El motor de combate no debe depender de recibir frases de texto. Solo debe recibir solicitudes de ejecución con identificadores de habilidades.

Esto permitirá sustituir posteriormente el sistema de reconocimiento sin modificar el combate.

## 5. Optimización para combate en tiempo real

La latencia es uno de los criterios principales de evaluación.

El sistema debe responder tan pronto como exista una interpretación suficientemente fiable de la orden.

Investiga la utilización de resultados parciales del reconocimiento de voz para reducir retrasos.

Sin embargo:
- No ejecutes repetidamente una habilidad cuando una transcripción parcial se convierte en definitiva.
- No ejecutes comandos ambiguos solo por anticipar la respuesta.
- No confundas una orden pronunciada varias veces con duplicaciones del mismo resultado de reconocimiento.
- Permite comandos consecutivos cuando las habilidades estén disponibles.
- Evita que un error del micrófono congele la partida.

Para cada comando, registra cuando sea posible:
1. Inicio detectado de la intervención de voz.
2. Recepción de transcripción parcial.
3. Recepción de transcripción definitiva.
4. Identificación de habilidad.
5. Solicitud de activación.
6. Inicio efectivo del efecto.

Calcula los intervalos de tiempo observables mediante un reloj monotónico apropiado.

No inventes marcas temporales que el navegador no proporcione.

Distingue entre latencia del reconocimiento de voz y latencia interna del videojuego.

El objetivo es reducir ambas sin sacrificar la precisión.

## 6. Interfaz de diagnóstico

Incorpora un panel de diagnóstico que pueda activarse o desactivarse durante el desarrollo.

Debe mostrar:
- Estado del micrófono.
- Estado del reconocedor.
- Última transcripción recibida.
- Comando interpretado.
- Habilidad asociada.
- Tiempo entre la recepción de la transcripción y la activación.
- Motivo de rechazo, cuando corresponda.
- Estado de recarga de las cuatro habilidades.
- Número de comandos reconocidos y rechazados.

La interfaz normal del jugador solamente deberá mostrar la información esencial, como el estado del micrófono, los nombres de ataques y sus recargas.

No permitas que los paneles de diagnóstico interfieran con los controles FPS.

## 7. Evaluación del sistema de voz

Antes de considerar la tarea terminada, implementa pruebas automatizadas del intérprete textual.

Incluye casos de:
- Frases exactas.
- Frases equivalentes.
- Tildes y mayúsculas.
- Negaciones.
- Comandos ambiguos.
- Transcripciones repetidas.
- Comandos durante recargas.
- Frases sin habilidades reconocibles.
- Variantes de pronunciación que generen transcripciones diferentes.

Separa las pruebas automatizadas de las pruebas reales con micrófono.

Para la evaluación con voz humana, prepara un procedimiento que permita pronunciar cada comando varias veces y registrar los resultados.

No afirmes que el sistema reconoce correctamente voces humanas si únicamente se ha probado introduciendo texto.

El objetivo es recopilar evidencia real sobre:
- Porcentaje de comandos reconocidos correctamente.
- Activaciones incorrectas.
- Comandos ignorados.
- Retrasos de ejecución.
- Problemas con comandos consecutivos.

El sistema debe facilitar que estos datos se revisen y se utilicen para mejorar el vocabulario de comandos.

No es necesario conservar audio personal para obtener estas estadísticas.

## 8. Integración con la interfaz actual

Mantén la composición de pantalla existente:

- Gran ventana FPS central y horizontal.
- Panel lateral derecho.
- Información de la criatura.
- Lista de cuatro habilidades.
- Cámara cenital como minimapa.

Las habilidades deben mostrar visualmente su estado:
- Disponible.
- Ejecutándose.
- En recarga.
- No disponible.

Cuando se reconozca un comando válido, muestra una confirmación visual breve.

No sustituyas el diseño actual por una interfaz FPS convencional.

## 9. Restricciones importantes

- No reconstruyas el juego desde cero.
- No cambies las dimensiones de la arena.
- No modifiques innecesariamente el movimiento WASD.
- No asignes los ataques a botones del teclado o ratón durante el juego normal.
- No incorpores progresión, evolución ni nuevos personajes en esta tarea.
- No implementes todavía PvP online.
- No incorpores modelos definitivos ni efectos gráficos costosos.
- No presupongas que la Web Speech API funcionará igual en todos los navegadores.
- No declares completado el reconocimiento en tiempo real sin haber explicado qué pruebas se ejecutaron realmente.

Los controles manuales de ataque pueden existir únicamente en herramientas internas de diagnóstico, separados de la experiencia normal.

## 10. Resultado esperado

Al ejecutar la versión actualizada:

1. El jugador selecciona el tanque cuadrúpedo.
2. Entra en la arena de 25 × 25 metros.
3. Puede desplazarse con WASD y apuntar mediante el ratón.
4. Autoriza voluntariamente el uso del micrófono.
5. Pronuncia "Lanzallamas".
6. La criatura ejecuta una emisión sostenida de fuego de hasta 10 metros.
7. Puede pronunciar "Coraza" para protegerse.
8. Puede pronunciar "Embestida" para realizar un desplazamiento rápido.
9. Puede pronunciar "Pulso térmico" para ejecutar su habilidad de área.
10. Cada habilidad respeta sus condiciones y tiempos de recarga.
11. Las cuatro habilidades se muestran en la interfaz.
12. El reconocimiento funciona sin bloquear el movimiento o la cámara.

## 11. Instrucción final

Primero inspecciona el proyecto y presenta un resumen breve de los sistemas existentes que deben modificarse.

Después, implementa los cambios necesarios directamente sobre el código disponible.

Prioriza el funcionamiento antes que la calidad de los efectos visuales.

El criterio principal de éxito es conseguir que un jugador pueda **moverse y apuntar libremente mientras pronuncia los nombres de sus habilidades, y que la criatura responda con suficiente precisión y rapidez para sostener un combate en tiempo real**.

Si hay problemas de compatibilidad, rendimiento o reconocimiento de voz, documéntalos de manera explícita. No simules resultados exitosos de pruebas que no hayas realizado.
