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

// 検索機能（DOMベース）
const searchBarEl = document.getElementById("search-bar");
const searchInputEl = document.getElementById("search-input");
const searchCountEl = document.getElementById("search-count");

let searchVisible = false;
let searchMatches = [];
let activeMatchIndex = -1;
let searchDebounceTimer = null;

function openSearch() {
  searchVisible = true;
  searchBarEl.style.display = "flex";
  searchInputEl.focus();
  searchInputEl.select();
}

function closeSearch() {
  searchVisible = false;
  searchBarEl.style.display = "none";
  searchInputEl.value = "";
  searchCountEl.textContent = "";
  clearHighlights();
}

function clearHighlights() {
  searchMatches = [];
  activeMatchIndex = -1;
  const marks = contentEl.querySelectorAll("mark.search-hit");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

function highlightMatches(query) {
  clearHighlights();
  if (!query) return;

  const lowerQuery = query.toLowerCase();
  const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  for (const node of textNodes) {
    const text = node.textContent;
    const lowerText = text.toLowerCase();
    let idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) continue;

    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    while (idx !== -1) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
      const mark = document.createElement("mark");
      mark.className = "search-hit";
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);
      lastIdx = idx + query.length;
      idx = lowerText.indexOf(lowerQuery, lastIdx);
    }
    frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    node.parentNode.replaceChild(frag, node);
  }

  searchMatches = Array.from(contentEl.querySelectorAll("mark.search-hit"));
  if (searchMatches.length > 0) {
    activeMatchIndex = 0;
    updateActiveMatch();
  }
  updateSearchCount();
}

function updateActiveMatch() {
  searchMatches.forEach((m) => m.classList.remove("search-hit-active"));
  if (activeMatchIndex >= 0 && activeMatchIndex < searchMatches.length) {
    const active = searchMatches[activeMatchIndex];
    active.classList.add("search-hit-active");
    active.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function updateSearchCount() {
  if (searchMatches.length > 0) {
    searchCountEl.textContent = `${activeMatchIndex + 1}/${searchMatches.length}`;
  } else if (searchInputEl.value) {
    searchCountEl.textContent = "0件";
  } else {
    searchCountEl.textContent = "";
  }
}

function goToMatch(forward) {
  if (searchMatches.length === 0) return;
  if (forward) {
    activeMatchIndex = (activeMatchIndex + 1) % searchMatches.length;
  } else {
    activeMatchIndex = (activeMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  }
  updateActiveMatch();
  updateSearchCount();
}

ipcRenderer.on("toggle-search", () => {
  if (searchVisible) {
    closeSearch();
  } else {
    openSearch();
  }
});

searchInputEl.addEventListener("input", () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    highlightMatches(searchInputEl.value);
  }, 200);
});

searchInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    goToMatch(!e.shiftKey);
  }
  if (e.key === "Escape") {
    closeSearch();
  }
});

document.getElementById("search-prev").addEventListener("click", () => goToMatch(false));
document.getElementById("search-next").addEventListener("click", () => goToMatch(true));
document.getElementById("search-close").addEventListener("click", () => closeSearch());

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
