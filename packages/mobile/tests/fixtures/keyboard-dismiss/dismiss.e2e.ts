import { expect } from 'e2e';
import { test } from '../../../dist/index.js';

test('dismissing an absent or off-screen keyboard sends no input to the form', async ({ app, device, screen }) => {
  await app.open();
  await expect(screen.getByText('Unchanged')).toBeVisible();
  await device.dismissKeyboard();
  await expect(screen.getByText('Unchanged')).toBeVisible();
});
