# MdV

macOS向けのシンプルなMarkdownビューアー。Electron製。

## スクリーンショット

<img width="2712" height="3230" alt="CleanShot 2026-03-10 at 14 42 40@2x" src="https://github.com/user-attachments/assets/654f629c-2710-4339-a006-34de2367c53c" />


## 機能

- Markdown → HTML変換（GitHub風スタイル）
- コードブロックのシンタックスハイライト
- ダークモード自動対応
- Cmd+O / ドラッグ&ドロップ / Finderの「このアプリで開く」に対応

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

`/Applications` にコピーすると、Finderで `.md` ファイルを右クリック →「このアプリケーションで開く」→ MdV で開けるようになります。

## 技術スタック

- [Electron](https://www.electronjs.org/)
- [marked](https://marked.js.org/)
- [highlight.js](https://highlightjs.org/)

## ライセンス

MIT
