# MdV

macOS 向けのシンプルな Markdown ビューア。Electron 製。

## スクリーンショット

<img width="2712" height="3230" alt="CleanShot 2026-03-10 at 14 42 40@2x" src="https://github.com/user-attachments/assets/654f629c-2710-4339-a006-34de2367c53c" />

## 機能

- **Markdown レンダリング** — GitHub スタイルの表示（見出し、リスト、テーブル、画像など）
- **シンタックスハイライト** — コードブロックの自動ハイライト
- **Mermaid ダイアグラム** — `mermaid` コードブロックを SVG に変換
- **タブ表示** — 複数ファイルをタブで切り替え
- **ページ内検索** — Cmd+F でインクリメンタルサーチ
- **ダークモード** — システム設定に自動追従
- **Finder 連携** — `.md` ファイルのダブルクリック・ドラッグ&ドロップで開く

## セットアップ

```bash
git clone https://github.com/your-username/mdv.git
cd mdv
npm install
```

## 使い方

### 開発モード

```bash
npm start
```

### アプリとしてビルド

```bash
npm run build
cp -r dist/mac-arm64/MdV.app /Applications/
```

`/Applications` にコピーすると、Finder で `.md` ファイルを右クリック →「このアプリケーションで開く」→ MdV で開けるようになります。

## キーボードショートカット

| キー | 操作 |
|------|------|
| `Cmd+O` | ファイルを開く（複数選択可） |
| `Cmd+F` | ページ内検索 |
| `Enter` / `Shift+Enter` | 次 / 前の検索結果へ移動 |
| `Esc` | 検索バーを閉じる |

## 技術スタック

- [Electron](https://www.electronjs.org/)
- [marked](https://marked.js.org/) — Markdown パーサー
- [highlight.js](https://highlightjs.org/) — シンタックスハイライト
- [mermaid](https://mermaid.js.org/) — ダイアグラムレンダリング

## ライセンス

MIT
