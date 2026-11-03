import { test, expect, type Page } from '@playwright/test';

const metric = async (page: Page, name: string): Promise<number> => Number(await page.locator('#avatar-live').getAttribute(`data-${name}`));
const weight = async (page: Page, name: string): Promise<number> => JSON.parse(await page.locator('#avatar-live').getAttribute('data-weights') ?? '{}')[name];

test('el GLB real camina, retrocede, gira y separa cabeza/chasis; pausa y reinicia', async ({ page }) => {
  const errors: string[] = [], resources: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.ok()) resources.push(response.url()); });
  await page.goto('/?mode=solo&quality=low');
  await expect(page.locator('#avatar-live')).toHaveAttribute('data-ready', 'true');
  expect(resources.some(url => url.endsWith('avatar-01_rigged_v3.glb'))).toBe(true);
  await page.getByRole('button', { name: 'ENTRAR EN LA ARENA' }).click();
  await expect(page.locator('#state')).toHaveText('EXPLORANDO');
  // Deterministic relative mouse input: the normal Pointer Lock listener receives it.
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mousemove', { movementX: -650, movementY: 200 })));
  await expect.poll(() => metric(page, 'head-yaw')).toBeGreaterThan(1);
  expect(await metric(page, 'yaw')).toBeCloseTo(0);
  expect(await metric(page, 'steps')).toBe(0);
  await page.keyboard.down('w');
  await expect.poll(() => weight(page, 'left')).toBeGreaterThan(.3);
  await expect.poll(() => metric(page, 'steps')).toBeGreaterThan(2);
  await expect.poll(() => weight(page, 'forward')).toBeGreaterThan(.8);
  expect(await metric(page, 'speed')).toBeCloseTo(.8, 1);
  await page.screenshot({ path: 'docs/screenshots/avatar-locomotion-live.png', fullPage: true });
  await page.keyboard.up('w'); await page.keyboard.down('s');
  await expect.poll(() => weight(page, 'backward')).toBeGreaterThan(.8);
  await page.keyboard.up('s'); await page.keyboard.down('d');
  await expect.poll(() => weight(page, 'right')).toBeGreaterThan(.3);
  await page.keyboard.up('d');
  await expect.poll(() => weight(page, 'idle')).toBeGreaterThan(.99);
  const stopped = await metric(page, 'steps');
  await page.waitForTimeout(400); expect(await metric(page, 'steps')).toBe(stopped);
  await page.keyboard.press('Escape');
  const phase = await metric(page, 'phase'); await page.waitForTimeout(400);
  expect(await metric(page, 'phase')).toBe(phase);
  await page.getByRole('button', { name: 'REINICIAR POSICIÓN' }).click();
  await expect.poll(() => metric(page, 'steps')).toBe(0);
  await expect.poll(() => metric(page, 'yaw')).toBe(0);
  expect(errors).toEqual([]);
});
