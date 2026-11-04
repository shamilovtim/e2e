import type { E2EConfig } from 'e2e';
import { buildEngine } from '../../../dist/engine.js';
import { AgentDeviceSurface } from '../../../dist/surface.js';
import { createFakeClient } from '../../helpers/fake-client.ts';

let dismissedAt = 0;
let result = 'Waiting';
const transition = 1000;
const fake = createFakeClient({
  'capture.snapshot': () => ({
    appName: 'Scroll demo',
    appBundleId: 'com.example.scroll-demo',
    viewport: { width: 390, height: 844 },
    nodes: [
      { ref: '@e1', index: 0, depth: 0, type: 'application', label: 'Scroll demo', rect: { x: 0, y: 0, width: 390, height: 844 } },
      { ref: '@e2', index: 1, parentIndex: 0, depth: 1, type: 'static-text', label: result, rect: { x: 20, y: 200, width: 350, height: 44 } },
    ],
  }),
  'capture.screenshot': () => ({ logicalWidth: 390, logicalHeight: 844 }),
  'command.alert': () => { dismissedAt = Date.now(); return {}; },
  // The controlled driver models an overlay that consumes gestures until its dismissal completes.
  'interactions.scroll': () => { result = Date.now() - dismissedAt >= transition ? 'Scrolled after alert' : 'Ignored during dismissal'; return {}; },
});

export default {
  tests: './scroll.e2e.ts',
  workers: 1,
  retries: 0,
  video: 'off',
  targets: [{
    name: 'controlled-ios',
    app: { bundleId: 'com.example.scroll-demo' },
    engine: buildEngine(new AgentDeviceSurface({ platform: 'ios', device: 'scripted-device', transition }, () => fake.client)),
  }],
} satisfies E2EConfig;
