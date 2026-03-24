import { app, BrowserWindow, ipcMain, session } from 'electron';
import { exec } from 'child_process';
import * as path from 'path';

function execPromise(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function findUvccPath(): string {
  // ローカルの node_modules/.bin/uvcc を優先、なければ npx 経由
  const localPath = path.join(__dirname, '..', 'node_modules', '.bin', 'uvcc');
  return localPath;
}

function registerIpcHandlers() {
  const uvccPath = findUvccPath();

  ipcMain.handle('uvcc:get-controls', async () => {
    try {
      return { success: true, data: await execPromise(`"${uvccPath}" export`) };
    } catch (e: any) {
      // ローカルパスで失敗したら npx で再試行
      try {
        return { success: true, data: await execPromise('npx uvcc export') };
      } catch (e2: any) {
        return { success: false, error: e2.message };
      }
    }
  });

  ipcMain.handle('uvcc:set-auto-wb', async (_, enabled: boolean) => {
    const value = enabled ? 1 : 0;
    try {
      const result = await execPromise(`"${uvccPath}" set auto_white_balance_temperature ${value}`);
      return { success: true, data: result };
    } catch (e: any) {
      try {
        const result = await execPromise(`npx uvcc set auto_white_balance_temperature ${value}`);
        return { success: true, data: result };
      } catch (e2: any) {
        return { success: false, error: e2.message };
      }
    }
  });

  ipcMain.handle('uvcc:set-temperature', async (_, temp: number) => {
    try {
      const result = await execPromise(`"${uvccPath}" set white_balance_temperature ${temp}`);
      return { success: true, data: result };
    } catch (e: any) {
      try {
        const result = await execPromise(`npx uvcc set white_balance_temperature ${temp}`);
        return { success: true, data: result };
      } catch (e2: any) {
        return { success: false, error: e2.message };
      }
    }
  });

  ipcMain.handle('uvcc:devices', async () => {
    try {
      return { success: true, data: await execPromise(`"${uvccPath}" devices`) };
    } catch (e: any) {
      try {
        return { success: true, data: await execPromise('npx uvcc devices') };
      } catch (e2: any) {
        return { success: false, error: e2.message };
      }
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // カメラ権限を自動許可
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
