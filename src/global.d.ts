interface Window {
  v4l2Api: {
    getExposure: () => Promise<{ success: boolean; data?: string; error?: string }>;
    setAutoExposure: (mode: number) => Promise<{ success: boolean; data?: string; error?: string }>;
    setExposureTime: (time: number) => Promise<{ success: boolean; data?: string; error?: string }>;
    listDevices: () => Promise<{ success: boolean; data?: string; error?: string }>;
  };
}
