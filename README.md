# ALALA'S CHILDREN · Alala's Project

Demo técnica 0.7.0 de combate 3D por voz, con entrenamiento individual y salas privadas PvP para dos jugadores. Ambos usan Avatar 01: tanque cuadrúpedo de 500 kg, modelo low-poly animado, marcha pesada de 0,8 m/s y cabeza orientada independientemente del cuerpo. Arena de 50 × 50 m, con casillas de 1 m.

Repositorio principal: [MuquiBoy/Alala-s-Project](https://github.com/MuquiBoy/Alala-s-Project). Conserva Three.js, TypeScript, Vite y Rapier.

## Instalar desde GitHub

Requisitos: Node.js **24**, pnpm **11.25.0**, Python **3** y Chrome o Edge de escritorio. Internet para instalar dependencias y descargar el modelo español (~39 MB).

```sh
git clone https://github.com/MuquiBoy/Alala-s-Project.git
cd Alala-s-Project
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
python scripts/prepare_voice_model.py
pnpm build
pnpm start
```

En Linux, utiliza `python3` si `python` no existe. Abre **http://127.0.0.1:4179**. En Windows, después de instalar y compilar, también puedes abrir **JUGAR.cmd**. Mantén abierto el servidor mientras juegas. No abras index.html mediante file://. `pnpm dev` y `pnpm preview` sirven para trabajar en el cliente; el PvP completo usa **pnpm build + pnpm start**.

El repositorio contiene código, modelo GLB con texturas y animaciones, arena, efectos y licencias. Dependencias, `dist/`, `server-dist/`, runtime Vosk generado y pesos de voz descargados se reconstruyen con esos comandos. No requiere Blender ni archivos privados de este equipo.

## Jugar

**Solitario:** elige Jugar en solitario. Se conserva el campo de entrenamiento con cuatro enemigos magenta reactivos y un blanco verde móvil.

**PvP:** elige Multijugador PvP, copia el enlace y compártelo. Cuando estén ambos conectados, cada jugador confirma Avatar 01, configura su micrófono y pulsa Entrar en la arena. La ronda empieza cuando los dos hayan entrado. El servidor valida movimiento, habilidades, recargas, daño y ganador. Una tercera conexión se rechaza. Al acabar, ambos pueden pedir revancha.

Un enlace localhost o 127.0.0.1 sólo sirve en el equipo del servidor. Para distintas redes se necesita una dirección pública **HTTPS con WebSocket seguro**. Los jugadores sólo abren el enlace en su navegador; no instalan el juego. GitHub guarda el código; GitHub Pages por sí solo no ejecuta este servidor PvP.

1. Pulsa Configurar voz; Vosk español local es el motor predeterminado.
2. Lee el aviso, marca el consentimiento y pulsa Activar micrófono. Espera a Escuchando.
3. Entra en la arena: **WASD** desplaza y el **ratón** apunta. Todas las habilidades se activan por voz.
4. **Esc** libera el cursor y detiene el micrófono. En solitario pausa la simulación; en PvP la ronda continúa. Una desconexión real congela la sala hasta recuperar al jugador.

| Orden | Habilidad |
| --- | --- |
| Lanzallamas / ataca con llamas / contraataca con fuego | Cono de 10 m y casillas calientes temporales; respeta obstáculos |
| Ráfaga / dispara | Serie de proyectiles con trayectoria propia |
| Blindaje / protégete | Reducción temporal de daño térmico y de proyectiles |
| Embestida / embiste | Preparación de 2 s, dash o salto según la mirada; contacto de 30 puntos y transferencia física de impulso |

La masa afecta impulsos, no reduce el daño automáticamente. Ambos avatares PvP pesan 500 kg. Las repeticiones dentro de una intervención se deduplican; no aceleran recargas. [COMANDOS-LANZALLAMAS.txt](COMANDOS-LANZALLAMAS.txt) se genera desde las 64 órdenes integradas, sin variantes de cortesía. [Biblioteca de ataques](docs/ATTACKS.md).

## Animación, sonido y voz

La marcha combina avance, retroceso y giros con apoyos de las cuatro patas. Idle expande y contrae el cuerpo con compensación de extremidades. La cabeza gira horizontalmente sin inclinarse al apuntar arriba o abajo. Las nuevas pisadas biomecánicas salen del contacto de cada pie; la caída pesada conserva su efecto independiente. No se añaden caras al modelo. [Locomoción](docs/AVATAR_LOCOMOTION.md).

Vosk usa pesos españoles preentrenados; no se entrenó una red con voces del jugador. El servidor PvP recibe identificadores de habilidad, nunca audio ni transcripciones. Web Speech es una alternativa voluntaria que puede usar el servicio del navegador, con consentimiento explícito. [Pruebas con voz real](docs/HUMAN_VOICE_TEST.md).

## Organización

| Ruta | Contenido |
| --- | --- |
| `src/attacks/` | Biblioteca modular global: configuración, gramática y comportamiento |
| `src/config/` | Arena, criaturas, masas, habilidades equipadas y locomoción |
| `src/combat/`, `src/physics/` | Simulación reutilizada por entrenamiento y servidor PvP |
| `src/network/` | Protocolo, salas, servidor autoritativo y cliente WebSocket |
| `src/voice/` | Reconocedores, intérprete y deduplicación |
| `src/render/`, `src/identity/`, `src/audio/` | Modelo, animación, apoyos y sonido |
| `public/` | Modelos, texturas, audio, manifiestos y licencias necesarios para jugar |
| `scripts/` | Preparación reproducible de voz y recursos |
| `tests/` | Pruebas unitarias y de navegador, incluidos dos clientes PvP |
| `docs/` | Arquitectura, referencias y evidencias |
| `.github/workflows/` | Instalación, pruebas y compilación automática |

Se tomó como referencia la separación de recursos, servidor, pruebas e instrucciones de [Jardines y Mazmorras](https://github.com/MuquiBoy/jardines-y-mazmorras), conservando la arquitectura 3D de este proyecto. No se copian sus reglas, motor 2D ni configuración de GitHub Pages.

## Verificar

```sh
pnpm test
pnpm build
pnpm test:browser
```

Las pruebas de navegador requieren Chrome instalado y se ejecutan sin ventana, silenciadas, con un trabajador. El PvP usa dos contextos independientes y transcripciones simuladas; esto no valida acentos ni micrófonos humanos. [Verificación](docs/VERIFICATION.md) y [arquitectura PvP](docs/PVP.md).

## Despliegue en Render

El archivo [render.yaml](render.yaml) configura un único servicio Node en el plan **Free**, sin base de datos ni disco de pago. Conecta este repositorio a un Blueprint, rama main y ruta render.yaml. Compila cliente y servidor, prepara el modelo de voz y escucha el puerto que Render asigna. Comparte la dirección HTTPS generada por Render; cada sala obtiene su propio enlace.

El plan gratuito puede suspender el servicio después de 15 minutos sin actividad y tardar alrededor de un minuto en reactivarse. Las salas en memoria se pierden al reiniciar o desplegar. Hay cuotas de horas, transferencia y compilación compartidas por el espacio de trabajo; no se configura ninguna ampliación de pago. [Condiciones del plan Free](https://render.com/docs/free).

## Límites

Salas privadas sin cuentas, matchmaking ni persistencia. Desaparecen al reiniciar el servidor y vencen tras dos minutos sin conexiones. Hasta 16 salas como límite de protección, no como capacidad certificada bajo carga. El movimiento usa confirmación del servidor e interpolación; la latencia alta puede sentirse. La experiencia entre redes reales y micrófonos físicos requiere la prueba de ambos jugadores.

Los originales Blender y materiales de trabajo permanecen locales; el GLB publicado contiene lo necesario para jugar. El audio de referencia de Cell no se incluye ni se usa como muestra. Los avisos y licencias de terceros permanecen junto a cada recurso.
