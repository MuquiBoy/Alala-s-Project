# Investigación y adaptación del sistema de voz

Consultado el 31 de octubre de 2026. Las fuentes orientan una implementación original del canal de combate; no se ha copiado código comercial de videojuegos.

## Precedentes de interacción

La ficha del desarrollador de [In Verbis Virtus](https://store.steampowered.com/app/242840/In_Verbis_Virtus/) describe el uso de voz real para lanzar hechizos. Confirma un precedente de interacción verbal; no se revisó o incorporó su motor comercial.

La documentación de [VoiceAttack](https://voiceattack.com/howto.aspx) explica que reducir la espera puede interpretar sólo el comienzo de una frase. Su [manual](https://www.voiceattack.com/VoiceAttackHelpV2.pdf) describe umbrales de confianza y reconocimiento anticipado. Esta demo espera resultados finales inicialmente y hace explícito el modo temprano experimental.

Estas fuentes no constituyen una búsqueda de patentes ni una conclusión sobre novedad jurídica.

## Código abierto revisado y utilizado

- [Vosk-Browser: README y API](https://github.com/ccoreilly/vosk-browser/blob/master/lib/README.md): modelo WebAssembly local en Worker, audio y resultados parciales/finales.
- [Model y KaldiRecognizer](https://github.com/ccoreilly/vosk-browser/blob/master/lib/src/model.ts): creación, gramática JSON, transferencia de PCM y liberación de recursos.
- [Worker](https://github.com/ccoreilly/vosk-browser/blob/master/lib/src/worker.ts): clasificación separada del render y ciclo de reconocedores.
- [Carga y extracción](https://github.com/ccoreilly/vosk-browser/blob/master/src/vosk.post.js): estructura de archivo y caché.
- [Gramática oficial Vosk](https://github.com/alphacep/vosk-api/blob/master/python/example/test_words.py): vocabulario acotado y categoría desconocida.
- [Licencia Vosk-Browser](https://github.com/ccoreilly/vosk-browser/blob/master/COPYING): Apache 2.0, conservada en public/vendor/vosk/.

Se fijó vosk-browser 0.0.8. El proyecto prepara una distribución desde npm y adapta dos llamadas de sincronización de caché del modelo, manteniendo la inferencia en RAM. El resultado conserva avisos y registra hashes; el script valida exactamente las dos sustituciones.

El [catálogo oficial](https://alphacephei.com/vosk/models) identifica vosk-model-small-es-0.42 como un modelo español ligero de 39 MB y licencia Apache 2.0. Se conserva procedencia y hash. El empaquetado tar incluye directorios explícitos requeridos por el cargador.

La guía de [adaptación de Vosk](https://alphacephei.com/vosk/adaptation) distingue vocabulario dinámico, adaptación de lenguaje y ajuste acústico con datos. Esta entrega adapta el vocabulario y compila su gramática en ejecución. Los pesos acústicos permanecen preentrenados. No hay grabaciones de usuarios ni ajuste acústico presentado como realizado.

## APIs de navegador

Según [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), algunos navegadores usan un servicio remoto; continuous no garantiza escucha permanente. [interimResults](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/interimResults) expone hipótesis revisables. Se muestran estados y se deduplican resultados.

[phrases](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/phrases) ofrece sesgo contextual experimental, utilizado sólo si existe. [processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally) es experimental y se verifica antes de exigir procesamiento local. La ruta sólo local no cambia automáticamente al servicio remoto.

## Decisiones de diseño

Una gramática formada únicamente por ataques podría convertir ruido o conversación en el comando más cercano. Se incluyen negaciones, ejemplos descriptivos y desconocidos; el intérprete posterior exige una orden completa.

La detección energética conserva pre-roll y cola de silencio, evitando clasificar silencio ilimitado. Los alias personales se añaden con confirmación. La calibración puntúa muestras etiquetadas sin ejecutar combate.

La evidencia acústica actual es sintética, con una sola voz española y variaciones de velocidad. Las mejoras futuras deben medirse con voces, micrófonos y ruido del jugador, conservando un conjunto de evaluación separado.
