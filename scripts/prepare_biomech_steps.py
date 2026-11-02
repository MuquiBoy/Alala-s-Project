"""Deterministic original contact textures over the existing CC0 heavy steps.
The private Cell reference is NOT read, sampled, copied or required to regenerate.
NumPy authoring only; runtime/build consume the finished PCM files.
"""
from pathlib import Path
import hashlib, json, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'public/audio/creatures/avatar-01'
RATE = 22050

def read(path):
    with wave.open(str(path), 'rb') as w:
        assert w.getnchannels() == 1 and w.getframerate() == RATE and w.getsampwidth() == 2
        return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(float) / 32768

def write(path, x):
    with wave.open(str(path), 'wb') as w:
        w.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())

def band_noise(rng, n, low, high):
    f = np.fft.rfftfreq(n, 1 / RATE)
    spectrum = np.fft.rfft(rng.normal(size=n))
    shape = (1 - np.exp(-(f / low)**4)) / (1 + (f / high)**6)
    result = np.fft.irfft(spectrum * shape, n=n)
    return result / max(1e-6, np.std(result))

assets, sounds = [], []
for index in range(4):
    rng = np.random.default_rng(9010 + index)
    duration = .58 + index * .005
    n = round(duration * RATE); t = np.arange(n) / RATE
    source = read(FOLDER / f'heavy-step-{index + 1:02}.wav')
    # Align the broad contact onset; retain the old low-frequency identity underneath.
    window = round(.008 * RATE)
    envelope = np.convolve(source**2, np.ones(window)/window, mode='same')
    threshold = envelope.max() * .15
    first = int(np.flatnonzero(envelope > threshold)[0])
    source = source[max(0, first - round(.005 * RATE)):]
    old = np.zeros(n); old[:min(n, len(source))] = source[:n]
    f = np.fft.rfftfreq(n, 1 / RATE)
    heavy = np.fft.irfft(np.fft.rfft(old) / (1 + (f / 700)**4), n=n)
    heavy *= .76 / max(.001, abs(heavy).max())
    # Original damped, inharmonic resonances: chitin shell flex, not a voice sample.
    freq = (1050 + index * 43) * np.exp(-t * 13) + 390
    phase = 2*np.pi*np.cumsum(freq)/RATE
    flex = (np.sin(phase + 1.15*np.sin(phase*.37)) + .32*np.sin(phase*1.73))
    flex *= .15 * np.exp(-t*28) * (1 - np.exp(-t*700))
    crackle = band_noise(rng, n, 750, 3200) * .065 * np.exp(-t*42)
    joint = band_noise(rng, n, 260, 1700) * .025 * np.exp(-t*10) * (1 + .35*np.sin(2*np.pi*61*t))
    body = .19*np.sin(2*np.pi*(66*t - 14*t*t))*np.exp(-t*19)
    x = heavy*.62 + body + flex + crackle + joint
    # Contact is at t=0; 2 ms click protection and short tail fit the 0.4 s foot cadence.
    x *= np.minimum(1, t/.002) * np.minimum(1, (duration-t)/.09)
    x *= np.exp(-np.maximum(0, t-.21)*6)
    x = np.tanh(x*1.3); x *= .69/max(.001, abs(x).max())
    x = np.round(x*4095)/4095
    path = FOLDER / f'biomech-step-{index + 1:02}.wav'
    write(path, x); sounds.append(x)
    assets.append({'file': path.name, 'seconds': round(n/RATE, 4),
                   'peak': round(float(abs(x).max()), 4), 'rms': round(float(np.sqrt(np.mean(x*x))), 4),
                   'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

manifest = {
    'name': 'Avatar 01 — pisada biomecánica v1',
    'source': 'Existing CC0 AudioPapkin heavy-step derivatives plus original procedural synthesis.',
    'reference': 'Cell\'s Walk Sound.mp3 supplied privately by the user; timbre reference only, no samples in these assets.',
    'reference_analysis': {'duration_seconds': 4.7833, 'approx_contact_spacing_seconds': .58,
                           'energy_500_to_4000_hz_fraction': .881,
                           'method': 'Decoded waveform and spectrum. Not a claim of subjective listening.'},
    'design': 'Low heavy body + short inharmonic shell flex + filtered mechanical/chitin crackle. Four subtle variations.',
    'timing': 'Animation touchdown events own timing. No audio clock, no movement adjustment to fit the reference.',
    'format': 'Mono PCM16, 22050 Hz; playbackRate=1; pre-existing heavy landing remains separate.',
    'assets': assets,
    'evaluation': 'Decoding, onset, spectrum and peak verified. Perceived balance and room/microphone feedback require player listening.',
}
(FOLDER/'biomech-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
# Player-facing audition at the real straight-walk cadence (.8 m/s, 1.28 m per cycle).
preview = np.zeros(round(7.2*RATE))
for step in range(16):
    start = round((.35 + step*.4)*RATE)
    sample = sounds[(step*3)%4] * (.65 if step%2 else .65*.94)
    preview[start:start+len(sample)] += sample
write(ROOT/'models/avatar_01/avatar-01_pisadas-propuesta.wav', preview)
print(json.dumps(manifest, ensure_ascii=False))
