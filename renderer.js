const { ipcRenderer, webUtils } = require("electron");
const { marked, Renderer } = require("marked");
const { markedHighlight } = require("marked-highlight");
const hljs = require("highlight.js");

// highlight.js 連携
marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  })
);

const welcomeEl = document.getElementById("welcome");
const contentEl = document.getElementById("content");

ipcRenderer.on("load-markdown", (_event, { content }) => {
  welcomeEl.style.display = "none";
  contentEl.style.display = "block";
  contentEl.innerHTML = marked.parse(content);
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
