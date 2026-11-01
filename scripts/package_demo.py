"""Package the tested source and prebuilt local demo, without dependencies or work data."""
from pathlib import Path
import os, zipfile

project = Path(__file__).resolve().parent.parent
bundle = project.parent / "ALALAS-CHILDREN-0.5.2-Demo-local.zip"
excluded = {".git", ".godot", "node_modules", "test-results", "playwright-report", "coverage", "work", "__pycache__"}
duplicates = {"public/models/speech/vosk-es/model.tar.gz", "public/vendor/vosk/vosk.js"}
count = 0
with zipfile.ZipFile(bundle, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for folder, directories, files in os.walk(project):
        directories[:] = sorted(d for d in directories if d not in excluded)
        for filename in sorted(files):
            source = Path(folder) / filename
            relative = source.relative_to(project)
            if relative.as_posix() in duplicates:
                continue
            archive.write(source, Path("ALALA'S CHILDREN") / relative)
            count += 1
with zipfile.ZipFile(bundle) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    for suffix in ["/dist/index.html", "/src/attacks/registry.ts", "/tests/training.test.ts", "/COMANDOS-LANZALLAMAS.txt",
                   "/dist/models/speech/vosk-es/model.tar.gz", "/dist/vendor/vosk/vosk.js",
                   "/docs/SYNTHETIC_AUDIO_REPORT.json", "/public/vendor/vosk/APACHE-2.0.txt",
                   "/dist/models/arenas/training-02/arena-v2.obj", "/dist/textures/arenas/training-02/floor-layout-v2.png",
                   "/dist/audio/flamethrower/sustain.wav", "/dist/audio/creatures/avatar-01/heavy-step-01.wav",
                   "/dist/audio/creatures/avatar-01/heavy-landing.wav"]:
        assert any(name.endswith(suffix) for name in names), suffix
    assert not any("/node_modules/" in name or "/.git/" in name or "/work/" in name for name in names)
print(f"{count} files. ZIP verified. {bundle.stat().st_size:,} bytes.\n{bundle}")
