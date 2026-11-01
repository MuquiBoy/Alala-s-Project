# Modelo español local

Nombre: vosk-model-small-es-0.42, Alpha Cephei. Fuente y licencia: https://alphacephei.com/vosk/models (Apache 2.0).

El archivo model.tar.gz se prepara con scripts/prepare_voice_model.py. Conserva los pesos originales y registra hashes en manifest.json. El cambio de contenedor incluye directorios y permisos explícitos para el cargador.

Los pesos no se entrenaron con voces del usuario. El vocabulario de órdenes y ejemplos negativos se construye en ejecución desde configuración y alias confirmados. No se guarda audio.

El modelo está en la distribución compilada y excluido de Git. Desde una copia nueva usa pnpm model:prepare antes de compilar. La licencia Apache completa y los avisos del runtime están en public/vendor/vosk/.
