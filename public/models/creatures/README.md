# Modelos de criaturas

Reservado para modelos GLB/glTF futuros. Usa una carpeta por identificador (`avatar-01/`, etc.).

Convención: metros, pies a Y=0 y frente hacia -Z. La cámara y la colisión se configuran por separado en `src/config/creatures.ts`. El importador de `src/render/AvatarView.ts` ya acepta `{ kind: 'gltf', url, scale }`.

Los campos opcionales cameraAnchor y emissionAnchor reservan nombres de nodos para fases posteriores; la Fase 1 utiliza únicamente offsets configurados y no reproduce animaciones. Verifica colisiones y offsets al sustituir un modelo.
