// uvcc API (preload で公開)
export {};
declare global {
  interface Window {
    uvccApi: {
      getControls: () => Promise<{ success: boolean; data?: string; error?: string }>;
      setAutoWB: (enabled: boolean) => Promise<{ success: boolean; data?: string; error?: string }>;
      setTemperature: (temp: number) => Promise<{ success: boolean; data?: string; error?: string }>;
      getDevices: () => Promise<{ success: boolean; data?: string; error?: string }>;
    };
  }
}

// ---- ログ ----
function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const logDiv = document.getElementById('log')!;
  const entry = document.createElement('div');
  entry.className = `entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function setStatus(elementId: string, message: string, isError = false) {
  const el = document.getElementById(elementId)!;
  el.textContent = message;
  el.className = isError ? 'status error' : 'status';
}

// ---- DOM要素 ----
const videoElement = document.getElementById('video') as HTMLVideoElement;
const capabilitiesDiv = document.getElementById('capabilities')!;

// Pattern 1 要素
const webapiAutoBtn = document.getElementById('webapi-auto') as HTMLButtonElement;
const webapiManualBtn = document.getElementById('webapi-manual') as HTMLButtonElement;
const webapiTempSlider = document.getElementById('webapi-temp') as HTMLInputElement;
const webapiTempValue = document.getElementById('webapi-temp-value')!;
const webapiApplyTempBtn = document.getElementById('webapi-apply-temp') as HTMLButtonElement;

// Pattern 2 要素
const uvccAutoBtn = document.getElementById('uvcc-auto') as HTMLButtonElement;
const uvccManualBtn = document.getElementById('uvcc-manual') as HTMLButtonElement;
const uvccTempSlider = document.getElementById('uvcc-temp') as HTMLInputElement;
const uvccTempValue = document.getElementById('uvcc-temp-value')!;
const uvccApplyTempBtn = document.getElementById('uvcc-apply-temp') as HTMLButtonElement;
const uvccGetControlsBtn = document.getElementById('uvcc-get-controls') as HTMLButtonElement;
const uvccDevicesBtn = document.getElementById('uvcc-devices') as HTMLButtonElement;

// ---- スライダーの値表示更新 ----
webapiTempSlider.addEventListener('input', () => {
  webapiTempValue.textContent = `${webapiTempSlider.value}K`;
});
uvccTempSlider.addEventListener('input', () => {
  uvccTempValue.textContent = `${uvccTempSlider.value}K`;
});

// ---- カメラトラック (Pattern 1 で使用) ----
let currentTrack: MediaStreamTrack | null = null;

// ---- カメラ初期化 ----
async function initCamera() {
  try {
    addLog('カメラを初期化しています...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });

    videoElement.srcObject = stream;
    currentTrack = stream.getVideoTracks()[0];

    addLog(`カメラ接続: ${currentTrack.label}`, 'success');

    // Capabilities を表示
    displayCapabilities();
  } catch (error: any) {
    addLog(`カメラ初期化エラー: ${error.message}`, 'error');
    capabilitiesDiv.textContent = 'カメラの初期化に失敗しました。';
  }
}

function displayCapabilities() {
  if (!currentTrack) return;

  const capabilities = currentTrack.getCapabilities() as any;
  const settings = currentTrack.getSettings() as any;

  let html = '';
  html += `<div>デバイス: <span>${currentTrack.label}</span></div>`;
  html += `<div>解像度: <span>${settings.width}x${settings.height}</span></div>`;

  if (capabilities.whiteBalanceMode) {
    html += `<div>whiteBalanceMode 対応: <span style="color:#608b4e">YES</span> (${capabilities.whiteBalanceMode.join(', ')})</div>`;
    html += `<div>現在のモード: <span>${settings.whiteBalanceMode || '不明'}</span></div>`;
  } else {
    html += `<div>whiteBalanceMode 対応: <span style="color:#f44747">NO (Web APIからの制御不可)</span></div>`;
  }

  if (capabilities.colorTemperature) {
    html += `<div>色温度範囲: <span>${capabilities.colorTemperature.min}K - ${capabilities.colorTemperature.max}K (step: ${capabilities.colorTemperature.step})</span></div>`;
    html += `<div>現在の色温度: <span>${settings.colorTemperature || '不明'}K</span></div>`;

    // スライダー範囲を実際のケーパビリティに合わせる
    webapiTempSlider.min = String(capabilities.colorTemperature.min);
    webapiTempSlider.max = String(capabilities.colorTemperature.max);
    webapiTempSlider.step = String(capabilities.colorTemperature.step);
    if (settings.colorTemperature) {
      webapiTempSlider.value = String(settings.colorTemperature);
      webapiTempValue.textContent = `${settings.colorTemperature}K`;
    }
  } else {
    html += `<div>colorTemperature 対応: <span style="color:#f44747">NO</span></div>`;
  }

  capabilitiesDiv.innerHTML = html;
}

// ---- Pattern 1: Web API 制御 ----
webapiAutoBtn.addEventListener('click', async () => {
  if (!currentTrack) return;
  try {
    await currentTrack.applyConstraints({
      advanced: [{ whiteBalanceMode: 'continuous' } as any],
    });
    webapiAutoBtn.classList.add('active');
    webapiManualBtn.classList.remove('active');
    setStatus('webapi-status', 'Auto WB に設定しました。');
    addLog('[Web API] whiteBalanceMode → continuous', 'success');
    displayCapabilities();
  } catch (error: any) {
    setStatus('webapi-status', `エラー: ${error.message}`, true);
    addLog(`[Web API] Auto WB 設定エラー: ${error.message}`, 'error');
  }
});

webapiManualBtn.addEventListener('click', async () => {
  if (!currentTrack) return;
  try {
    await currentTrack.applyConstraints({
      advanced: [{ whiteBalanceMode: 'manual' } as any],
    });
    webapiManualBtn.classList.add('active');
    webapiAutoBtn.classList.remove('active');
    setStatus('webapi-status', 'Manual WB に設定しました。');
    addLog('[Web API] whiteBalanceMode → manual', 'success');
    displayCapabilities();
  } catch (error: any) {
    setStatus('webapi-status', `エラー: ${error.message}`, true);
    addLog(`[Web API] Manual WB 設定エラー: ${error.message}`, 'error');
  }
});

webapiApplyTempBtn.addEventListener('click', async () => {
  if (!currentTrack) return;
  const temp = parseInt(webapiTempSlider.value, 10);
  try {
    await currentTrack.applyConstraints({
      advanced: [{ whiteBalanceMode: 'manual', colorTemperature: temp } as any],
    });
    webapiManualBtn.classList.add('active');
    webapiAutoBtn.classList.remove('active');
    setStatus('webapi-status', `色温度を ${temp}K に設定しました。`);
    addLog(`[Web API] colorTemperature → ${temp}K`, 'success');
    displayCapabilities();
  } catch (error: any) {
    setStatus('webapi-status', `エラー: ${error.message}`, true);
    addLog(`[Web API] 色温度設定エラー: ${error.message}`, 'error');
  }
});

// ---- Pattern 2: uvcc CLI 制御 ----
uvccAutoBtn.addEventListener('click', async () => {
  try {
    const result = await window.uvccApi.setAutoWB(true);
    if (result.success) {
      uvccAutoBtn.classList.add('active');
      uvccManualBtn.classList.remove('active');
      setStatus('uvcc-status', 'Auto WB を有効化しました。');
      addLog(`[uvcc] auto_white_balance_temperature → 1`, 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('uvcc-status', `エラー: ${error.message}`, true);
    addLog(`[uvcc] Auto WB エラー: ${error.message}`, 'error');
  }
});

uvccManualBtn.addEventListener('click', async () => {
  try {
    const result = await window.uvccApi.setAutoWB(false);
    if (result.success) {
      uvccManualBtn.classList.add('active');
      uvccAutoBtn.classList.remove('active');
      setStatus('uvcc-status', 'Auto WB を無効化しました。');
      addLog(`[uvcc] auto_white_balance_temperature → 0`, 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('uvcc-status', `エラー: ${error.message}`, true);
    addLog(`[uvcc] Manual WB エラー: ${error.message}`, 'error');
  }
});

uvccApplyTempBtn.addEventListener('click', async () => {
  const temp = parseInt(uvccTempSlider.value, 10);
  try {
    const result = await window.uvccApi.setTemperature(temp);
    if (result.success) {
      setStatus('uvcc-status', `色温度を ${temp}K に設定しました。`);
      addLog(`[uvcc] white_balance_temperature → ${temp}`, 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('uvcc-status', `エラー: ${error.message}`, true);
    addLog(`[uvcc] 色温度設定エラー: ${error.message}`, 'error');
  }
});

uvccGetControlsBtn.addEventListener('click', async () => {
  try {
    const result = await window.uvccApi.getControls();
    if (result.success) {
      setStatus('uvcc-status', '設定を取得しました。');
      addLog(`[uvcc] 現在の設定:\n${result.data}`, 'info');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('uvcc-status', `エラー: ${error.message}`, true);
    addLog(`[uvcc] 設定取得エラー: ${error.message}`, 'error');
  }
});

uvccDevicesBtn.addEventListener('click', async () => {
  try {
    const result = await window.uvccApi.getDevices();
    if (result.success) {
      setStatus('uvcc-status', 'デバイス一覧を取得しました。');
      addLog(`[uvcc] デバイス一覧:\n${result.data}`, 'info');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('uvcc-status', `エラー: ${error.message}`, true);
    addLog(`[uvcc] デバイス取得エラー: ${error.message}`, 'error');
  }
});

// ---- 起動 ----
initCamera();
