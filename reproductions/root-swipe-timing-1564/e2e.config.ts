import type { E2EConfig } from '../../packages/e2e/dist/index.js';
import { mobile } from '../../packages/mobile/dist/index.js';

const device = process.env.E2E_ROOT_SWIPE_DEVICE;
if (!device) throw new Error('Set E2E_ROOT_SWIPE_DEVICE to an owned simulator UDID');

export default {
  tests: './tests.e2e.ts',
  workers: 1,
  retries: 0,
  video: 'off',
  actionTimeout: 15_000,
  assertionTimeout: 10_000,
  targets: [{
    name: 'ios',
    engine: mobile({
      platform: 'ios',
      device,
      session: 'codex-upstream-1564-bench',
      transition: Number(process.env.E2E_ROOT_SWIPE_TRANSITION ?? '500'),
    }),
    app: { bundleId: 'dev.testerarmy.rootscroll' },
  }],
} satisfies E2EConfig;
