"""Optional asset-authoring step (NumPy); playback/build uses only the committed WAV files.
Source MP3 decoded to mono 22050 Hz float32 using Chrome OfflineAudioContext in work/.
Never records a microphone or plays audio. CC0 provenance is in the asset manifest.
"""
import hashlib, json, wave
from pathlib import Path
import numpy as np

RATE = 22050
source = Path("work/audio-sources/synth-fire.mp3")
x = np.fromfile("work/audio-sources/synth-fire.f32", dtype="<f4").astype(np.float64)
assert len(x) > RATE * 3
# Remove DC, tame sharp upper frequencies, retain low synthetic grain.
x -= np.mean(x)
freq = np.fft.rfftfreq(len(x), 1 / RATE)
x = np.fft.irfft(np.fft.rfft(x) / (1 + (freq / 2600) ** 4), n=len(x))
folder = Path("public/audio/flamethrower")
folder.mkdir(parents=True, exist_ok=True)
rows = []
def save(name, audio):
    audio = np.tanh(audio * 2.0)
    audio *= 0.60 / max(0.60, np.max(np.abs(audio)))
    pcm = (audio * 32767).astype("<i2").tobytes()
    path = folder / (name + ".wav")
    with wave.open(str(path), "wb") as out:
        out.setparams((1, 2, RATE, 0, "NONE", "not compressed")); out.writeframes(pcm)
    rows.append({"file": path.name, "seconds": round(len(audio)/RATE, 3), "peak": round(float(np.max(np.abs(audio))), 4),
                 "rms": round(float(np.sqrt(np.mean(audio**2))), 4), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})

n = round(0.22 * RATE); t = np.arange(n) / RATE
ignite = x[round(0.45*RATE):round(0.45*RATE)+n] * 0.72 + np.sin(2*np.pi*(480*t-650*t*t))*np.exp(-t*18)*0.08
ignite *= np.minimum(1, t/0.012) * np.minimum(1, (0.22-t)/0.07)
save("ignite", ignite)
loop = x[RATE:3*RATE].copy(); cross = round(0.15*RATE); ramp = np.linspace(0, 1, cross)
loop[:cross] = loop[-cross:]*(1-ramp) + loop[:cross]*ramp
loop = loop[:-cross] * 2.0
save("sustain", loop)
n = round(0.34*RATE); t = np.arange(n)/RATE
end = (x[3*RATE:3*RATE+n][::-1] * 1.5 + np.sin(2*np.pi*(170*t-130*t*t))*0.035) * np.minimum(1,t/0.012) * (1-t/0.34)**1.7
save("extinguish", end)
manifest = {
    "license": "CC0-1.0", "author": "Spring Spring", "sourcePage": "https://opengameart.org/content/synthesized-fire-sound-effect",
    "sourceFile": "https://opengameart.org/sites/default/files/fire_sound_effect_0.mp3",
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "processing": "Mono 22050 Hz, DC removal, 2600 Hz low-pass, soft saturation, seamless crossfade loop, short electronic sweeps authored for this demo, attack/release envelopes.",
    "evaluation": "Waveform, spectrum, RMS, peak and offline decoding checked without audible playback. Aesthetic listening and speaker/microphone echo require manual testing.",
    "assets": rows,
}
(folder/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print(json.dumps(rows))
