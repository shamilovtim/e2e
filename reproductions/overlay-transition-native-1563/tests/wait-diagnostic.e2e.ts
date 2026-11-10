import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

test('UIKit fade 750ms with diagnostic 1000ms wait', async ({ device, screen }) => {
  await device.openApp('dev.e2e.overlay1563', { relaunch: true });
  await screen.getByRole('button', 'Open fade overlay').tap();
  await screen.getByRole('button', 'Close overlay').tap();
  // Diagnostic comparison only; this is not an API implementation or test advice.
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  await screen.getByRole('button', 'Underlying action').tap();
  await expect(screen.getByTestId('results')).toHaveText('Underlying taps: 1\nOverlay touches: 0');
});
