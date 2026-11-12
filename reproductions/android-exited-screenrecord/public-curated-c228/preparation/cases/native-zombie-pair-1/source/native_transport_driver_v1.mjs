import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

// Input and the ADB transcript stay private; stdout contains only generic observations.
const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
const run = promisify(execFile);
const source = await run('git', ['-C', input.checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
const checkout = await run('git', ['-C', input.checkout, 'status', '--porcelain'], { encoding: 'utf8' });
assert.equal(source.stdout.trim(), input.source);
assert.equal(checkout.stdout, '');
const { withCommandHost } = await import(
  pathToFileURL(path.join(input.checkout, 'packages/host-kit/src/command.ts')).href
);
const { withAndroidAdbProvider } = await import(
  pathToFileURL(path.join(input.checkout, 'packages/platform-android/src/mechanics.ts')).href
);
const { createAndroidScreenRecordingTransport } = await import(
  pathToFileURL(path.join(input.checkout, 'src/platform-runtime-screen-recording-android-host.ts')).href
);
const calls = [];
const host = {
  cwd: input.checkout,
  env: { PATH: process.env.PATH, ANDROID_HOME: process.env.ANDROID_HOME },
};
let observation;
try {
  observation = await withCommandHost({ host, requestEnv: undefined }, () =>
    withAndroidAdbProvider(
      {
        exec: async (args, options) => {
          calls.push([...args]);
          try {
            const result = await run(input.adb, ['-s', input.serial, ...args], {
              encoding: 'utf8',
              timeout: options?.timeoutMs ?? 5000,
              signal: options?.signal,
            });
            return { ...result, exitCode: 0 };
          } catch (error) {
            if (typeof error.code !== 'number') throw error;
            return { stdout: error.stdout ?? '', stderr: error.stderr ?? '', exitCode: error.code };
          }
        },
      },
      { serial: input.serial },
      async () => {
        const transport = await createAndroidScreenRecordingTransport(
          { platform: 'android', id: input.serial, name: 'Recorder fixture', kind: 'emulator', target: 'mobile', booted: true },
          host,
        );
        return {
          inspectBefore: await transport.inspect(input.identity),
          stop: await transport.stop(input.identity),
          inspectAfter: await transport.inspect(input.identity),
        };
      },
    ),
  );
} finally {
  await writeFile(input.privateTranscript, JSON.stringify(calls, null, 2));
}
const result = {
  source: input.source,
  boundary: 'production TypeScript transport with real ADB provider',
  ...observation,
  signalsSent: calls.filter((args) => args[0] === 'shell' && args[1] === 'kill').length,
};
console.log(JSON.stringify(result, null, 2));
assert.equal(result.stop, 'already-missing');
assert.equal(result.inspectBefore, 'missing');
assert.equal(result.inspectAfter, 'missing');
assert.equal(result.signalsSent, 0);
