import { test, expect } from '../../../packages/e2e/dist/index.js';
for (const momentum of ['slow', 'none', 'fast'] as const) {
  test(`Keyboard and composer stay usable during ${momentum} root scrolling`, async ({ app, device, screen }) => {
    await app.open();
    await expect(screen.getByText('Offset 0; composer touches 0')).toBeVisible({ timeout: 30_000 });
    await screen.getByLabel('Notes').tap();
    if (process.env.SCROLL_PLATFORM === 'android') {
      const { execFileSync } = await import('node:child_process');
      execFileSync(`${process.env.ANDROID_SDK_ROOT}/platform-tools/adb`, ['-s', process.env.SCROLL_DEVICE!, 'shell', 'ime', 'set', 'com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME']);
      await screen.getByLabel('Notes').tap();
    }
    await expect(screen.getByLabel('Composer')).toBeVisible();
    let capture = await device.unstable_raw.client.capture.snapshot({ interactiveOnly: false });
    const readyBy = Date.now() + 5_000;
    while (Date.now() < readyBy) {
      const composer = capture.nodes?.find((node) => node.identifier === 'composer' || node.contentDescription === 'Composer');
      const band = capture.keyboard?.kind === 'visible' || capture.keyboard?.kind === 'derived' ? capture.keyboard.frame : undefined;
      const settledBand = process.env.SCROLL_PLATFORM !== 'android' || (band && composer?.rect && Math.abs(band.y - composer.rect.y - composer.rect.height) <= 2 && capture.viewport && band.y + band.height <= capture.viewport.height + 1);
      if (capture.viewport && composer?.rect && composer.rect.y + composer.rect.height < capture.viewport.height * 0.85 && settledBand) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
      capture = await device.unstable_raw.client.capture.snapshot({ interactiveOnly: false });
    }
    const { strict: assert } = await import('node:assert');
    const composer = capture.nodes?.find((node) => node.identifier === 'composer' || node.contentDescription === 'Composer');
    const band = capture.keyboard?.kind === 'visible' || capture.keyboard?.kind === 'derived' ? capture.keyboard.frame : undefined;
    assert.ok(capture.viewport && composer?.rect && composer.rect.y + composer.rect.height < capture.viewport.height * 0.85, 'Native precondition: a visible software keyboard moves Composer above the lower screen');
    if (process.env.SCROLL_PLATFORM === 'android') assert.ok(band && Math.abs(band.y - composer.rect.y - composer.rect.height) <= 2 && band.y + band.height <= capture.viewport.height + 1, 'Native precondition: IME animation finished in the same coordinate plane as Composer');
    const { writeFile } = await import('node:fs/promises');
    const { mkdir } = await import('node:fs/promises');
    await mkdir('.e2e/evidence', { recursive: true });
    await writeFile(`.e2e/evidence/${process.env.SCROLL_PLATFORM}-${momentum}-metadata.json`, JSON.stringify({ viewport: capture.viewport, keyboard: capture.keyboard, nodes: capture.nodes?.filter((node) => /keyboard|Composer|Offset/i.test(String(node.label ?? node.type ?? ''))) }));
    await screen.scrollUntilVisible(screen.getByText('Row 39'), { direction: 'down', momentum, timeout: 30_000 });
    await expect(screen.getByText(/^Offset [1-9][0-9]*; composer touches 0$/)).toBeVisible();
    await expect(screen.getByLabel('Notes')).toHaveValue('');
  });
}
