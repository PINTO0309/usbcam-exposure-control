import { contextBridge } from 'electron';

// Pattern 1 は Web API のみ使用するため、IPC 不要
// preload は contextIsolation のために必要
contextBridge.exposeInMainWorld('electronApi', {
  platform: process.platform,
});
