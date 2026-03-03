# Mermaid対応で発生した問題と解決策

## 問題1: marked v17 の API変更

### 症状
`marked.setOptions({ highlight, renderer })` でカスタムrendererを設定してもコードブロックの変換が反映されない。

### 原因
marked v17 では `setOptions` ではなく `marked.use()` が正しいAPI。
また `highlight` オプションも非推奨となり、`marked-highlight` パッケージに分離された。

### 解決策
```js
// NG: v17では動かない
marked.setOptions({ renderer, highlight(code, lang) { ... } });

// OK
const { markedHighlight } = require("marked-highlight");
marked.use(markedHighlight({ highlight(code, lang) { ... } }));
marked.use({ renderer });
```

## 問題2: highlight.js が mermaid 構文を壊す

### 症状
mermaidブロックの中身に `<span>` タグが挿入され、`A-->B` が `<span class="hljs-selector-tag">A</span>--&gt;<span ...>B</span>` になる。mermaid がパースできない。

### 原因
`markedHighlight` の `highlight` 関数が全コードブロックに適用され、mermaid構文もハイライト処理されてしまう。

### 解決策
`highlight` 関数内で `lang === "mermaid"` の場合はそのまま返す。

```js
highlight(code, lang) {
  if (lang === "mermaid") return code;  // ハイライトをスキップ
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang }).value;
  }
  return hljs.highlightAuto(code).value;
},
```

## 問題3: mermaid の require で `.default` が必要

### 症状
`mermaid.initialize is not a function` エラー。

### 原因
`require("mermaid")` は ESMラッパーの `{ __esModule: true, default: ... }` を返す。`initialize` や `render` は `default` の下にある。

### 解決策
```js
// NG
const mermaid = require("mermaid");

// OK
const mermaid = require("mermaid").default;
```

## 問題4: mermaid.render() で生成したSVGが表示されない

### 症状
`mermaid.render(id, source)` は成功し、SVG文字列（25,000文字超）が返るが、`el.innerHTML = svg` で差し込んでも画面に図が表示されない。エラーも出ない。

### 原因
`mermaid.render()` は内部で一時的なDOM要素を作成してレンダリングする。すでにページ上に存在する `.mermaid` 要素とIDや状態が競合し、生成されるSVGのサイズ・座標が正しく計算されない。

### 解決策
`mermaid.render()` の代わりに `mermaid.run()` を使う。`mermaid.run()` は公式推奨のAPIで、DOM上の要素を直接管理してSVGに変換する。

```js
// NG: SVGは生成されるが表示されないケースがある
const { svg } = await mermaid.render(el.id, el.textContent);
el.innerHTML = svg;

// OK: mermaid がDOM操作まで一貫して行う
await mermaid.run({ nodes: mermaidEls });
```

## 問題5: Electron の file.path 廃止

### 症状
ドラッグ&ドロップ時に `TypeError: Cannot read properties of undefined (reading 'endsWith')` が発生。

### 原因
Electron 40 では `File.path` が廃止された。`e.dataTransfer.files[0].path` が `undefined` を返す。

### 解決策
`webUtils.getPathForFile()` を使う。

```js
const { ipcRenderer, webUtils } = require("electron");

// NG: Electron 40+
ipcRenderer.send("dropped-file", file.path);

// OK
const filePath = webUtils.getPathForFile(file);
ipcRenderer.send("dropped-file", filePath);
```
