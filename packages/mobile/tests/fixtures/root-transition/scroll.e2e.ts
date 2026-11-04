import { expect } from 'e2e';
import { test } from '../../../dist/index.js';

test('a screen scroll reaches the app after alert dismissal', async ({ app, device, screen }) => {
  await app.open();
  await device.alert('accept');
  await screen.swipe({ direction: 'down' });
  await expect(screen.getByText('Scrolled after alert')).toBeVisible({ timeout: 1000 });
});
