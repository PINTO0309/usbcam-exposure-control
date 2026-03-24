import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('v4l2Api', {
  getExposure: (): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('v4l2:get-exposure'),
  setAutoExposure: (mode: number): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('v4l2:set-auto-exposure', mode),
  setExposureTime: (time: number): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('v4l2:set-exposure-time', time),
  listDevices: (): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('v4l2:list-devices'),
});
