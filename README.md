# usbcam-whitebalance

USB カメラのホワイトバランスをプログラムから制御できるかを検証するための Electron + TypeScript アプリケーション。

2 つの異なるアプローチ（Web API / uvcc CLI）でオートホワイトバランスの無効化と色温度の手動設定を試し、どちらが実際に動作するかを GUI 上で確認できる。

## 前提条件

- **Node.js 18 以上**（推奨: v22）
- **USB カメラ**が接続されていること
- **Linux** の場合、カメラへのアクセス権限が必要（通常は `video` グループに所属していれば可）

### Node.js バージョンの確認・切替

```bash
node --version
# v12 など古い場合は nvm で切替
nvm use 22
```

## セットアップ

### 1. リポジトリのクローンと依存パッケージのインストール

```bash
git clone <repository-url>
cd usbcam-whitebalance
npm install
```

### 2. uvcc のインストール（Pattern 2 を使用する場合のみ）

uvcc は UVC (USB Video Class) カメラの設定を CLI から操作するツール。Pattern 2 の検証に必要。

```bash
# グローバルインストール
npm install -g uvcc

# または、プロジェクトローカルにインストール
npm install uvcc
```

> **注意**: uvcc は libusb に依存しているため、環境によっては追加のシステムパッケージが必要になる場合がある。
>
> ```bash
> # Ubuntu / Debian
> sudo apt install libusb-1.0-0-dev libudev-dev
>
> # macOS (Homebrew)
> brew install libusb
> ```

## 起動方法

```bash
# ビルド＆起動（通常）
npm start

# デバッグログ付きで起動
npm run dev

# ビルドのみ（起動しない）
npm run build
```

起動すると GUI ウィンドウが開き、接続されている USB カメラのプレビュー映像が表示される。

## 画面構成と操作方法

アプリケーションの画面は以下の 4 つのセクションで構成されている。

### カメラプレビュー

画面上部にカメラのライブ映像が 640x480 で表示される。起動時に自動的にカメラへの接続が行われる。

### Camera Capabilities セクション

接続されたカメラの機能情報が表示される。

| 表示項目 | 説明 |
|---------|------|
| デバイス | カメラのデバイス名 |
| 解像度 | 現在の映像解像度 |
| whiteBalanceMode 対応 | Web API から WB 制御が可能か（YES / NO） |
| 現在のモード | auto / manual / continuous |
| 色温度範囲 | カメラがサポートする色温度の最小値〜最大値 |
| 現在の色温度 | 現時点で設定されている色温度 (K) |

**whiteBalanceMode 対応が NO の場合**: そのカメラは Web API（Pattern 1）からのホワイトバランス制御に対応していない。Pattern 2 (uvcc) での制御を試すこと。

### Pattern 1: Web API (MediaStream) セクション

Chromium (Electron) の `MediaStream API` を使用してホワイトバランスを制御する。

| ボタン / 操作 | 動作 |
|-------------|------|
| **Auto WB** | `whiteBalanceMode` を `continuous`（自動）に設定 |
| **Manual WB** | `whiteBalanceMode` を `manual`（手動）に設定 |
| **色温度スライダー** | 設定したい色温度を選択（カメラのケーパビリティに応じて範囲が自動調整される） |
| **適用ボタン** | スライダーで選択した色温度を `manual` モードで適用 |

**操作手順**:

1. カメラのプレビューが表示されていることを確認
2. Camera Capabilities で `whiteBalanceMode 対応: YES` であることを確認
3. 「Manual WB」ボタンを押してマニュアルモードに切替
4. 色温度スライダーを動かして希望の値を選択
5. 「適用」ボタンを押す
6. プレビュー映像の色味が変化すれば制御成功

### Pattern 2: uvcc CLI (child_process) セクション

`uvcc` コマンドを `child_process.exec` 経由で実行してホワイトバランスを制御する。

| ボタン / 操作 | 動作 |
|-------------|------|
| **Auto WB** | `uvcc set auto_white_balance_temperature 1` を実行（自動 WB 有効） |
| **Manual WB** | `uvcc set auto_white_balance_temperature 0` を実行（自動 WB 無効） |
| **色温度スライダー** | 設定したい色温度を選択 |
| **適用ボタン** | `uvcc set white_balance_temperature <値>` を実行 |
| **現在の設定を取得** | `uvcc export` を実行して現在のカメラ設定を JSON でログに表示 |
| **デバイス一覧** | `uvcc devices` を実行して接続中の UVC デバイス一覧をログに表示 |

**操作手順**:

1. 事前に uvcc がインストールされていることを確認（`uvcc --version`）
2. 「デバイス一覧」ボタンで UVC デバイスが認識されているか確認
3. 「現在の設定を取得」ボタンで現在の WB 設定を確認
4. 「Manual WB」ボタンでオート WB を無効化
5. 色温度スライダーで値を選択して「適用」ボタンを押す
6. プレビュー映像の色味が変化すれば制御成功

### Log セクション

画面下部のログパネルに、すべての操作結果がタイムスタンプ付きで記録される。

- 青色: 情報メッセージ
- 緑色: 成功メッセージ
- 赤色: エラーメッセージ

## 検証パターンの違い

| 項目 | Pattern 1: Web API | Pattern 2: uvcc CLI |
|------|-------------------|-------------------|
| 実行環境 | レンダラープロセス（Chromium） | メインプロセス（Node.js） |
| 使用 API | `MediaStreamTrack.applyConstraints()` | `child_process.exec()` → uvcc CLI |
| 追加依存 | なし | uvcc (libusb) |
| 対応 OS | Chromium がサポートする環境 | Linux / macOS（libusb が動作する環境） |
| カメラ制約 | Chromium が認識する UVC カメラ | libusb が認識する UVC カメラ |
| 利点 | 追加ツール不要、Web 標準 API | Web API 非対応のカメラでも制御できる可能性がある |
| 欠点 | カメラ/ブラウザの対応状況に依存 | 外部ツールへの依存、権限設定が必要な場合がある |

## プロジェクト構成

```
usbcam-whitebalance/
├── package.json          # 依存パッケージとスクリプト定義
├── tsconfig.json         # TypeScript コンパイラ設定
├── .gitignore
├── README.md
├── src/
│   ├── main.ts           # Electron メインプロセス（ウィンドウ生成、uvcc IPC ハンドラ）
│   ├── preload.ts        # contextBridge で uvcc API をレンダラーに公開
│   ├── renderer.ts       # カメラ初期化、Web API 制御、uvcc 呼び出し、UI 操作
│   └── index.html        # GUI レイアウト（ダークテーマ）
└── dist/                 # ビルド出力（git 管理外）
```

## トラブルシューティング

### カメラが認識されない

```bash
# Linux: カメラデバイスが存在するか確認
ls /dev/video*

# 権限の確認
groups  # video グループに含まれているか
```

### Pattern 1 で whiteBalanceMode 対応が NO と表示される

そのカメラは Chromium の MediaStream API 経由でのホワイトバランス制御に対応していない。以下を確認:

- UVC 対応カメラかどうか（安価な Web カメラは非対応の場合がある）
- Chromium のバージョン（Electron 28+ に含まれる Chromium で対応）
- `chrome://media-internals` 相当のログで詳細を確認

Pattern 2 (uvcc) であれば制御できる場合がある。

### Pattern 2 で uvcc エラーが出る

```bash
# uvcc がインストールされているか確認
which uvcc
uvcc --version

# デバイスが認識されているか確認
uvcc devices

# Linux: USB デバイスのパーミッション
# root 権限が必要な場合がある
sudo uvcc devices

# udev ルールを設定してパーミッションを付与する方法:
# /etc/udev/rules.d/99-uvc-camera.rules に以下を追加
# SUBSYSTEM=="usb", ATTR{idVendor}=="XXXX", MODE="0666"
# （XXXX はカメラのベンダーID）
```

### Node.js のバージョンエラー

TypeScript 5.x / Electron 28+ は Node.js 18 以上が必要。

```bash
# nvm で切替
nvm install 22
nvm use 22

# 確認
node --version  # v22.x.x であること
```
