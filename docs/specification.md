# MdV 仕様書

## 1. システム構成

### 1.1 技術スタック

| 項目 | 技術 |
|------|------|
| アプリケーション基盤 | Electron 40.x |
| Markdownパーサー | marked 17.x |
| コードハイライト | highlight.js 11.x |
| パッケージング | electron-builder 26.x |
| 対象OS | macOS (arm64) |

### 1.2 ファイル構成

```
mdv/
├── package.json        # プロジェクト定義・ビルド設定
├── main.js             # Electronメインプロセス
├── index.html          # レンダラー画面
├── renderer.js         # レンダラーロジック
├── style.css           # スタイルシート
└── docs/
    ├── requirements.md # 要求書（本ファイル群）
    └── specification.md
```

### 1.3 プロセス構成

- **メインプロセス** (`main.js`): ウィンドウ管理、メニュー、ファイルダイアログ、OS連携
- **レンダラープロセス** (`renderer.js`): Markdown変換、HTML表示、D&Dイベント処理

## 2. 機能仕様

### 2.1 ウィンドウ

- 初期サイズ: 800 x 600px
- `nodeIntegration: true`, `contextIsolation: false` で構成
- タイトルバー: ファイル未選択時は `MdV - Markdown Viewer`、ファイル選択時は `{ファイル名} - MdV`

### 2.2 ファイルを開く

#### 2.2.1 メニュー / ショートカット（FR-01, FR-02）

- メニューバー「File」→「Open」を配置
- ショートカット: `Cmd+O`（macOS）/ `Ctrl+O`（その他）
- `dialog.showOpenDialog` を使用
- フィルター: 拡張子 `.md`, `.markdown`

#### 2.2.2 ドラッグ&ドロップ（FR-03）

- レンダラー側で `drop` イベントをリッスン
- ドロップされたファイルのパスをIPC（`dropped-file`）でメインプロセスに送信
- メインプロセスで拡張子を検証後、ファイルを読み込み

#### 2.2.3 Finder連携（FR-04）

- macOSの `open-file` イベントをハンドリング
- アプリ起動前にイベントが発火した場合は `pendingFile` に保持し、`did-finish-load` 後に読み込み
- `electron-builder` の `fileAssociations` で `.md` / `.markdown` を関連付け
  - `role: Viewer`
  - `category: public.app-category.utilities`

### 2.3 ファイル読み込み・表示

```
[ファイル選択] → main.js: fs.readFileSync(path, "utf-8")
              → IPC: "load-markdown" { content, fileName, filePath }
              → renderer.js: marked.parse(content)
              → DOM: #content.innerHTML に反映
```

- ファイルはUTF-8として読み込み
- IPCチャネル `load-markdown` でレンダラーにデータ送信
- データ: `{ content: string, fileName: string, filePath: string }`

### 2.4 Markdownレンダリング（FR-05, FR-06, FR-07）

- `marked` ライブラリでMarkdown → HTML変換
- `highlight.js` でコードブロックをハイライト
  - 言語指定あり: `hljs.highlight(code, { language })` を使用
  - 言語指定なし: `hljs.highlightAuto(code)` でフォールバック
- 対応するMarkdown要素:
  - 見出し（h1〜h6）
  - 段落
  - リスト（順序付き・順序なし）
  - コードブロック / インラインコード
  - リンク
  - 画像
  - テーブル
  - 引用
  - 水平線

### 2.5 ウェルカム画面（FR-08）

- ファイル未選択時に `#welcome` 要素を表示
- 内容: アプリ名「MdV」、サブタイトル「Markdown Viewer」、操作ヒント
- ファイル読み込み時に非表示にし、`#content` を表示に切り替え

## 3. UI仕様

### 3.1 レイアウト

- Markdown表示エリア: 最大幅800px、左右中央配置
- パディング: 上下32px、左右24px

### 3.2 スタイル

GitHub風のMarkdownスタイルを採用。

| 要素 | ライトモード | ダークモード |
|------|-------------|-------------|
| 背景色 | `#fff` | `#0d1117` |
| 文字色 | `#24292f` | `#e6edf3` |
| リンク色 | `#0969da` | `#58a6ff` |
| コードブロック背景 | `#f6f8fa` | `#161b22` |
| ボーダー色 | `#d1d9e0` | `#30363d` |
| 引用文字色 | `#656d76` | `#8b949e` |

### 3.3 ダークモード対応（FR-09）

- `prefers-color-scheme` メディアクエリで自動切り替え
- highlight.jsのテーマも連動
  - ライト: `github.css`
  - ダーク: `github-dark.css`

### 3.4 フォント

- 本文: `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
- コード: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`

## 4. IPC通信仕様

| チャネル | 方向 | データ | 説明 |
|---------|------|--------|------|
| `load-markdown` | Main → Renderer | `{ content, fileName, filePath }` | Markdownファイルの内容を送信 |
| `dropped-file` | Renderer → Main | `filePath: string` | D&Dされたファイルパスを送信 |

## 5. ビルド・配布

### 5.1 開発起動

```bash
npm start
```

### 5.2 パッケージング

```bash
npm run build
```

- 出力先: `dist/mac-arm64/MdV.app`
- ターゲット: `dir`（ディレクトリ出力、インストーラーなし）
- コード署名: ad-hoc署名（ローカル利用のため）

### 5.3 インストール

```bash
cp -r dist/mac-arm64/MdV.app /Applications/
```
