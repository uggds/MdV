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
const tabBarEl = document.getElementById("tab-bar");

// タブ管理
let tabs = []; // { filePath, fileName, content, renderedHTML }
let activeTabIndex = -1;

function renderTabs() {
  if (tabs.length <= 1) {
    tabBarEl.style.display = "none";
    return;
  }
  tabBarEl.style.display = "flex";
  tabBarEl.innerHTML = tabs
    .map(
      (tab, i) =>
        `<div class="tab${i === activeTabIndex ? " active" : ""}" data-index="${i}">
          <span class="tab-label">${tab.fileName}</span>
          <span class="tab-close" data-index="${i}">&times;</span>
        </div>`
    )
    .join("");
}

function activateTab(index) {
  if (index < 0 || index >= tabs.length) return;
  activeTabIndex = index;
  const tab = tabs[index];
  contentEl.innerHTML = tab.renderedHTML;
  renderTabs();
  ipcRenderer.send("update-title", `${tab.fileName} - MdV`);

  // mermaidブロックを再レンダリング
  const mermaidEls = contentEl.querySelectorAll(".mermaid:not([data-processed])");
  if (mermaidEls.length > 0) {
    mermaid.run({ nodes: mermaidEls }).catch((err) => {
      console.error("[MdV] mermaid run error:", err);
    });
  }
}

async function addTab(file) {
  const renderedHTML = marked.parse(file.content);

  // 同じファイルが既に開かれていればそのタブをアクティブにする
  const existing = tabs.findIndex((t) => t.filePath === file.filePath);
  if (existing !== -1) {
    tabs[existing].content = file.content;
    tabs[existing].renderedHTML = renderedHTML;
    activateTab(existing);
    return;
  }

  tabs.push({
    filePath: file.filePath,
    fileName: file.fileName,
    content: file.content,
    renderedHTML,
  });
  activateTab(tabs.length - 1);
}

function closeTab(index) {
  tabs.splice(index, 1);
  if (tabs.length === 0) {
    activeTabIndex = -1;
    contentEl.style.display = "none";
    contentEl.innerHTML = "";
    welcomeEl.style.display = "";
    tabBarEl.style.display = "none";
    ipcRenderer.send("update-title", "MdV - Markdown Viewer");
    return;
  }
  if (activeTabIndex >= tabs.length) {
    activeTabIndex = tabs.length - 1;
  }
  activateTab(activeTabIndex);
}

// タブバーのクリックイベント
tabBarEl.addEventListener("click", (e) => {
  const closeBtn = e.target.closest(".tab-close");
  if (closeBtn) {
    e.stopPropagation();
    closeTab(Number(closeBtn.dataset.index));
    return;
  }
  const tabEl = e.target.closest(".tab");
  if (tabEl) {
    activateTab(Number(tabEl.dataset.index));
  }
});

// 単一ファイル読み込み
ipcRenderer.on("load-markdown", async (_event, file) => {
  welcomeEl.style.display = "none";
  contentEl.style.display = "block";
  await addTab(file);
});

// 複数ファイル読み込み
ipcRenderer.on("load-markdown-multiple", async (_event, files) => {
  welcomeEl.style.display = "none";
  contentEl.style.display = "block";

  // 既存タブをクリアして新しいファイル群を表示
  tabs = [];
  for (const file of files) {
    const renderedHTML = marked.parse(file.content);
    tabs.push({
      filePath: file.filePath,
      fileName: file.fileName,
      content: file.content,
      renderedHTML,
    });
  }
  activateTab(0);
});

document.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const files = e.dataTransfer.files;
  if (files.length === 1) {
    const filePath = webUtils.getPathForFile(files[0]);
    ipcRenderer.send("dropped-file", filePath);
  } else if (files.length > 1) {
    const filePaths = Array.from(files).map((f) => webUtils.getPathForFile(f));
    ipcRenderer.send("dropped-files", filePaths);
  }
});
