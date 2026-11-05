import { mobile as current } from '../../packages/mobile/dist/index.js';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const mobile = process.env.SCROLL_ADAPTER ? (await import(pathToFileURL(resolve(process.env.SCROLL_ADAPTER)).href)).mobile : current;
const platform = process.env.SCROLL_PLATFORM === 'android' ? 'android' : 'ios';
const device = process.env.SCROLL_DEVICE;
if (!device) throw new Error('Set SCROLL_DEVICE to an owned simulator UDID or emulator serial.');
export default {
  tests: 'tests/*.e2e.ts',
  targets: [{ name: platform, engine: mobile({ platform, device, session: `root-scroll-proof-${platform}`, transition: 500 }), app: { bundleId: 'dev.testerarmy.rootscroll' } }],
  timeout: 90_000, cleanupTimeout: 180_000, retries: 0, workers: 1, video: 'on',
};
