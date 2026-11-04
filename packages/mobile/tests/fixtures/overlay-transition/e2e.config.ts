import type { E2EConfig } from 'e2e';
import { buildEngine } from '../../../dist/engine.js';
import { AgentDeviceSurface } from '../../../dist/surface.js';
import { createFakeClient } from '../../helpers/fake-client.ts';

let blockingUntil = 0;
let outcome = 'No action received';
const fake = createFakeClient({
  'capture.snapshot': () => ({
    appName: 'Overlay timing demo',
    appBundleId: 'com.example.overlay-timing',
    viewport: { width: 390, height: 844 },
    keyboard: { kind: 'absent' },
    nodes: [
      { ref: '@e1', index: 0, depth: 0, type: 'application', label: 'Overlay timing demo', rect: { x: 0, y: 0, width: 390, height: 844 } },
      { ref: '@e2', index: 1, parentIndex: 0, depth: 1, type: 'button', label: 'Close overlay', rect: { x: 20, y: 200, width: 350, height: 44 } },
      { ref: '@e3', index: 2, parentIndex: 0, depth: 1, type: 'button', label: 'Underlying action', rect: { x: 20, y: 500, width: 350, height: 44 } },
      { ref: '@e4', index: 3, parentIndex: 0, depth: 1, type: 'static-text', label: outcome, rect: { x: 20, y: 600, width: 350, height: 44 } },
    ],
  }),
  'interactions.press': (args) => {
    const { ref } = args as { ref: string };
    if (ref === '@e2') blockingUntil = Date.now() + 750;
    if (ref === '@e3') outcome = Date.now() < blockingUntil ? 'Input intercepted by fading overlay' : 'Underlying action received';
    return {};
  },
  'capture.screenshot': () => ({ logicalWidth: 390, logicalHeight: 844 }),
});

export default {
  tests: './overlay.e2e.ts',
  workers: 1,
  retries: 0,
  video: 'off',
  targets: [{
    name: 'controlled-overlay',
    app: { bundleId: 'com.example.overlay-timing' },
    engine: buildEngine(new AgentDeviceSurface({ platform: 'ios', device: 'scripted-device', transition: 1_000 }, () => fake.client)),
  }],
} satisfies E2EConfig;
