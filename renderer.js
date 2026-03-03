const { ipcRenderer, webUtils } = require("electron");
const { marked, Renderer } = require("marked");
const { markedHighlight } = require("marked-highlight");
const hljs = require("highlight.js");
const mermaid = require("mermaid").default;

const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default" });

// highlight.js 連携
marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang === "mermaid") return code;
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  })
);

// mermaidコードブロックを専用divに変換するカスタムrenderer
const renderer = new Renderer();
const originalCode = renderer.code.bind(renderer);

renderer.code = function (token) {
  if (token.lang === "mermaid") {
    return `<pre class="mermaid">${token.text}</pre>`;
  }
  return originalCode(token);
};

marked.use({ renderer });

const welcomeEl = document.getElementById("welcome");
const contentEl = document.getElementById("content");

ipcRenderer.on("load-markdown", async (_event, { content }) => {
  welcomeEl.style.display = "none";
  contentEl.style.display = "block";
  contentEl.innerHTML = marked.parse(content);

  // mermaidブロックをSVGに変換
  const mermaidEls = contentEl.querySelectorAll(".mermaid");
  if (mermaidEls.length > 0) {
    try {
      await mermaid.run({ nodes: mermaidEls });
    } catch (err) {
      console.error("[MdV] mermaid run error:", err);
    }
  }
});

document.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const file = e.dataTransfer.files[0];
  if (file) {
    const filePath = webUtils.getPathForFile(file);
    ipcRenderer.send("dropped-file", filePath);
  }
});
