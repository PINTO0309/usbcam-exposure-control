import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('uvccApi', {
  getControls: (): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('uvcc:get-controls'),
  setAutoWB: (enabled: boolean): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('uvcc:set-auto-wb', enabled),
  setTemperature: (temp: number): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('uvcc:set-temperature', temp),
  getDevices: (): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('uvcc:devices'),
});
