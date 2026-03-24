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

// ---- 起動 ----
initCamera();
