import { test } from '@e2e-dev/mobile';
test('short action timeout during native overlay dismissal', async ({device, screen}) => {
 await device.openApp('dev.e2e.overlay1563', {relaunch:true});
 await screen.getByRole('button', 'Open slow fade overlay').tap();
 await screen.getByRole('button', 'Close overlay').tap();
 await screen.getByRole('button', 'Underlying action').tap({timeout:500});
});
