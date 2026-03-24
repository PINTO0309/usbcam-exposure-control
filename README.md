# usbcam-exposure-control

USB カメラの自動露出（Auto Exposure）をプログラムから制御できるかを検証するための Electron + TypeScript アプリケーション。

Web API (`MediaStreamTrack.applyConstraints`) を使用して自動露出の無効化と露出時間の手動設定を GUI 上で検証できる。

https://github.com/user-attachments/assets/2493d641-39be-487e-8f5c-0dde0e259254

## 前提条件

- **Node.js 18 以上**（推奨: v20）
- **USB カメラ**が接続されていること

```bash
# Node.js バージョン確認・切替
node --version
nvm use 20  # v12 など古い場合
```

## セットアップ

```bash
git clone <repository-url>
cd usbcam-whitebalance
npm install
```

## 起動方法

```bash
# ビルド＆起動
npm start

# デバッグログ付きで起動
npm run dev

# ビルドのみ
npm run build
```

## 画面構成と操作方法

起動すると GUI ウィンドウが開き、以下の 3 セクションが表示される。

### カメラプレビュー

画面上部に USB カメラのライブ映像が表示される。起動時に自動接続される。

### Camera Capabilities

接続されたカメラの露出制御に関する機能情報が表示される。

| 表示項目 | 説明 |
|---------|------|
| デバイス | カメラのデバイス名 |
| 解像度 | 現在の映像解像度 |
| exposureMode 対応 | Web API から露出制御が可能か（YES / NO） |
| 現在のモード | Auto Exposure / Manual Exposure |
| 露出時間範囲 | カメラがサポートする露出時間の最小値〜最大値 |
| 現在の露出時間 | 現時点で設定されている露出時間 |

### Web API (MediaStream) による露出制御

Chromium (Electron) の MediaStream API を使用して露出を制御する。

| ボタン / 操作 | 動作 |
|-------------|------|
| **Auto Exposure** | `exposureMode` を `continuous`（自動）に設定 |
| **Manual Exposure** | `exposureMode` を `manual`（手動）に設定 |
| **露出時間スライダー** | 設定したい露出時間を選択（Capabilities に応じて範囲が自動調整される） |
| **適用** | スライダーの露出時間を `manual` モードで適用 |

**操作手順**:

1. Camera Capabilities で `exposureMode 対応: YES` であることを確認
2. 「Manual Exposure」ボタンを押して手動モードに切替
3. 露出時間スライダーを動かして希望の値を選択
4. 「適用」ボタンを押す
5. プレビュー映像の明るさが固定されれば制御成功

**実装サンプル**:

```typescript
async function disableAutoExposure(videoElement: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1920 }, height: { ideal: 1080 } }
  });

  videoElement.srcObject = stream;
  const track = stream.getVideoTracks()[0];
  const capabilities = track.getCapabilities() as any;

  // exposureMode の対応確認
  if (capabilities.exposureMode && capabilities.exposureMode.includes('manual')) {
    // 自動露出を無効化（マニュアルモードに設定）
    await track.applyConstraints({
      advanced: [{ exposureMode: 'manual' } as any]
    });

    // 露出時間を固定値で指定する場合
    await track.applyConstraints({
      advanced: [{ exposureMode: 'manual', exposureTime: 166 } as any]
    });
  }
}
```

> **注意**: `exposureMode` と `exposureTime` は TypeScript の標準型定義に含まれていないため、`as any` でキャストする必要がある。

### Log

画面下部のログパネルに、すべての操作結果がタイムスタンプ付きで記録される。

- 青色: 情報メッセージ
- 緑色: 成功メッセージ
- 赤色: エラーメッセージ

## 露出時間について

`exposure_time_absolute` はカメラのセンサーが 1 フレームあたりに光を取り込む時間。単位は通常 0.1ms。

| 値 | 効果 |
|---|------|
| 小さい (例: 3〜50) | 暗くなる・動きがシャープ |
| 大きい (例: 500〜2047) | 明るくなる・動きがブレやすい |

Manual Exposure にして値を固定すると、環境の明るさが変わっても映像の明るさは一定になる。

## プロジェクト構成

```
usbcam-whitebalance/
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── src/
│   ├── main.ts           # Electron メインプロセス
│   ├── preload.ts        # contextBridge 設定
│   ├── renderer.ts       # カメラ初期化、Web API 制御、UI 操作
│   ├── global.d.ts       # Window インターフェース型定義
│   └── index.html        # GUI レイアウト（ダークテーマ）
└── dist/                 # ビルド出力（git 管理外）
```

## トラブルシューティング

### カメラが認識されない

```bash
# カメラデバイスが存在するか確認
ls /dev/video*

# 権限の確認（video グループに所属しているか）
groups
```

### exposureMode 対応が NO と表示される

そのカメラは Chromium の MediaStream API 経由での露出制御に対応していない。UVC 対応カメラであるか確認すること。

### Node.js のバージョンエラー

TypeScript 5.x / Electron 28+ は Node.js 18 以上が必要。

```bash
nvm install 20
nvm use 20
node --version  # v20.x.x であること
```
