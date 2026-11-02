import { test, expect, type Page } from '@playwright/test';

async function mockedSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Result = { isFinal: boolean; length: number; 0: { transcript: string; confidence: number } };
    class MockSpeech {
      static current: MockSpeech;
      lang = ''; continuous = false; interimResults = false; maxAlternatives = 1;
      onstart: (() => void) | null = null; onend: (() => void) | null = null;
      onspeechstart: (() => void) | null = null; onspeechend: (() => void) | null = null;
      onresult: ((event: { resultIndex: number; results: Result[] }) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      results: Result[] = [];
      start(): void { MockSpeech.current = this; this.onstart?.(); }
      abort(): void { this.onend?.(); }
    }
    const target = window as unknown as { SpeechRecognition: typeof MockSpeech; __speechFixture: { emit: (text: string, index: number, final?: boolean) => void; deny: () => void } };
    target.SpeechRecognition = MockSpeech;
    target.__speechFixture = {
      emit(text, index, final = true) {
        const current = MockSpeech.current;
        current.onspeechstart?.(); current.results[index] = { isFinal: final, length: 1, 0: { transcript: text, confidence: 0.96 } };
        current.onresult?.({ resultIndex: index, results: current.results });
      },
      deny() { MockSpeech.current.onerror?.({ error: 'not-allowed' }); },
    };
  });
}
async function enable(page: Page): Promise<void> {
  await page.goto('/?mode=solo&quality=low'); await page.getByRole('button', { name: 'CONFIGURAR VOZ' }).click();
  await page.locator('#voice-engine').selectOption('browser'); await page.locator('#voice-consent').check();
  await page.getByRole('button', { name: 'ACTIVAR MICRÓFONO' }).click();
  await expect(page.locator('#mic-dot')).toHaveAttribute('data-state', 'listening');
  await page.getByRole('button', { name: 'ENTRAR EN LA ARENA' }).click(); await expect(page.locator('#state')).toHaveText('EXPLORANDO');
}
async function emit(page: Page, text: string, index: number, final = true): Promise<void> {
  await page.evaluate(({ text, index, final }) => (window as unknown as { __speechFixture: { emit: (text: string, index: number, final: boolean) => void } }).__speechFixture.emit(text, index, final), { text, index, final });
}

test('las transcripciones simuladas activan el moveset mientras WASD sigue funcionando', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await mockedSpeech(page); await enable(page);
  await page.keyboard.down('w');
  await emit(page, 'Usa lanzallamas', 0, false);
  await expect(page.locator('#ability-flamethrower')).toHaveAttribute('data-state', 'ready');
  await emit(page, 'Usa lanzallamas', 0);
  await expect(page.locator('#ability-flamethrower')).toHaveAttribute('data-state', 'active');
  await page.screenshot({ path: 'docs/screenshots/flamethrower.png', fullPage: true });
  await emit(page, 'Blindaje', 1); await emit(page, 'Embestida', 2); await emit(page, 'Ráfaga', 3);
  await expect.poll(async () => await page.locator('#diag-count').textContent()).toBe('3 / 1');
  await expect(page.locator('#ability-armor')).toHaveAttribute('data-state', 'active');
  await expect(page.locator('#ability-charge')).toHaveAttribute('data-state', 'active');
  await expect(page.locator('#ability-barrage')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#ability-armor_guard')).toHaveCount(0);
  await expect(page.locator('#ability-charge_dash')).toHaveCount(0);
  await expect.poll(async () => Number(await page.locator('#coordinates').getAttribute('data-z'))).toBeLessThan(8);
  await page.keyboard.up('w');
  await expect(page.locator('#minimap')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#mic-dot')).toHaveAttribute('data-state', 'off');
  expect(errors).toEqual([]);
});

test('Ráfaga dispara por voz y muestra proyectiles en la arena', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockedSpeech(page); await enable(page);
  await emit(page, 'Ráfaga', 0);
  await expect(page.locator('#ability-barrage')).toHaveAttribute('data-state', 'active');
  await expect.poll(async () => page.locator('#ability-barrage .ability-status').textContent()).toContain('Disparando');
  await page.screenshot({ path: 'docs/screenshots/barrage.png', fullPage: true });
  await expect(page.locator('#diag-count')).toHaveText('1 / 0');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('una Embestida ascendente reproduce el impacto grave al aterrizar', async ({ page }) => {
  await mockedSpeech(page);
  await page.addInitScript(() => {
    const target = window as unknown as { __landingStarts: number[]; AudioContext: typeof AudioContext };
    target.__landingStarts = [];
    const NativeAudioContext = window.AudioContext;
    target.AudioContext = class extends NativeAudioContext {
      override createBufferSource(): AudioBufferSourceNode {
        const source = super.createBufferSource(), start = source.start.bind(source);
        source.start = (...args: Parameters<AudioBufferSourceNode['start']>) => {
          target.__landingStarts.push(source.buffer?.duration ?? 0);
          start(...args);
        };
        return source;
      }
    };
  });
  await enable(page);
  await page.mouse.move(800, 500);
  await page.mouse.move(800, 100);
  await emit(page, 'Embestida', 0);
  await expect(page.locator('#ability-charge')).toHaveAttribute('data-state', 'active');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __landingStarts: number[] }).__landingStarts.some(duration => Math.abs(duration - 1.05) < 0.02)), { timeout: 15000 }).toBe(true);
  await page.keyboard.press('Escape');
});

test('Lanzallamas mantiene entrada de voz, mueve y apunta, completa audio y permite otra orden tras recarga', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await mockedSpeech(page);
  await page.addInitScript(() => {
    const events: { type: string; loop: boolean; duration: number; at: number }[] = [];
    const target = window as unknown as { AudioContext: typeof AudioContext; __soundEvents: typeof events };
    target.__soundEvents = events;
    const NativeAudioContext = window.AudioContext;
    target.AudioContext = class extends NativeAudioContext {
      override async decodeAudioData(bytes: ArrayBuffer): Promise<AudioBuffer> {
        const buffer = await super.decodeAudioData(bytes);
        events.push({ type: 'decoded', loop: false, duration: buffer.duration, at: this.currentTime }); return buffer;
      }
      override createBufferSource(): AudioBufferSourceNode {
        const node = super.createBufferSource(), start = node.start.bind(node), stop = node.stop.bind(node);
        node.start = (...args: Parameters<AudioBufferSourceNode['start']>) => { events.push({ type: 'start', loop: node.loop, duration: node.buffer?.duration ?? 0, at: this.currentTime }); start(...args); };
        node.stop = (...args: Parameters<AudioBufferSourceNode['stop']>) => { events.push({ type: 'stop', loop: node.loop, duration: node.buffer?.duration ?? 0, at: args[0] ?? this.currentTime }); stop(...args); };
        node.addEventListener('ended', () => events.push({ type: 'ended', loop: node.loop, duration: node.buffer?.duration ?? 0, at: this.currentTime }));
        return node;
      }
    };
  });
  await enable(page);
  // Wait for local decoded assets, not for arbitrary game time.
  await page.waitForFunction(() => (window as unknown as { __soundEvents: { type: string; duration: number }[] }).__soundEvents.filter(e => e.type === 'decoded' && (e.duration < 0.5 || e.duration > 1)).length === 4);
  await emit(page, 'Ahora usa lanzallamas', 0);
  await expect(page.locator('#ability-flamethrower')).toHaveAttribute('data-state', 'active');
  await expect(page.locator('#mic-dot')).toHaveAttribute('data-state', 'listening');
  const events = () => page.evaluate(() => (window as unknown as { __soundEvents: { type: string; loop: boolean; duration: number; at: number }[] }).__soundEvents.filter(e => e.duration < 0.5 || e.duration > 1));
  await expect.poll(async () => (await events()).filter(e => e.type === 'start').length).toBe(2);
  const x = Number(await page.locator('#coordinates').getAttribute('data-x'));
  const yaw = Number(await page.locator('#coordinates').getAttribute('data-yaw'));
  await page.keyboard.down('d');
  await expect.poll(async () => Number(await page.locator('#coordinates').getAttribute('data-x'))).toBeGreaterThan(x + 0.15);
  await page.keyboard.up('d'); await page.mouse.move(830, 520, { steps: 5 });
  await expect.poll(async () => Number(await page.locator('#coordinates').getAttribute('data-yaw'))).not.toBe(yaw);
  await emit(page, 'Ahora usa lanzallamas', 0); await emit(page, 'Usar lanzallamas', 1);
  await expect.poll(async () => page.locator('#diag-count').textContent()).toBe('1 / 1');
  await page.screenshot({ path: 'docs/screenshots/flamethrower-0.3.png', fullPage: true });
  await expect(page.locator('#ability-flamethrower')).toHaveAttribute('data-state', 'cooldown', { timeout: 18000 });
  await expect.poll(async () => (await events()).filter(e => e.type === 'start').length).toBe(3);
  await expect.poll(async () => (await events()).some(e => e.type === 'ended' && e.loop)).toBe(true);
  const sound = await events(), starts = sound.filter(e => e.type === 'start');
  expect(starts.map(e => e.loop)).toEqual([false, true, false]);
  expect(starts[0].duration).toBeCloseTo(0.22); expect(starts[1].duration).toBeCloseTo(1.85); expect(starts[2].duration).toBeCloseTo(0.34);
  await expect(page.locator('#mic-dot')).toHaveAttribute('data-state', 'listening');
  await expect(page.locator('#ability-flamethrower')).toHaveAttribute('data-state', 'ready', { timeout: 18000 });
  await emit(page, 'Escupe fuego', 2);
  await expect(page.locator('#ability-flamethrower')).toHaveAttribute('data-state', 'active');
  await expect.poll(async () => (await events()).filter(e => e.type === 'start').length).toBe(5);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await events()).filter(e => e.type === 'ended' && e.loop).length).toBe(2);
  await page.getByRole('button', { name: 'DIAGNÓSTICO', exact: true }).click();
  await expect(page.locator('#diag-normalized')).toHaveText('escupe fuego');
  await expect(page.locator('#diag-match')).toContainText('orden de activación');
  await expect(page.locator('#diag-validation')).toContainText('Aceptada');
  expect(errors).toEqual([]);
});

test('rechaza negación y duplicados, y un error de voz no bloquea el movimiento', async ({ page }) => {
  await mockedSpeech(page); await enable(page);
  await emit(page, 'No uses lanzallamas', 0); await emit(page, 'Blindaje y embestida', 1);
  await expect.poll(async () => page.locator('#diag-count').textContent()).toBe('0 / 2');
  await emit(page, 'blindaje', 2); await emit(page, 'blindaje', 2); await emit(page, 'blindaje', 3);
  await expect.poll(async () => page.locator('#diag-count').textContent()).toBe('1 / 3');
  await page.evaluate(() => (window as unknown as { __speechFixture: { deny: () => void } }).__speechFixture.deny());
  await expect(page.locator('#mic-dot')).toHaveAttribute('data-state', 'error');
  await page.keyboard.down('w'); await expect.poll(async () => Number(await page.locator('#coordinates').getAttribute('data-z'))).toBeLessThan(8); await page.keyboard.up('w');
  await expect(page.locator('#state')).toHaveText('EXPLORANDO');
});

test('los pasos pesados siguen el movimiento real, se detienen en reposo y conservan la interfaz sin globos', async ({ page }) => {
  await mockedSpeech(page);
  await page.addInitScript(() => {
    const target = window as unknown as { __steps: number[]; __decoded: number };
    target.__steps = []; target.__decoded = 0;
    const create = AudioContext.prototype.createBufferSource, decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = async function(bytes: ArrayBuffer): Promise<AudioBuffer> {
      const buffer = await decode.call(this, bytes); target.__decoded++; return buffer;
    };
    AudioContext.prototype.createBufferSource = function(): AudioBufferSourceNode {
      const source = create.call(this), start = source.start.bind(source);
      source.start = (...args: Parameters<AudioBufferSourceNode['start']>) => { target.__steps.push(source.buffer?.duration ?? 0); start(...args); };
      return source;
    };
  });
  await enable(page);
  await page.waitForFunction(() => (window as unknown as { __decoded: number }).__decoded === 8);
  const steps = () => page.evaluate(() => (window as unknown as { __steps: number[] }).__steps);
  expect(await steps()).toHaveLength(0);
  await page.keyboard.down('w');
  await expect.poll(async () => (await steps()).length).toBeGreaterThanOrEqual(2);
  await page.keyboard.up('w');
  await page.waitForTimeout(1000); // Observe deceleration before measuring stationary silence.
  const stopped = (await steps()).length;
  await page.waitForTimeout(600); expect((await steps()).length).toBe(stopped);
  expect((await steps()).every(duration => duration > 0.55 && duration < 0.61)).toBe(true);
  expect(new Set(await steps()).size).toBeGreaterThan(1);
  await expect(page.locator('#mic-dot')).toHaveAttribute('data-state', 'listening');
  await page.keyboard.press('Escape');
  await expect(page.locator('.identity-note')).toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/avatar-heavy-identity.png', fullPage: true });
  await page.getByRole('button', { name: 'CONFIGURAR VOZ' }).click();
  await page.locator('#weight-motion').uncheck(); await expect(page.locator('#weight-motion')).not.toBeChecked();
  await page.locator('#sfx-volume').fill('0');
  await expect(page.locator('#sfx-level')).toHaveText('0%');
});

test('salir de calibración abre una sesión de órdenes independiente', async ({ page }) => {
  await mockedSpeech(page); await enable(page); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'DIAGNÓSTICO', exact: true }).click();
  await page.locator('#trial-expected').selectOption('none');
  await page.getByRole('button', { name: 'TOMAR MUESTRA' }).click();
  await expect(page.locator('#mic-dot')).toHaveAttribute('data-state', 'listening');
  await emit(page, 'No quiero usar lanzallamas', 0);
  await expect(page.locator('#trial-feedback')).toContainText('Conversación rechazada correctamente');
  await expect(page.locator('#diag-count')).toHaveText('0 / 0');
  await page.locator('#enter').click();
  await expect(page.locator('#state')).toHaveText('EXPLORANDO');
  await expect(page.locator('#mic-dot')).toHaveAttribute('data-state', 'listening');
  await emit(page, 'Ahora usa lanzallamas', 0);
  await expect(page.locator('#ability-flamethrower')).toHaveAttribute('data-state', 'active');
  await expect(page.locator('#diag-count')).toHaveText('1 / 0');
});
