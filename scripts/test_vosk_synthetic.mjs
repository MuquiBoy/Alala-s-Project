import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Test-only audio injection. Runs real Vosk/WASM; never requests a physical microphone or plays audio.
const folder = resolve('work/synthetic-voice');
const manifest = JSON.parse((await readFile(resolve(folder, 'manifest.json'), 'utf8')).replace(/^\uFEFF/, ''));
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(() => {
  window.__syntheticAudio = { clip: null, play: async () => {}, contextState: () => 'not-created', plays: 0 };
  navigator.mediaDevices.getUserMedia = async () => {
    const context = new AudioContext({ sampleRate: 16000 });
    const destination = context.createMediaStreamDestination();
    await context.resume();
    window.__syntheticAudio.contextState = () => context.state + ' / time=' + context.currentTime;
    window.__syntheticAudio.play = async () => {
      await context.resume(); window.__syntheticAudio.plays++;
      const clip = window.__syntheticAudio.clip;
      if (!clip) return;
      const bytes = Uint8Array.from(atob(clip), character => character.charCodeAt(0));
      const decoded = await context.decodeAudioData(bytes.buffer);
      const padded = context.createBuffer(decoded.numberOfChannels, decoded.length + Math.ceil(context.sampleRate * 0.7), context.sampleRate);
      for (let channel = 0; channel < decoded.numberOfChannels; channel++) padded.copyToChannel(decoded.getChannelData(channel), channel);
      const source = context.createBufferSource(); source.buffer = padded;
      source.connect(destination);
      await new Promise(resolve => { source.onended = () => { source.disconnect(); resolve(); }; source.start(context.currentTime + 0.15); });
    };
    for (const track of destination.stream.getTracks()) { const original = track.stop.bind(track); track.stop = () => { original(); void context.close(); }; }
    return destination.stream;
  };
});
try {
  await page.goto('http://127.0.0.1:4178/?quality=low');
  await page.getByRole('button', { name: 'ENTRAR EN LA ARENA' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: 'CONFIGURAR VOZ' }).click();
  await page.locator('#voice-engine').selectOption('vosk');
  await page.locator('#voice-consent').check();
  await page.getByRole('button', { name: 'ACTIVAR MICRÓFONO', exact: false }).click();
  await page.waitForFunction(() => document.querySelector('#mic-dot')?.dataset.state === 'listening' || document.querySelector('#mic-dot')?.dataset.state === 'error', undefined, { timeout: 90000 });
  const status = await page.locator('#voice-state').innerText();
  console.log(status);
  if (!status.includes('Escuchando')) throw new Error(status);
  await page.getByRole('button', { name: 'DIAGNÓSTICO', exact: true }).click();
  for (let index = 0; index < manifest.samples.length; index++) {
    const sample = manifest.samples[index];
    const clip = (await readFile(resolve(folder, `${sample.id}.wav`))).toString('base64');
    await page.evaluate(clip => { window.__syntheticAudio.clip = clip; }, clip);
    await page.locator('#trial-expected').selectOption(sample.expected);
    await page.getByRole('button', { name: 'TOMAR MUESTRA' }).click();
    await page.evaluate(() => window.__syntheticAudio.play());
    await page.waitForFunction(number => document.querySelector('#trial-feedback')?.textContent?.startsWith(`Muestra ${number}:`), index + 1, { timeout: 16000 });
    console.log(`${sample.id}: ${await page.locator('#trial-feedback').innerText()}`);
  }
  // A second pass traverses the NORMAL gameplay route: actual ASR -> interpreter -> combat, while moving.
  await page.getByRole('button', { name: 'ENTRAR EN LA ARENA' }).click();
  await page.waitForFunction(() => document.querySelector('#state')?.textContent === 'EXPLORANDO' && document.querySelector('#mic-dot')?.dataset.state === 'listening');
  await page.keyboard.down('w');
  const initialZ = Number(await page.locator('#coordinates').getAttribute('data-z'));
  for (let index = 0; index < 4; index++) {
    const sample = manifest.samples[index];
    if (sample.expected === 'barrage') {
      await page.waitForFunction(() => document.querySelector('#ability-flamethrower')?.dataset.state !== 'active', undefined, { timeout: 10000 });
    }
    const clip = (await readFile(resolve(folder, `${sample.id}.wav`))).toString('base64');
    await page.evaluate(async clip => { window.__syntheticAudio.clip = clip; await window.__syntheticAudio.play(); }, clip);
    await page.waitForFunction(count => Number(document.querySelector('#diag-count')?.textContent?.split('/')[0]) >= count, index + 1, { timeout: 15000 });
    console.log(`Combate: ${sample.expected} ejecutada desde audio sintético.`);
    if (index === 0) { await page.keyboard.up('w'); await page.screenshot({ path: 'docs/screenshots/voice-gameplay.png', fullPage: true }); }
  }
  const finalZ = Number(await page.locator('#coordinates').getAttribute('data-z'));
  if (finalZ >= initialZ - 0.1) throw new Error('WASD no avanzó mientras se procesaba la voz sintética.');
  await page.keyboard.press('Escape');
  await page.locator('#include-transcripts').check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'DESCARGAR INFORME JSON' }).click();
  const download = await downloadPromise;
  const report = JSON.parse(await readFile(await download.path(), 'utf8'));
  report.kind = 'synthetic-audio-integration-test'; report.humanVoiceTested = false;
  report.syntheticSource = { voice: manifest.voice, rates: [-1, 0, 1], samples: manifest.samples };
  report.gameplay = { realAsrToCombatRequests: report.summary.accepted, movingDuringRecognition: finalZ < initialZ - 0.1, initialZ, finalZ, physicalMicrophoneUsed: false };
  report.runtimeErrors = errors;
  report.graphics = { quality: 'low', renderer: 'Chrome headless SwiftShader software', realGpuMeasured: false };
  await mkdir('docs/screenshots', { recursive: true });
  await writeFile('docs/SYNTHETIC_AUDIO_REPORT.json', JSON.stringify(report, null, 2) + '\n');
  await page.screenshot({ path: 'docs/screenshots/voice-calibration.png', fullPage: true });
  const canonical = report.calibration.trials.slice(0, 4);
  if (canonical.some(trial => trial.outcome !== 'correct')) throw new Error('Una o más órdenes canónicas fallaron. Consulta docs/SYNTHETIC_AUDIO_REPORT.json.');
  if (report.calibration.trials.some(trial => trial.expected !== null && trial.outcome !== 'correct')) throw new Error('Una variante positiva falló. Consulta el informe.');
  if (report.calibration.summary.falseActivations > 0) throw new Error('La voz sintética produjo activaciones incorrectas de conversación.');
  if (report.summary.accepted !== 4) throw new Error('El audio sintético no ejecutó las cuatro habilidades durante la partida.');
  if (errors.length) throw new Error(`Errores de navegador: ${errors.join('; ')}`);
  console.log(JSON.stringify(report.calibration.summary));
} catch (error) {
  console.error('Diagnóstico:', await page.locator('#voice-state').innerText().catch(() => 'sin página'));
  console.error('Errores:', errors);
  console.error('Última transcripción:', await page.locator('#diag-transcript').innerText());
  console.error('Último resultado:', await page.locator('#diag-result').innerText());
  console.error('Contadores:', await page.locator('#diag-count').innerText());
  console.error('Captura sintética:', await page.evaluate(() => ({state:window.__syntheticAudio.contextState(),plays:window.__syntheticAudio.plays})));
  await mkdir('work', { recursive: true });
  await page.screenshot({ path: 'work/synthetic-failure.png', fullPage: true });
  throw error;
} finally { await browser.close(); }
