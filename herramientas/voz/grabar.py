"""Graba los audios del instructor con Kokoro-82M (voz neuronal, licencia Apache-2.0).
Uso: python grabar.py <modelo.onnx> <carpeta de voces .bin> <trabajos.json> <carpeta voz/v1>
Ver LEEME.md para conseguir el modelo y las voces."""
import json, os, subprocess, sys, numpy as np
from kokoro_onnx import Kokoro

modelo, voces, trabajos, salida = sys.argv[1:5]
solo = sys.argv[5] if len(sys.argv) > 5 else ''
jobs = [j for j in json.load(open(trabajos, encoding='utf-8')) if solo in j['id']]
npz = os.path.join(os.path.dirname(os.path.abspath(trabajos)), 'voces-es.npz')
np.savez(npz, **{v: np.fromfile(os.path.join(voces, v + '.bin'), dtype=np.float32).reshape(510, 1, 256)
                 for v in sorted({j['voz'] for j in jobs})})
k = Kokoro(modelo, npz)
SR = 24000

def pulir(a):
    """Corta el silencio de los bordes y deja todas las frases con el mismo volumen."""
    a = a.astype(np.float32)
    env = np.convolve(np.abs(a), np.ones(240) / 240, 'same')
    on = np.where(env > 0.02 * env.max())[0]
    if len(on):
        a = a[max(0, on[0] - int(.03 * SR)):min(len(a), on[-1] + int(.07 * SR))]
    voz = env[env > 0.05 * env.max()]
    rms = np.sqrt(np.mean(a[np.abs(a) > 0.02 * np.abs(a).max()] ** 2)) if len(voz) else 0
    g = min(0.1 / rms if rms else 1, 0.95 / (np.abs(a).max() or 1))
    a = a * g
    f = int(.008 * SR)
    a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
    return a

hechos = 0
for j in jobs:
    dest = os.path.join(salida, j['g'], j['id'] + '.mp3')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    a, sr = k.create(j['dice'], voice=j['voz'], speed=j['ritmo'], lang='es-419')
    assert sr == SR
    pcm = pulir(a).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-codec:a', 'libmp3lame', '-b:a', '40k', '-map_metadata', '-1', dest], input=pcm, check=True)
    hechos += 1
    if hechos % 50 == 0:
        print(hechos, '/', len(jobs), flush=True)
print('listo', hechos)
