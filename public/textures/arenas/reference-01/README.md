# Textura de arena de referencia 01

`floor-layout.png` es una copia intacta de `asset_para arena 3d.png`, suministrada por el usuario. Resolución 500×500 px.

La imagen representa la arena COMPLETA de 25×25 m, no una textura para repetir en cada cubo: 500/25 = 20 px por metro. El rectángulo negro central representa la huella de la barrera del OBJ (11×1 m).

La esquina superior izquierda del PNG corresponde a X=-12.5, Z=-12.5, y la inferior derecha a X=+12.5, Z=+12.5. El render utiliza un plano de textura a Y=0 con polygonOffset, sobre los 625 cubos métricos. No añade colisiones ni cambia la altura del suelo.

Mantén imágenes en `textures/`, geometría en `models/` y configuración física en `src/config/`. Cambiar una textura nunca modifica metros o colisiones.
