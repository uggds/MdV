const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;
let pendingFiles = [];

// macOS: Finderの「このアプリで開く」やファイルダブルクリック時に呼ばれる
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents.isLoading() === false) {
    loadMarkdownFile(filePath);
  } else {
    pendingFiles.push(filePath);
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.webContents.on("did-finish-load", () => {
    if (pendingFiles.length > 0) {
      loadMarkdownFiles(pendingFiles);
      pendingFiles = [];
    }
  });

  mainWindow.webContents.on("will-navigate", (e) => e.preventDefault());

  mainWindow.on("drop", (e) => e.preventDefault());

  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Open",
          accelerator: "CmdOrCtrl+O",
          click: openFile,
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]);
  Menu.setApplicationMenu(menu);
}

async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });

  if (result.canceled || result.filePaths.length === 0) return;

  if (result.filePaths.length === 1) {
    loadMarkdownFile(result.filePaths[0]);
  } else {
    loadMarkdownFiles(result.filePaths);
  }
}

function loadMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);
  mainWindow.webContents.send("load-markdown", { content, fileName, filePath });
  mainWindow.setTitle(`${fileName} - MdV`);
}

function loadMarkdownFiles(filePaths) {
  const files = filePaths.map((filePath) => ({
    content: fs.readFileSync(filePath, "utf-8"),
    fileName: path.basename(filePath),
    filePath,
  }));
  mainWindow.webContents.send("load-markdown-multiple", files);
  mainWindow.setTitle(`${files.length} files - MdV`);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on("dropped-file", (_event, filePath) => {
  if (filePath && (filePath.endsWith(".md") || filePath.endsWith(".markdown"))) {
    loadMarkdownFile(filePath);
  }
});

ipcMain.on("dropped-files", (_event, filePaths) => {
  const mdPaths = filePaths.filter(
    (p) => p.endsWith(".md") || p.endsWith(".markdown")
  );
  if (mdPaths.length === 1) {
    loadMarkdownFile(mdPaths[0]);
  } else if (mdPaths.length > 1) {
    loadMarkdownFiles(mdPaths);
  }
});

ipcMain.on("update-title", (_event, title) => {
  mainWindow.setTitle(title);
});
