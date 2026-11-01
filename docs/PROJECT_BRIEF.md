# PROYECTO: Motor experimental de combate 3D para criaturas digitales

> Documento histórico de la propuesta inicial. La configuración jugable vigente está en README.md y docs/ARCHITECTURE.md: arena de 50 × 50 m, 2500 casillas y cinco enemigos de entrenamiento.

## 1. Objetivo general

Desarrolla desde cero un prototipo jugable de combate tridimensional en tiempo real, basado en criaturas digitales controladas directamente por el jugador.

El proyecto tiene como objetivo investigar una alternativa a los sistemas tradicionales de combate de los videojuegos *creature tamers*, combinando:

- Movimiento tridimensional mediante teclado WASD.
- Orientación y apuntado mediante ratón.
- Cámara principal en primera persona, situada en los ojos de la criatura.
- Selección entre seis avatares jugables.
- Activación de ataques y habilidades exclusivamente mediante comandos de voz.
- Un entorno tridimensional cerrado de dimensiones conocidas.
- Una interfaz inspirada en los sistemas de transmisión de videojuegos.

**El principio fundamental es que el jugador controla directamente el cuerpo de la criatura, pero debe expresar verbalmente su intención de ejecutar una habilidad para activarla.**

No se trata de dar órdenes a una criatura autónoma. El jugador ocupa funcionalmente el avatar y actúa a través de él.

El resultado debe ser un prototipo técnico funcional y ampliable, no un videojuego comercial completo.

---

## 2. Tecnologías y arquitectura

Para esta primera versión, utiliza:

- Three.js para representar el entorno tridimensional.
- TypeScript para la lógica de programación.
- Vite para el entorno de desarrollo web.
- Una biblioteca de físicas adecuada, como Rapier, si resulta necesaria para implementar movimiento y colisiones robustas.
- APIs compatibles del navegador para gestionar micrófono y reconocimiento de voz.

Prioriza código modular, mantenible y documentado.

No reutilices el código fuente de videojuegos comerciales ni copies sistemas completos de proyectos externos.

Crea los archivos, dependencias y configuraciones necesarios para iniciar el proyecto desde una carpeta vacía.

El prototipo debe ejecutarse localmente en un navegador de escritorio y poder publicarse posteriormente mediante alojamiento web estático.

## 3. Escenario 3D y sistema de escala

El prototipo se desarrollará dentro de una arena cuadrada de **25 × 25 casillas**.

Las dimensiones son obligatorias:

- Cada casilla representa 1 metro real.
- Cada módulo del suelo debe medir 1 × 1 metro en planta.
- El escenario completo tendrá 25 metros de ancho por 25 metros de largo.
- La arena contendrá 625 módulos de suelo.
- La escala de trabajo será de 1 unidad del mundo 3D = 1 metro.

Para el primer escenario, utiliza módulos cúbicos de 1 × 1 × 1 metro, colocados de manera que sus superficies superiores formen un suelo continuo, completamente horizontal.

Establece un sistema de coordenadas coherente: eje Y vertical, ejes X y Z horizontales, suelo transitable a Y = 0 y arena centrada en el origen.

Delimita la zona jugable mediante paredes perimetrales simples que impidan abandonar la arena.

El escenario deberá permitir posteriormente importar geometría personalizada creada en Blender, preferentemente en formato GLB/glTF.

**Importante:** la cuadrícula es una referencia de construcción y escala, no un sistema de movimiento por casillas. Las criaturas deben poder desplazarse libremente por el espacio tridimensional.

Evita crear 625 sistemas físicos independientes cuando puedan resolverse mediante una superficie de colisión optimizada.

## 4. Sistema de selección de personajes

Implementa un menú inicial donde el jugador pueda elegir entre **seis criaturas diferentes**.

En esta fase todavía no se proporcionarán los seis modelos definitivos.

Por lo tanto:

1. Crea seis avatares provisionales identificados como Avatar 01, Avatar 02, Avatar 03, Avatar 04, Avatar 05 y Avatar 06.
2. Utiliza formas geométricas low-poly sencillas para representarlos.
3. Diferéncialos visualmente mediante colores y siluetas provisionales.
4. Permite seleccionar cualquiera de los seis.
5. Al seleccionarlo, carga su configuración y habilita el control del personaje en la arena.

La arquitectura debe permitir sustituir posteriormente cada avatar provisional por un modelo GLB sin modificar el núcleo del sistema de movimiento, cámara o combate.

Cada criatura deberá tener una configuración independiente que contenga:

- Identificador.
- Nombre.
- Modelo tridimensional.
- Altura y dimensiones de colisión.
- Velocidad de movimiento.
- Aceleración y desaceleración.
- Velocidad de giro, cuando corresponda.
- Puntos de vida.
- Lista de habilidades.
- Parámetros de cada habilidad.
- Posición de cámara FPS.
- Referencias de emisión de ataques.

No inventes personajes definitivos ni asumas que todos tienen anatomía humanoide. El sistema debe admitir criaturas bípedas, cuadrúpedas o mecánicas.

## 5. Movimiento tridimensional y físicas

El jugador debe controlar la criatura seleccionada mediante WASD.

Controles:

- W: desplazamiento hacia delante.
- S: desplazamiento hacia atrás.
- A: desplazamiento lateral izquierdo.
- D: desplazamiento lateral derecho.
- Movimiento del ratón: orientación de la visión y apuntado.

Implementa captura del puntero mediante Pointer Lock, con un mecanismo convencional para activarla y liberarla.

El movimiento debe cumplir los siguientes requisitos:

- Desplazamiento continuo y libre.
- Aceleración y desaceleración configurables.
- Colisiones con paredes y obstáculos.
- Imposibilidad de atravesar paredes o el suelo.
- Gravedad coherente.
- Estabilidad de la criatura sobre el terreno.
- Independencia razonable entre frecuencia de renderizado y simulación física.
- Comportamiento estable cuando se utilizan varias teclas de movimiento simultáneamente.

La velocidad de desplazamiento debe expresarse en metros por segundo.

No es necesario simular biomecánica avanzada. Se busca una física convincente para un videojuego, priorizando control, estabilidad y respuesta.

El sistema de movimiento no debe asumir que todas las criaturas tienen las mismas dimensiones o capacidades.

## 6. Cámara en primera persona

La cámara principal debe estar vinculada a un punto configurable que represente los ojos de la criatura.

El jugador no observa a un personaje desde atrás: observa el entorno **a través de la visión de su avatar**.

Requisitos:

- Cámara FPS controlada mediante ratón.
- Rotación horizontal y vertical.
- Límite razonable de rotación vertical.
- Posición relativa configurable según la anatomía de cada criatura.
- Dirección de apuntado asociada a la orientación de cámara.
- Punto de mira central discreto.
- Movimiento suave y estable.

La posición de la cámara no debe estar fijada universalmente a una altura humana.

Cada criatura deberá poder tener su propia altura de ojos y origen de disparo.

## 7. Segunda cámara: visión cenital

Implementa una segunda cámara tridimensional independiente de la cámara FPS.

Esta cámara debe mostrar la arena desde una posición elevada, preferentemente mediante proyección ortográfica.

Su función es actuar como un minimapa visual en tiempo real.

Debe mostrar:

- Geometría general de la arena.
- Posición del avatar controlado.
- Orientación del avatar.
- Posición de otros personajes o entidades de prueba.

La segunda cámara debe observar el mismo entorno 3D, pero desde otra perspectiva.

Optimiza su frecuencia de actualización o calidad gráfica si fuera necesario para mantener un rendimiento estable.

## 8. Interfaz de usuario inspirada en OBS

La interfaz debe tener un formato horizontal 16:9, pensado inicialmente para pantallas de computadora.

Su composición visual debe recordar a una transmisión de videojuegos.

La pantalla estará dividida en dos sectores principales.

### A. Ventana principal

La cámara FPS ocupará la mayor parte de la pantalla, aproximadamente entre el 80 % y el 85 % del ancho disponible en escritorio.

Su función será mostrar la experiencia inmersiva de la criatura.

Evita llenar esta ventana con elementos de interfaz innecesarios.

### B. Panel derecho

El espacio restante contendrá:

**Sector superior:**
- Nombre de la criatura.
- Barra de salud.
- Estado de la criatura.
- Lista de ataques y habilidades disponibles.
- Indicadores visuales de disponibilidad o enfriamiento de habilidades.

**Sector inferior:**
- Ventana de la cámara cenital.
- Representación de la arena y sus participantes.

La disposición debe recordar a una transmisión donde la ventana del juego es predominante y la pequeña cámara del streamer ha sido reemplazada por la visión cenital de la arena.

Incluye también un indicador del estado del micrófono y una confirmación visual discreta de la última orden de voz reconocida.

La interfaz deberá realizarse con componentes independientes del motor de combate para facilitar modificaciones futuras.

## 9. SISTEMA PRINCIPAL: COMBATE MEDIANTE COMANDOS DE VOZ

**Este es el componente más importante de todo el proyecto.**

El jugador no debe utilizar teclas ni botones del ratón para activar ataques.

Su teclado y ratón sirven para desplazarse, orientar la cámara y apuntar.

Para utilizar una habilidad, el jugador debe pronunciar su nombre o una expresión equivalente reconocida por el sistema.

El reconocimiento de voz debe funcionar durante la partida, sin obligar al jugador a detener su movimiento para interactuar con menús.

### 9.1. Reconocimiento basado en palabras clave

No es necesario incorporar inicialmente un modelo generativo de lenguaje.

Desarrolla un sistema determinista de reconocimiento de comandos basado en:

1. Transcripción de voz.
2. Normalización del texto.
3. Identificación de palabras clave y expresiones equivalentes.
4. Asociación con una habilidad disponible.
5. Validación del estado de la habilidad.
6. Ejecución de la acción correspondiente.

### 9.2. Ejemplo: habilidad Lanzallamas

Supongamos que una criatura dispone de una habilidad llamada **Lanzallamas**.

Las siguientes expresiones deben interpretarse como la misma orden:

- "Lanzallamas"
- "Usa lanzallamas"
- "Ataca con llamas"
- "Llamas"

Todas deberán activar la habilidad identificada internamente como `flamethrower`.

No se requiere coincidencia literal con una única frase.

El objetivo es permitir que el jugador hable de forma relativamente natural, utilizando un vocabulario limitado y predefinido.

### 9.3. Sistema configurable de alias

Cada habilidad tendrá:

- Identificador interno único.
- Nombre visible.
- Lista de palabras y expresiones reconocidas.
- Tiempo de enfriamiento.
- Duración.
- Condiciones de activación.
- Función asociada a su ejecución.

La normalización deberá contemplar mayúsculas, minúsculas, espacios y tildes.

También deberá identificar límites entre palabras para evitar coincidencias accidentales.

No utilices exclusivamente búsquedas ingenuas de subcadenas.

Diseña un sistema de prioridades para resolver coincidencias ambiguas entre comandos.

No ejecutes una habilidad si aparece dentro de una frase claramente negativa, como "no uses lanzallamas", cuando el reconocedor pueda identificar esa negación.

### 9.4. Protección y Dash

El sistema debe contemplar habilidades de defensa y movilidad activadas de la misma forma.

Ejemplos:

**Protección**
- "Protección"
- "Protégete"
- "Defiéndete"

**Dash**
- "Dash"
- "Esquiva"
- "Desplázate rápido"

Estos son comandos iniciales configurables, no un vocabulario definitivo.

La implementación del dash debe respetar las físicas y colisiones, evitando atravesar paredes.

### 9.5. Reconocimiento en tiempo real

La principal prioridad será reducir el tiempo entre la pronunciación de una orden y la activación de la habilidad.

Implementa:

- Permisos explícitos de acceso al micrófono.
- Estado visible del reconocimiento de voz.
- Gestión de errores y permisos denegados.
- Recuperación ante interrupciones del reconocimiento cuando el navegador lo permita.
- Prevención de activaciones duplicadas de una misma transcripción.
- Registro de tiempos de reconocimiento y activación para medir latencia.
- Posibilidad de utilizar comandos consecutivos.
- Configuración de idioma español (`es-ES` o `es-PE`, según disponibilidad).

Evalúa la Web Speech API para la primera implementación, pero encapsula el reconocimiento en un módulo independiente para poder sustituirlo posteriormente.

No prometas escucha continua perfecta ni latencias fijas: estas capacidades dependerán del navegador, dispositivo y servicio de reconocimiento.

El sistema debe informar claramente cuando el reconocimiento de voz no esté disponible.

No es necesario grabar, almacenar ni transmitir permanentemente el audio del usuario. Utiliza únicamente los resultados necesarios para interpretar comandos y explica cuando el navegador requiera procesamiento externo.

### 9.6. Intencionalidad del jugador

La experiencia debe transmitir que **el jugador necesita manifestar activamente su intención de atacar**.

Esto no implica detectar pensamientos ni emociones.

La intención se representa mediante un acto verbal deliberado y reconocible.

Por ejemplo, el jugador puede desplazarse y apuntar hacia un objetivo, pero su criatura no ejecutará Lanzallamas hasta que pronuncie una expresión válida asociada a esa habilidad.

La voz no debe ser una alternativa opcional a un botón de ataque: constituye el mecanismo de activación principal.

Pueden existir mecanismos de prueba internos durante el desarrollo, pero no deben convertirse en controles de ataque disponibles en la experiencia normal.

## 10. Sistema de habilidades y combate

Crea un sistema modular donde las habilidades sean independientes del modelo 3D de las criaturas.

Cada habilidad deberá poder definir:

- Nombre.
- Identificador.
- Comandos vocales válidos.
- Tipo de habilidad.
- Duración.
- Enfriamiento.
- Alcance, cuando corresponda.
- Daño u otro efecto.
- Animación o efecto visual asociado.
- Condiciones que impiden su activación.

Implementa al menos una versión provisional y verificable de:

1. Una habilidad ofensiva.
2. Una habilidad defensiva.
3. Una habilidad de desplazamiento rápido.

El Avatar 01 puede utilizar la habilidad Lanzallamas como ejemplo inicial.

Para los otros cinco avatares, crea habilidades de prueba configurables sin inventar todavía sus identidades, especializaciones o diseños definitivos.

Incluye al menos un objetivo de prueba estático o móvil muy sencillo para verificar impactos, alcance y daño.

No implementes todavía un sistema multijugador completo, progresión, árbol evolutivo, inventario ni inteligencia artificial avanzada.

La arquitectura sí debe facilitar futuras ampliaciones.

## 11. Diseño modular y sustitución de recursos

El desarrollo debe estar organizado para permitir reemplazar elementos sin reescribir el proyecto.

Separa especialmente:

- Gestión de escena.
- Generación e importación de arenas.
- Selección de avatares.
- Configuración de criaturas.
- Control de movimiento.
- Física y colisiones.
- Cámara principal.
- Cámara cenital.
- Sistema de habilidades.
- Reconocimiento de voz.
- Interpretación de comandos.
- Interfaz de usuario.
- Efectos visuales.
- Gestión de estados del juego.

Los datos de criaturas y habilidades deben estar separados de la lógica principal.

Prepara una carpeta para futuros recursos creados en Blender.

Los modelos definitivos podrán incluir esqueletos, animaciones y puntos de anclaje para cámaras y ataques.

## 12. Compatibilidad y rendimiento

El prototipo debe funcionar en navegadores modernos de escritorio.

Prioriza inicialmente Chrome o Edge, sin asumir compatibilidad idéntica en otros navegadores.

Objetivos técnicos:

- Renderizado 3D fluido.
- Escenario sencillo y low-poly.
- Movimiento estable.
- Reconocimiento de voz durante el juego.
- Renderizado de las dos cámaras.
- Bajo consumo innecesario de recursos.

Utiliza 60 FPS como objetivo de rendimiento en equipos compatibles, no como garantía universal.

El acceso al micrófono deberá funcionar mediante localhost o un contexto web seguro compatible.

El proyecto debe poder compilarse para alojamiento estático y abrirse mediante un enlace, una vez publicado.

## 13. Desarrollo por etapas

No intentes implementar todos los sistemas simultáneamente.

### Fase 1 — Fundamentos

- Crear el proyecto desde cero.
- Configurar Three.js, TypeScript y Vite.
- Generar la arena de 25 × 25 metros.
- Implementar un avatar geométrico.
- Activar movimiento WASD, ratón y colisiones.
- Ejecutar y comprobar que el prototipo funciona.

### Fase 2 — Cámara e interfaz

- Implementar la cámara FPS.
- Crear la cámara cenital.
- Construir la interfaz horizontal tipo transmisión.
- Incorporar el panel lateral de información.

### Fase 3 — Selección de personajes

- Crear el menú de seis avatares.
- Generar los seis modelos provisionales.
- Incorporar parámetros individuales configurables.
- Permitir cambiar el avatar antes de comenzar la partida.

### Fase 4 — Reconocimiento de voz

- Solicitar permisos del micrófono.
- Integrar el reconocimiento de comandos.
- Implementar el sistema de palabras clave y alias.
- Mostrar las transcripciones y comandos detectados.
- Medir la latencia de reconocimiento.

### Fase 5 — Combate

- Implementar Lanzallamas.
- Implementar Protección.
- Implementar Dash.
- Integrar enfriamientos, colisiones y efectos.
- Comprobar que los comandos funcionan mientras el jugador se mueve y apunta.

### Fase 6 — Pruebas y optimización

- Corregir errores.
- Validar dimensiones y físicas.
- Evaluar rendimiento.
- Comprobar el reconocimiento de voz.
- Verificar que se puede seleccionar cualquiera de los seis avatares.
- Preparar una compilación web.

## 14. Criterios de aceptación

El prototipo mínimo se considerará funcional cuando:

1. El usuario pueda abrirlo en un navegador de escritorio compatible.
2. Exista una arena de exactamente 25 × 25 metros con módulos de 1 metro.
3. Se pueda seleccionar entre seis avatares provisionales.
4. El avatar seleccionado aparezca en la arena.
5. El usuario pueda moverse mediante WASD.
6. El ratón controle la orientación de la cámara FPS.
7. Las colisiones impidan atravesar las paredes.
8. La vista FPS ocupe la región principal de la interfaz.
9. La cámara cenital funcione simultáneamente en el panel lateral.
10. El usuario pueda activar el micrófono.
11. El sistema reconozca distintas expresiones válidas para Lanzallamas.
12. Al reconocer un comando válido, la habilidad correspondiente se ejecute.
13. Protección y Dash funcionen mediante voz.
14. Los ataques no dependan de botones de teclado o ratón.
15. El usuario pueda continuar desplazándose y apuntando durante el reconocimiento de voz.
16. Los errores del reconocimiento se comuniquen sin bloquear la partida.
17. Las configuraciones de criaturas y habilidades puedan modificarse sin reescribir el motor.

## 15. Instrucciones finales para Codex

Actúa como desarrollador principal y arquitecto técnico del prototipo.

Antes de implementar, inspecciona los archivos disponibles y presenta una arquitectura breve del sistema.

No inventes modelos definitivos ni mecánicas no solicitadas.

Cuando falten recursos artísticos, utiliza geometría provisional claramente identificada como tal.

Implementa primero la Fase 1 y deja una versión ejecutable y verificable.

Ejecuta las pruebas que permita el entorno y corrige los problemas detectados.

Si alguna prueba exige interacción humana, acceso al micrófono o inspección visual, indícalo expresamente en lugar de afirmar que funciona sin haberlo comprobado.

Crea un README con instrucciones para instalar dependencias, ejecutar el proyecto, realizar pruebas y compilar la versión web.

Mantén un archivo AGENTS.md con las reglas esenciales del proyecto para que futuras tareas no contradigan sus fundamentos.

**Recuerda que la innovación principal no está en la complejidad gráfica: está en crear una experiencia de combate en la que el jugador se desplaza y apunta en tiempo real, pero debe pronunciar una habilidad para ejecutarla.**

Ese comportamiento debe guiar las decisiones de arquitectura, interfaz y programación.
