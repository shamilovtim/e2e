import { mobile } from '@e2e-dev/mobile';
import type { E2EConfig } from 'e2e';

export default {
  projectId: 'dev.e2e.overlay1563',
  tests: 'tests/*.e2e.ts',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  actionTimeout: 5_000,
  cleanupTimeout: 180_000,
  targets: [{
    name: 'ios-main',
    engine: mobile({
      platform: 'ios',
      device: process.env.OVERLAY_DEVICE ?? 'CA371337-B1F1-4A84-91BB-0E2ACA90E3E2',
      session: 'codex-overlay1563-main',
      transition: Number(process.env.OVERLAY_TRANSITION ?? '1000'),
      videoTouches: false,
    }),
    app: { bundleId: 'dev.e2e.overlay1563' },
  }],
} satisfies E2EConfig;
