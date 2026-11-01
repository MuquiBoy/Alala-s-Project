"""Rebuild the CC0-derived charge landing sound without external packages."""
from array import array
from pathlib import Path
import hashlib
import math
import random
import wave

folder = Path(__file__).resolve().parents[1] / 'public/audio/creatures/avatar-01'
rate = 22050


def read_mono(path: Path) -> list[float]:
    with wave.open(str(path), 'rb') as sound:
        if sound.getnchannels() != 1 or sound.getsampwidth() != 2 or sound.getframerate() != rate:
            raise ValueError(f'Expected mono PCM16 {rate} Hz: {path}')
        samples = array('h')
        samples.frombytes(sound.readframes(sound.getnframes()))
    return [sample / 32768 for sample in samples]


def at(samples: list[float], position: float) -> float:
    if position < 0 or position >= len(samples) - 1:
        return 0
    index = int(position)
    return samples[index] * (1 - position % 1) + samples[index + 1] * (position % 1)


step_a = read_mono(folder / 'heavy-step-01.wav')
step_b = read_mono(folder / 'heavy-step-02.wav')
rng = random.Random(617)
noise_low = 0.0
output: list[float] = []

for index in range(round(rate * 1.05)):
    t = index / rate
    # The same gritty CC0 contact as a step, slowed down and layered with a second impact.
    contact = 0.67 * at(step_a, t * rate * 0.72)
    contact += 0.23 * at(step_b, (t - 0.08) * rate * 0.78)
    # Short low-frequency body resonance and settling gravel, authored for this demo.
    body = 0.26 * math.sin(2 * math.pi * (74 * t - 20 * t * t)) * math.exp(-7.2 * t)
    body += 0.08 * math.sin(2 * math.pi * 42 * max(0, t - 0.07)) * math.exp(-9 * max(0, t - 0.07)) if t >= 0.07 else 0
    noise_low = 0.83 * noise_low + 0.17 * rng.uniform(-1, 1)
    debris = noise_low * (0.18 * math.exp(-27 * t) + (0.08 * math.exp(-19 * (t - 0.11)) if t >= 0.11 else 0))
    fade_in = min(1, t / 0.003)
    fade_out = min(1, (1.05 - t) / 0.14)
    output.append(math.tanh((contact + body + debris) * 1.5) * max(0, fade_in * fade_out))

peak = max(abs(sample) for sample in output)
scale = 0.81 / peak
pcm = array('h', (round(max(-1, min(1, sample * scale)) * 32767) for sample in output))
path = folder / 'heavy-landing.wav'
with wave.open(str(path), 'wb') as sound:
    sound.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
    sound.writeframes(pcm.tobytes())

rms = math.sqrt(sum(sample * sample for sample in output) / len(output)) * scale
print(f'{path.name}: {len(output)/rate:.3f}s, peak 0.81, RMS {rms:.3f}, SHA256 {hashlib.sha256(path.read_bytes()).hexdigest()}')
