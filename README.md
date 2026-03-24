# usbcam-whitebalance

USB カメラの自動露出（Auto Exposure）をプログラムから制御できるかを検証するための Electron + TypeScript アプリケーション。

2 つの異なるアプローチで自動露出の無効化と露出時間の手動設定を試し、どちらが実際に動作するかを GUI 上で確認できる。

- **Pattern 1**: Web API (`MediaStreamTrack.applyConstraints`)
- **Pattern 2**: v4l2-ctl (`child_process.exec` 経由)

## 前提条件

- **Node.js 18 以上**（推奨: v20）
- **USB カメラ**が接続されていること
- **Linux** 環境（Pattern 2 は V4L2 を使用するため Linux 専用）
- **v4l2-utils** がインストールされていること（Pattern 2 で使用）

```bash
# Node.js バージョン確認・切替
node --version
nvm use 20  # v12 など古い場合

# v4l2-utils のインストール（Ubuntu / Debian）
sudo apt install v4l-utils
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

起動すると GUI ウィンドウが開き、以下の 4 セクションが表示される。

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

### Pattern 1: Web API (MediaStream)

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

### Pattern 2: v4l2-ctl (Linux V4L2)

`v4l2-ctl` コマンドを `child_process.exec` 経由で実行して露出を制御する。

| ボタン / 操作 | 動作 |
|-------------|------|
| **Auto Exposure (3)** | `auto_exposure` を `3`（Aperture Priority Mode = 自動）に設定 |
| **Manual Exposure (1)** | `auto_exposure` を `1`（Manual Mode = 手動）に設定 |
| **露出時間スライダー** | 設定したい露出時間を選択（3〜2047） |
| **適用** | `exposure_time_absolute` に値を設定 |
| **現在の露出設定を取得** | `v4l2-ctl --list-ctrls` の露出関連項目をログに表示 |
| **デバイス一覧** | `v4l2-ctl --list-devices` の結果をログに表示 |

**操作手順**:

1. 「デバイス一覧」ボタンでカメラが認識されているか確認
2. 「現在の露出設定を取得」ボタンで現在の設定値を確認
3. 「Manual Exposure (1)」ボタンで自動露出を無効化
4. 露出時間スライダーで値を選択して「適用」ボタンを押す
5. プレビュー映像の明るさが固定されれば制御成功

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

## 検証パターンの違い

| 項目 | Pattern 1: Web API | Pattern 2: v4l2-ctl |
|------|-------------------|-------------------|
| 実行環境 | レンダラープロセス（Chromium） | メインプロセス（Node.js → child_process） |
| 使用 API | `MediaStreamTrack.applyConstraints()` | `v4l2-ctl --set-ctrl` |
| 追加依存 | なし | v4l2-utils（OS パッケージ） |
| 対応 OS | Chromium がサポートする環境 | Linux のみ |
| 利点 | クロスプラットフォーム、追加ツール不要 | カーネルドライバ経由で互換性が高い |
| 欠点 | カメラの対応状況に依存 | Linux 限定 |

## プロジェクト構成

```
usbcam-whitebalance/
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── src/
│   ├── main.ts           # Electron メインプロセス（v4l2-ctl IPC ハンドラ）
│   ├── preload.ts        # contextBridge で v4l2 API をレンダラーに公開
│   ├── renderer.ts       # カメラ初期化、Web API 制御、v4l2 呼び出し、UI 操作
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

### Pattern 1 で exposureMode 対応が NO と表示される

そのカメラは Chromium の MediaStream API 経由での露出制御に対応していない。Pattern 2 (v4l2-ctl) を試すこと。

### Pattern 2 で v4l2-ctl のエラーが出る

```bash
# v4l2-ctl がインストールされているか確認
which v4l2-ctl

# カメラの露出関連コントロールを確認
v4l2-ctl -d /dev/video0 --list-ctrls | grep -i expo

# デバイス一覧
v4l2-ctl --list-devices
```

### Node.js のバージョンエラー

TypeScript 5.x / Electron 28+ は Node.js 18 以上が必要。

```bash
nvm install 20
nvm use 20
node --version  # v20.x.x であること
```
