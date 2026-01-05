'use strict';

const express = require('express');
const {
  app: electronApp,
  BrowserWindow,
} = require('electron');

const expressProxy = express();
const PROXY_PORT = 7777;

expressProxy.get('/ping', (req, res) => {
  res.send('pong');
});

let server;

function cleanupAndExit() {
  console.log('[electron-proxy] cleaning up before exit');
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

electronApp.whenReady().then(async () => {
  // Create an empty browser window so that the app stays alive
  const emptyBrowserWindow = new BrowserWindow({ show: false, title: 'Proxy Server' });
  await emptyBrowserWindow.loadURL('about:blank');

  server = expressProxy.listen(PROXY_PORT, 'localhost', () => {
    console.log('[electron-proxy] starting proxy server on port %s', PROXY_PORT);
  });

  electronApp.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      electronApp.quit();
    }
  });

  electronApp.on('will-quit', (evt) => {
    evt.preventDefault();
    cleanupAndExit();
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, cleanupAndExit);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
