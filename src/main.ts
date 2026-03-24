import { app, BrowserWindow, ipcMain, Menu, session } from 'electron';
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

function registerIpcHandlers() {
  // ---- Pattern 4: v4l2-ctl ----
  ipcMain.handle('v4l2:get-exposure', async () => {
    try {
      const result = await execPromise('v4l2-ctl -d /dev/video0 --list-ctrls');
      const lines = result.split('\n').filter((l: string) => /expo/i.test(l));
      return { success: true, data: lines.join('\n') };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('v4l2:set-auto-exposure', async (_, mode: number) => {
    try {
      const result = await execPromise(`v4l2-ctl -d /dev/video0 --set-ctrl=auto_exposure=${mode}`);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('v4l2:set-exposure-time', async (_, time: number) => {
    try {
      const result = await execPromise(`v4l2-ctl -d /dev/video0 --set-ctrl=exposure_time_absolute=${time}`);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('v4l2:list-devices', async () => {
    try {
      const result = await execPromise('v4l2-ctl --list-devices');
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 1235,
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
  Menu.setApplicationMenu(null);
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
