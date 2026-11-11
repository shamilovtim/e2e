import { test } from '@e2e-dev/mobile';
import { expect } from 'e2e';

for (const [name, open, close] of [
  ['UIKit fade 750ms', 'Open fade overlay', 'Close overlay'],
  ['UIKit fade 3000ms diagnostic', 'Open slow fade overlay', 'Close overlay'],
  ['UIKit page sheet control', 'Open native sheet', 'Close sheet'],
]) {
  test(name, async ({ device, screen }) => {
    await device.openApp('dev.e2e.overlay1563', { relaunch: true });
    await screen.getByRole('button', open).tap();
    await screen.getByRole('button', close).tap();
    await screen.getByRole('button', 'Underlying action').tap();
    await expect(screen.getByTestId('results')).toHaveText('Underlying taps: 1\nOverlay touches: 0');
  });
}
