import { test, expect, type Page } from '@playwright/test';

const metric = async (page: Page, name: string): Promise<number> => Number(await page.locator('#coordinates').getAttribute(`data-${name}`));

test('Chrome carga el escenario, el OBJ y el PNG locales sin errores', async ({ page }) => {
  const errors: string[] = [];
  const resources: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.ok()) resources.push(decodeURI(response.url())); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'ENTRAR EN LA ARENA' })).toBeEnabled();
  await expect.poll(async () => Number.parseInt(await page.locator('#fps').innerText())).toBeGreaterThan(0);
  expect(resources.some(url => url.endsWith('arena-v2.obj'))).toBe(true);
  expect(resources.some(url => url.endsWith('floor-layout-v2.png'))).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'docs/screenshots/arena-overview.png', fullPage: true });
});

test('captura el ratón, mueve con WASD, apunta, pausa y reinicia', async ({ page }) => {
  await page.goto('/');
  const enter = page.getByRole('button', { name: 'ENTRAR EN LA ARENA' });
  const bounds = await enter.boundingBox();
  expect(bounds).not.toBeNull();
  await enter.click();
  await expect(page.locator('#state')).toHaveText('EXPLORANDO');
  expect(await page.evaluate(() => document.pointerLockElement?.id)).toBe('world');
  await page.keyboard.down('w');
  await expect.poll(() => metric(page, 'z')).toBeLessThan(6);
  await page.keyboard.up('w');
  await expect(page.locator('#ground')).toHaveText('EN SUELO');
  const yaw = await metric(page, 'yaw');
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 70, bounds!.y + bounds!.height / 2 + 20, { steps: 8 });
  await expect.poll(() => metric(page, 'yaw')).not.toBe(yaw);
  await page.screenshot({ path: 'docs/screenshots/arena-fps.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.locator('#state')).toHaveText('EN PAUSA');
  expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
  await page.getByRole('button', { name: 'REINICIAR POSICIÓN' }).click();
  await expect.poll(() => metric(page, 'x')).toBeCloseTo(0, 2);
  await expect.poll(() => metric(page, 'z')).toBeCloseTo(8.5, 2);
});

test('el movimiento real del navegador choca con la barrera del OBJ', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ENTRAR EN LA ARENA' }).click();
  await expect(page.locator('#state')).toHaveText('EXPLORANDO');
  await page.keyboard.down('w');
  await expect.poll(() => metric(page, 'z')).toBeLessThan(2.6);
  // Keep pushing after contact; this is a meaningful timed collision observation.
  await page.waitForTimeout(650);
  await page.keyboard.up('w');
  expect(await metric(page, 'z')).toBeGreaterThan(2.45);
  expect(await metric(page, 'y')).toBeGreaterThan(-0.02);
  await page.keyboard.press('Escape');
});

test('la guía abre y cierra sin arrancar el micrófono ni el combate', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'GUÍA DE CONTROL' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('WASD');
  await page.getByRole('button', { name: 'ENTENDIDO' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('MICRÓFONO INACTIVO')).toBeVisible();
});
