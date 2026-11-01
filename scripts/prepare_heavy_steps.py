"""Optional NumPy asset authoring; game/build uses committed WAVs. No audible playback."""
from pathlib import Path
import hashlib, json, wave
import numpy as np
rate = 22050
source = Path("work/audio-sources/monster-gravel.mp3")
x = np.fromfile("work/audio-sources/monster-gravel.f32", dtype="<f4").astype(np.float64)
folder = Path("public/audio/creatures/avatar-01")
folder.mkdir(parents=True, exist_ok=True)
assets = []
for index, peak in enumerate([3.751, 7.114, 12.053, 15.395]):
    start = peak - 0.055
    clip = x[round(start*rate):round((start+0.48)*rate)]
    # Slower contact, softened gravel and short resonant low end for a retro heavy creature.
    pitch = 0.81 + index*0.012
    a = np.interp(np.arange(0,len(clip)-1,pitch),np.arange(len(clip)),clip)
    a -= a.mean()
    f = np.fft.rfftfreq(len(a),1/rate)
    eq = (1-np.exp(-(f/30)**2)) / (1+(f/1800)**4) * (1+0.8*np.exp(-((f-105)/70)**2))
    a = np.fft.irfft(np.fft.rfft(a)*eq,n=len(a))
    t = np.arange(len(a))/rate
    a += 0.09*(np.sin(2*np.pi*(72*t-22*t*t))+0.35*np.sin(2*np.pi*144*t))*np.exp(-t*13)
    a *= np.minimum(1,t/0.006)*np.minimum(1,(len(a)/rate-t)/0.13)
    a = np.tanh(a*1.5); a *= 0.72/max(0.001,np.max(np.abs(a)))
    a = np.round(a*2047)/2047  # restrained 12-bit grain, PCM16 container
    path=folder/f"heavy-step-{index+1:02}.wav"
    with wave.open(str(path),"wb") as w:
        w.setparams((1,2,rate,0,"NONE","not compressed")); w.writeframes((a*32767).astype("<i2").tobytes())
    assets.append({"file":path.name,"sourcePeakSeconds":peak,"seconds":round(len(a)/rate,4),"rms":round(float(np.sqrt(np.mean(a*a))),4),"sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
(folder/"manifest.json").write_text(json.dumps({
    "author":"AudioPapkin","license":"CC0-1.0",
    "sourcePage":"https://freesound.org/people/AudioPapkin/sounds/712066/",
    "sourceFile":"https://cdn.freesound.org/previews/712/712066_8698658-hq.mp3",
    "sourceFormat":"Public high-quality MP3 preview of Monster footsteps on gravel; original WAV was not downloaded.",
    "sourceSha256":hashlib.sha256(source.read_bytes()).hexdigest(),
    "processing":"Four contact crops, pitch reduction, 30 Hz high-pass / 1800 Hz low-pass, bass emphasis, original short resonant layer, fades, soft saturation, 12-bit grain, mono PCM16 22050 Hz.",
    "evaluation":"Waveform, spectrum, peak and decoding only; aesthetic listening is pending the player's test.",
    "assets":assets},indent=2)+"\n",encoding="utf-8")
print(json.dumps(assets))
