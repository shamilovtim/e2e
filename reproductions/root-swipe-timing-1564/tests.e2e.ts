import { expect } from '../../packages/e2e/dist/index.js';
import { test } from '../../packages/mobile/dist/index.js';

test('four consecutive screen swipes move the native list', async ({ app, screen }) => {
  await app.open();
  await expect(screen.getByTestId('scroll-status')).toHaveText('Offset 0; composer touches 0');
  for (let index = 0; index < 4; index += 1) await screen.swipe({ direction: 'down' });
  await expect(screen.getByTestId('scroll-status')).toHaveText(/^Offset [1-9]\d*; composer touches 0$/);
});

test('scrollUntilVisible reaches a later native row', async ({ app, screen }) => {
  await app.open();
  const row = screen.getByTestId('row-25');
  await screen.scrollUntilVisible(row, { direction: 'down', momentum: 'none' });
  await expect(row).toBeVisible();
});
