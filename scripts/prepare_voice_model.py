"""Repackage the official Spanish model for Vosk-Browser; no acoustic weights are trained or changed."""
from pathlib import Path
import gzip
import hashlib
import io
import json
import tarfile
import urllib.request
import zipfile

root = Path(__file__).resolve().parent.parent
source_url = 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip'
cached = root / 'work' / 'vosk-model-small-es-0.42.zip'
target = root / 'public' / 'models' / 'speech' / 'vosk-es'
cached.parent.mkdir(parents=True, exist_ok=True)
target.mkdir(parents=True, exist_ok=True)
if not cached.exists():
    print('Descargando modelo español oficial (~39 MB)...', flush=True)
    urllib.request.urlretrieve(source_url, cached)

with zipfile.ZipFile(cached) as source:
    assert source.testzip() is None, 'El ZIP del modelo no pasó la comprobación de integridad'
    with gzip.GzipFile(filename='', mode='wb', fileobj=(target / 'model.tar.gz').open('wb'), mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w') as archive:
            directories = set()
            for name in sorted(source.namelist()):
                path = Path(name)
                if name.endswith('/') or '..' in path.parts or path.parts[0] != 'vosk-model-small-es-0.42':
                    continue
                data = source.read(name)
                relative = Path('model', *path.parts[1:]).as_posix()
                for parent in reversed(Path(relative).parents):
                    directory = parent.as_posix()
                    if directory == '.' or directory in directories:
                        continue
                    info = tarfile.TarInfo(directory + '/')
                    info.type = tarfile.DIRTYPE
                    info.mode = 0o755
                    info.mtime = 0
                    archive.addfile(info)
                    directories.add(directory)
                info = tarfile.TarInfo(relative)
                info.size = len(data)
                info.mode = 0o644
                info.mtime = 0
                archive.addfile(info, io.BytesIO(data))

manifest = {
    'name': 'vosk-model-small-es-0.42', 'language': 'es', 'source': source_url,
    'license': 'Apache-2.0', 'license_reference': 'https://alphacephei.com/vosk/models',
    'original_sha256': hashlib.sha256(cached.read_bytes()).hexdigest(),
    'archive_sha256': hashlib.sha256((target / 'model.tar.gz').read_bytes()).hexdigest(),
    'archive_bytes': (target / 'model.tar.gz').stat().st_size,
    'adaptation': 'Original acoustic weights, repackaged to tar.gz. Command and negative vocabulary generated at runtime.',
    'trained_on_player_audio': False,
}
(target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(manifest, ensure_ascii=False, indent=2))
