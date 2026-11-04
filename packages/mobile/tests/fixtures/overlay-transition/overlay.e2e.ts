import { expect } from 'e2e';
import { test } from '../../../dist/index.js';

test('an unchanged control can receive input while an overlay is still dismissing', async ({ app, screen }) => {
  await app.open();
  await screen.getByRole('button', 'Close overlay').tap();
  if (process.env.REPRO_WAIT_FOR_BUDGET === '1') {
    // Comparison only: the proposed device.waitForTransition() API does not exist.
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  await screen.getByRole('button', 'Underlying action').tap();
  await expect(screen.getByText('Underlying action received')).toBeVisible({ timeout: 500 });
});
