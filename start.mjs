import { remote } from 'webdriverio';
import electronPath from 'electron';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let electronChromiumVersion;
try {
  electronChromiumVersion = execSync(
    `ELECTRON_RUN_AS_NODE=1 "${electronPath}" -p "process.versions.chrome"`
  ).toString().trim();
} catch (err) {
  console.error('Failed to detect Chrome version from Electron:', err);
  // Fallback to electron-to-chromium if dynamic detection fails
  const electronPackageJson = require('electron/package.json');
  const { electronToChromium } = require('electron-to-chromium');
  electronChromiumVersion = electronToChromium(electronPackageJson.version);
}

console.log(`Detected Chrome version: ${electronChromiumVersion}`);


const sandboxRunnerPath = path.resolve(
  'electron-proxy.mjs'
);
const userDataPath = path.resolve(
  os.tmpdir(),
  `wdio-electron-proxy-${Date.now()}`
);

async function spawnElectronProxy(sandboxUrl) {
  const electronProxyRemote = await remote({
    logLevels: {
      webdriver: 'error',
    },
    capabilities: {
      browserName: 'chromium',
      browserVersion: electronChromiumVersion,
      'goog:chromeOptions': {
        binary: electronPath,
        args: [
          `--user-data-dir=${userDataPath}`,
          `--app=${sandboxRunnerPath}`,
        ],
      },
      'wdio:enforceWebDriverClassic': true,
    },
  });

  const title = await electronProxyRemote.getTitle();
  console.log('[wdio] Electron proxy server started with title: %s', title);

  const response = await fetch(`${sandboxUrl}/ping`);
  const data = await response.text();
  console.log('[wdio] Electron proxy server responded ping with %s', data);
  return electronProxyRemote;
}

async function main() {
  console.log('[wdio] Starting Electron via WebdriverIO...');
  const browser = await spawnElectronProxy('http://localhost:7777');
  console.log('[wdio] Electron proxy server started.')

  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log('[wdio] Closing Electron proxy server...');
  await browser.deleteSession();
}

main().catch(console.error);
