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
const webapiExpSlider = document.getElementById('webapi-exp') as HTMLInputElement;
const webapiExpValue = document.getElementById('webapi-exp-value')!;
const webapiApplyExpBtn = document.getElementById('webapi-apply-exp') as HTMLButtonElement;

// ---- スライダーの値表示更新 ----
webapiExpSlider.addEventListener('input', () => {
  webapiExpValue.textContent = webapiExpSlider.value;
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

  if (capabilities.exposureMode) {
    html += `<div>exposureMode 対応: <span style="color:#608b4e">YES</span> (${capabilities.exposureMode.join(', ')})</div>`;
    const modeLabel = settings.exposureMode === 'continuous' ? 'Auto Exposure' : settings.exposureMode === 'manual' ? 'Manual Exposure' : settings.exposureMode || '不明';
    html += `<div>現在のモード: <span>${modeLabel}</span></div>`;
  } else {
    html += `<div>exposureMode 対応: <span style="color:#f44747">NO (Web APIからの制御不可)</span></div>`;
  }

  if (capabilities.exposureTime) {
    html += `<div>露出時間範囲: <span>${capabilities.exposureTime.min} - ${capabilities.exposureTime.max} (step: ${capabilities.exposureTime.step})</span></div>`;
    html += `<div>現在の露出時間: <span>${settings.exposureTime || '不明'}</span></div>`;

    webapiExpSlider.min = String(capabilities.exposureTime.min);
    webapiExpSlider.max = String(capabilities.exposureTime.max);
    webapiExpSlider.step = String(capabilities.exposureTime.step);
    if (settings.exposureTime) {
      webapiExpSlider.value = String(settings.exposureTime);
      webapiExpValue.textContent = String(settings.exposureTime);
    }
  } else {
    html += `<div>exposureTime 対応: <span style="color:#f44747">NO</span></div>`;
  }

  capabilitiesDiv.innerHTML = html;
}

// ---- Pattern 1: Web API 制御 ----
webapiAutoBtn.addEventListener('click', async () => {
  if (!currentTrack) return;
  try {
    await currentTrack.applyConstraints({
      advanced: [{ exposureMode: 'continuous' } as any],
    });
    webapiAutoBtn.classList.add('active');
    webapiManualBtn.classList.remove('active');
    setStatus('webapi-status', 'Auto Exposure に設定しました。');
    addLog('[Web API] exposureMode → continuous', 'success');
    displayCapabilities();
  } catch (error: any) {
    setStatus('webapi-status', `エラー: ${error.message}`, true);
    addLog(`[Web API] Auto Exposure 設定エラー: ${error.message}`, 'error');
  }
});

webapiManualBtn.addEventListener('click', async () => {
  if (!currentTrack) return;
  try {
    await currentTrack.applyConstraints({
      advanced: [{ exposureMode: 'manual' } as any],
    });
    webapiManualBtn.classList.add('active');
    webapiAutoBtn.classList.remove('active');
    setStatus('webapi-status', 'Manual Exposure に設定しました。');
    addLog('[Web API] exposureMode → manual', 'success');
    displayCapabilities();
  } catch (error: any) {
    setStatus('webapi-status', `エラー: ${error.message}`, true);
    addLog(`[Web API] Manual Exposure 設定エラー: ${error.message}`, 'error');
  }
});

webapiApplyExpBtn.addEventListener('click', async () => {
  if (!currentTrack) return;
  const time = parseInt(webapiExpSlider.value, 10);
  try {
    await currentTrack.applyConstraints({
      advanced: [{ exposureMode: 'manual', exposureTime: time } as any],
    });
    webapiManualBtn.classList.add('active');
    webapiAutoBtn.classList.remove('active');
    setStatus('webapi-status', `露出時間を ${time} に設定しました。`);
    addLog(`[Web API] exposureTime → ${time}`, 'success');
    displayCapabilities();
  } catch (error: any) {
    setStatus('webapi-status', `エラー: ${error.message}`, true);
    addLog(`[Web API] 露出時間設定エラー: ${error.message}`, 'error');
  }
});

// ---- Pattern 4: v4l2-ctl 制御 ----
const v4l2AutoBtn = document.getElementById('v4l2-auto') as HTMLButtonElement;
const v4l2ManualBtn = document.getElementById('v4l2-manual') as HTMLButtonElement;
const v4l2ExpSlider = document.getElementById('v4l2-exp') as HTMLInputElement;
const v4l2ExpValueEl = document.getElementById('v4l2-exp-value')!;
const v4l2ApplyExpBtn = document.getElementById('v4l2-apply-exp') as HTMLButtonElement;
const v4l2GetExposureBtn = document.getElementById('v4l2-get-exposure') as HTMLButtonElement;
const v4l2ListDevicesBtn = document.getElementById('v4l2-list-devices') as HTMLButtonElement;

v4l2ExpSlider.addEventListener('input', () => {
  v4l2ExpValueEl.textContent = v4l2ExpSlider.value;
});

v4l2AutoBtn.addEventListener('click', async () => {
  try {
    // v4l2 auto_exposure: 3=Aperture Priority Mode(自動), 1=Manual Mode
    const result = await window.v4l2Api.setAutoExposure(3);
    if (result.success) {
      v4l2AutoBtn.classList.add('active');
      v4l2ManualBtn.classList.remove('active');
      setStatus('v4l2-status', 'Auto Exposure (3: Aperture Priority) に設定しました。');
      addLog('[v4l2] auto_exposure → 3 (Aperture Priority Mode)', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('v4l2-status', `エラー: ${error.message}`, true);
    addLog(`[v4l2] Auto Exposure エラー: ${error.message}`, 'error');
  }
});

v4l2ManualBtn.addEventListener('click', async () => {
  try {
    const result = await window.v4l2Api.setAutoExposure(1);
    if (result.success) {
      v4l2ManualBtn.classList.add('active');
      v4l2AutoBtn.classList.remove('active');
      setStatus('v4l2-status', 'Manual Exposure (1: Manual Mode) に設定しました。');
      addLog('[v4l2] auto_exposure → 1 (Manual Mode)', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('v4l2-status', `エラー: ${error.message}`, true);
    addLog(`[v4l2] Manual Exposure エラー: ${error.message}`, 'error');
  }
});

v4l2ApplyExpBtn.addEventListener('click', async () => {
  const time = parseInt(v4l2ExpSlider.value, 10);
  try {
    const result = await window.v4l2Api.setExposureTime(time);
    if (result.success) {
      setStatus('v4l2-status', `露出時間を ${time} に設定しました。`);
      addLog(`[v4l2] exposure_time_absolute → ${time}`, 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('v4l2-status', `エラー: ${error.message}`, true);
    addLog(`[v4l2] 露出時間設定エラー: ${error.message}`, 'error');
  }
});

v4l2GetExposureBtn.addEventListener('click', async () => {
  try {
    const result = await window.v4l2Api.getExposure();
    if (result.success) {
      setStatus('v4l2-status', '露出設定を取得しました。');
      addLog(`[v4l2] 露出設定:\n${result.data}`, 'info');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('v4l2-status', `エラー: ${error.message}`, true);
    addLog(`[v4l2] 露出取得エラー: ${error.message}`, 'error');
  }
});

v4l2ListDevicesBtn.addEventListener('click', async () => {
  try {
    const result = await window.v4l2Api.listDevices();
    if (result.success) {
      setStatus('v4l2-status', 'デバイス一覧を取得しました。');
      addLog(`[v4l2] デバイス一覧:\n${result.data}`, 'info');
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    setStatus('v4l2-status', `エラー: ${error.message}`, true);
    addLog(`[v4l2] デバイス取得エラー: ${error.message}`, 'error');
  }
});

// ---- 起動 ----
initCamera();
