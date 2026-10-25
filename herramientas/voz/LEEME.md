# Voz natural del instructor

Las frases que el instructor dice en voz alta están grabadas en `voz/v1/h` (hombre) y `voz/v1/m` (mujer).
Se grabaron con Kokoro-82M, una voz neuronal de código abierto (licencia Apache-2.0), con pronunciación latinoamericana.
Hombre: voz `em_alex`. Mujer: voz `ef_dora`.

## Qué se graba
- Cada frase de `VB` en `app.js`, en los tres tonos (suave, firme, sargento).
- Los nombres de `VB_NOM`, dos veces: tranquilo (`n/`) y gritado (`nx/`, para el sargento).

## Cómo grabar de nuevo
1. Si cambias frases o nombres, graba en una carpeta nueva (`voz/v2`) y cambia `VOZ_DIR` en `app.js` y `VOZ` en `sw.js`,
   porque los teléfonos guardan las grabaciones para siempre.
2. Modelo: paquete npm `kokoro-q8-shards@1.0.0` (unir `kokoro-q8.part0..5.bin` en un solo `.onnx`).
   Voces: carpeta `voices/` del paquete npm `kokoro-js@1.2.1`.
3. `pip install kokoro-onnx soundfile` y tener `ffmpeg`.
4. `node herramientas/voz/frases.mjs > trabajos.json`
5. `python herramientas/voz/grabar.py modelo.onnx voices/ trabajos.json voz/v2`
