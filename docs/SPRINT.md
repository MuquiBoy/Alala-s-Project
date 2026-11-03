# Estampida mecánica — Avatar 01

Controles: mantener Shift + W; A/D dirigen progresivamente el avance; S frena. La cámara gira libremente sin cambiar el rumbo comprometido. Al soltar Shift se recupera la marcha habitual. Las habilidades continúan activándose por voz.

Parámetros en src/config/sprint.ts: marcha 0.80 m/s (config/creatures), carrera 4.00 m/s, aceleración 1.7 s desde la marcha, frenado 1.2 s hasta la marcha, giro 70 grados/s (radio a máxima velocidad ~3.27 m). Resistencia 100, consumo 10/s, espera 1.5 s, recuperación 15/s y desbloqueo tras agotamiento a 20. Los tiempos incluyen la aceleración. En ausencia de WASD se frena hasta detenerse. Al preparar Embestida se abandona la carrera y se limita el movimiento al 15% de 0.80 m/s, preservando su preparación de 2 s.

Masa de simulación: 500 kg = 10 unidades universales. Masa narrativa: superior a 1500 kg, referencia artística sin efecto en daño o impulsos. Arena: 50 x 50 m.

Recurso editable nuevo: models/avatar_01/avatar-01_rigged_v3.blend. Exportación lista para juego: public/models/avatar-01/avatar-01_rigged_v3.glb. Se conservan las seis acciones anteriores y se agrega Run_Stampede. Ciclo in situ de 0.6 s, distancia de referencia 2.4 m. Secuencia posterior izquierda, anterior izquierda, posterior derecha, anterior derecha; apoyos secuenciales, flexión, compresión del torso y elevación de pie mayor. Mezcla continua según velocidad real, fijación de apoyos por IK y sonido derivado del contacto de cada pata. Giro y frenado se resuelven combinando dirección corporal, mezcla y colocación de pies; no son clips separados. No se añaden caras, vértices ni subdivisión. El archivo fuente v2 se conserva.

El servidor calcula carrera, resistencia y orientación a paso fijo; cada snapshot transmite los estados a ambos clientes. La interfaz local no puede conceder resistencia ni velocidad adicional. Rondas nuevas restablecen resistencia. El retrato y la cámara FPS mantienen sus controles; la tercera persona comparte el esqueleto animado.

Fundamento: la locomoción rápida de elefantes mantiene apoyos sin fase aérea global y presenta una transición gradual a mecanismos elásticos. Se usa como inspiración, sin afirmar una reproducción biomecánica exacta:
https://pmc.ncbi.nlm.nih.gov/articles/PMC2705974/
https://pmc.ncbi.nlm.nih.gov/articles/PMC2872429/

Comparación de persecución: 4 m/s supera 2.5 y 3.5 m/s en recta a velocidad sostenida; queda por debajo de 4.5 m/s. La aceleración y la geometría de la arena determinan si se alcanza realmente a un adversario. Frenado 4 -> 0.8 m/s: distancia ideal 2.88 m. Aceleración desde 0.8 y diez segundos totales: unos 37.28 m sin colisiones.

Recomendación: validar con jugadores el giro A/D mientras apuntan independientemente, y revisar visualmente cambios diagonales rápidos. Los parámetros oficiales se mantienen. Futuro: una pose de frenado más marcada y apoyo sobre superficies con distinta altura; no se añadieron capas de audio ni vibraciones fuertes.

Solo se corre hacia adelante: Shift + S no activa carrera; durante la inercia, S frena hasta recuperar la velocidad de marcha antes de permitir retroceso. La animación Run_Stampede requiere el estado de carrera/desaceleración, para no confundirse con empujones externos. Comprobaciones: 182 pruebas unitarias aprobadas; 12 escenarios generales aprobados, locomoción v3 y combate PvP con revancha aprobados al repetir en servidor actualizado, y escenario de sprint con dos clientes aprobado tras corregir actualización independiente de la barra de resistencia. El primer intento PvP reutilizó un servidor anterior; se habilitó un puerto de pruebas configurable para evitarlo. Falta valoración artística del jugador y medición con dos micrófonos reales.
