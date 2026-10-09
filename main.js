/**
 * EdgeEver Canvas Board Plugin
 * 基于官方 Excalidraw 专业手绘矢量白板内核的全功能画布套件
 * v1.0.7 - 集成无限自由涂鸦压感画笔、所有几何形状、调色板、开源素材库与离线自动同步
 */

// ==================== 1. SVG 图标库 ====================

const ICONS = {
  canvas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
  sync: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`,
};

function generateId(prefix = "el") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

// ==================== 2. Excalidraw 嵌入运行容器 HTML 模板 ====================

const EXCALIDRAW_RUNNER_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Excalidraw Whiteboard</title>
  <style>
    html, body, #root {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #121212;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    #loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #18181b;
      color: #e4e4e7;
      font-size: 14px;
      gap: 16px;
      z-index: 100;
      transition: opacity 0.25s ease;
      user-select: none;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.12);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: cb-spin 0.75s linear infinite;
    }
    @keyframes cb-spin {
      to { transform: rotate(360deg); }
    }
    .loading-tip {
      color: #a1a1aa;
      font-size: 12px;
    }
    .error-container {
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #f87171;
    }
    .retry-btn {
      padding: 6px 16px;
      background: #3b82f6;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .excalidraw .help-dialog-button {
      display: none !important;
    }
  </style>
  <script>
    window.process = { env: { NODE_ENV: 'production' } };
  </script>
  <!-- 基础 UMD 依赖库 (优先国内高可用 jsdelivr 镜像) -->
  <script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js"></script>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <div style="font-weight: 500;">正在载入 Excalidraw 手绘矢量白板引擎...</div>
    <div class="loading-tip">手绘涂鸦 / 压感画笔 / 几何图表 / 调色板 / 开源素材库</div>
    <div class="error-container" id="error-box">
      <div id="error-msg">引擎加载遇到网络阻碍，请检查网络或重试</div>
      <button type="button" class="retry-btn" onclick="location.reload()">重新加载</button>
    </div>
  </div>
  <div id="root"></div>

  <script>
    (function() {
      const React = window.React;
      const ReactDOM = window.ReactDOM;
      const ExcalidrawLib = window.ExcalidrawLib;

      if (!React || !ReactDOM || !ExcalidrawLib || !ExcalidrawLib.Excalidraw) {
        console.error("Excalidraw 依赖加载失败");
        const spinner = document.querySelector('.spinner');
        const errBox = document.getElementById('error-box');
        if (spinner) spinner.style.display = 'none';
        if (errBox) errBox.style.display = 'flex';
        return;
      }

      let excalidrawAPI = null;
      let isInitialLoaded = false;
      let pendingScene = null;

      function App() {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const [theme, setTheme] = React.useState(isDark ? 'dark' : 'light');

        const handleChange = (elements, appState) => {
          if (!isInitialLoaded) return;
          window.parent.postMessage({
            type: 'EXCALIDRAW_CHANGE',
            elements: elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              currentItemFontFamily: appState.currentItemFontFamily,
              theme: appState.theme,
            }
          }, '*');
        };

        return React.createElement(ExcalidrawLib.Excalidraw, {
          excalidrawAPI: function(api) {
            excalidrawAPI = api;
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
              loadingEl.style.opacity = '0';
              setTimeout(function() { loadingEl.remove(); }, 250);
            }
            window.parent.postMessage({ type: 'EXCALIDRAW_READY' }, '*');

            if (pendingScene) {
              excalidrawAPI.updateScene(pendingScene);
              pendingScene = null;
              setTimeout(function() { isInitialLoaded = true; }, 100);
            } else {
              isInitialLoaded = true;
            }
          },
          theme: theme,
          langCode: 'zh-CN',
          onChange: handleChange,
          UIOptions: {
            canvasActions: {
              saveToActiveFile: false,
              loadScene: true,
              export: { saveFileToDisk: true },
              theme: true,
            }
          }
        });
      }

      window.addEventListener('message', function(event) {
        const data = event.data || {};
        const type = data.type;
        const payload = data.payload;

        if (type === 'SET_SCENE') {
          const scene = {
            elements: Array.isArray(payload && payload.elements) ? payload.elements : [],
            appState: (payload && payload.appState) || {}
          };
          if (excalidrawAPI) {
            isInitialLoaded = false;
            excalidrawAPI.updateScene(scene);
            setTimeout(function() { isInitialLoaded = true; }, 100);
          } else {
            pendingScene = scene;
          }
        } else if (type === 'SET_THEME') {
          if (excalidrawAPI && payload && payload.theme) {
            excalidrawAPI.updateScene({
              appState: { theme: payload.theme }
            });
          }
        }
      });

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    })();
  </script>
</body>
</html>`;

// ==================== 3. 插件核心生命周期与驱动 ====================

export default {
  async activate(context) {
    let settings = {
      showMenuItem: true,
      showSidebarShortcut: true,
      autoSaveDelay: 400,
      enableDockButton: true,
    };

    async function loadSettings() {
      try {
        if (context.storage?.get) {
          const s = await context.storage.get("settings");
          if (s) {
            settings.showMenuItem = s.show_menu_item !== false;
            settings.showSidebarShortcut = s.show_sidebar_shortcut !== false;
            settings.autoSaveDelay = s.auto_save_delay || 400;
            settings.enableDockButton = s.enable_dock_button !== false;
          }
        }
      } catch (_) {}
    }

    await loadSettings();

    let currentNote = null;
    let canvasData = null; // 当前 Excalidraw 场景数据: { elements, appState }
    let activeViewMode = "canvas"; // 'canvas' | 'code'
    let canvasContainerEl = null;
    let iframeEl = null;
    let isIframeReady = false;
    let saveTimeout = null;

    // ==================== 4. 辅助解析器与格式升级兼容 ====================

    const EXCALIDRAW_CODEBLOCK_REGEX = /```(?:excalidraw|canvas-board)\s*([\s\S]*?)```/i;

    /**
     * 将旧版轻量卡片连线数据转换为标准 Excalidraw 矢量元素，确保老笔记无缝升级
     */
    function convertLegacyCanvasToExcalidraw(legacy) {
      if (!legacy) return { elements: [], appState: { viewBackgroundColor: "#ffffff" } };

      if (legacy.type === "excalidraw" || (Array.isArray(legacy.elements) && legacy.elements.some((e) => e.type === "rectangle" || e.strokeColor))) {
        return {
          elements: legacy.elements || [],
          appState: legacy.appState || { viewBackgroundColor: "#ffffff" },
        };
      }

      const elements = [];
      const oldElements = Array.isArray(legacy.elements) ? legacy.elements : [];

      for (const el of oldElements) {
        if (el.type === "card") {
          const rectId = el.id || generateId("rect");
          const textId = generateId("text");

          elements.push({
            id: rectId,
            type: "rectangle",
            x: el.x || 100,
            y: el.y || 100,
            width: el.w || 220,
            height: el.h || 110,
            angle: 0,
            strokeColor: el.color === "green" ? "#059669" : el.color === "blue" ? "#2563eb" : "#d97706",
            backgroundColor: el.color === "green" ? "#d1fae5" : el.color === "blue" ? "#dbeafe" : "#fef3c7",
            fillStyle: "solid",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            roundness: { type: 3 },
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 1,
            isDeleted: false,
            boundElements: [{ id: textId, type: "text" }],
          });

          const label = [el.title, el.content].filter(Boolean).join("\n");
          elements.push({
            id: textId,
            type: "text",
            x: (el.x || 100) + 12,
            y: (el.y || 100) + 16,
            width: (el.w || 220) - 24,
            height: (el.h || 110) - 32,
            angle: 0,
            strokeColor: "#1e1e1e",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            text: label || "便签内容",
            fontSize: 16,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            containerId: rectId,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 1,
            isDeleted: false,
          });
        } else if (el.type === "arrow") {
          elements.push({
            id: el.id || generateId("arrow"),
            type: "arrow",
            x: 100,
            y: 100,
            width: 150,
            height: 0,
            angle: 0,
            strokeColor: "#3b82f6",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            roundness: null,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: 1,
            isDeleted: false,
            points: [[0, 0], [150, 0]],
            startBinding: null,
            endBinding: null,
          });
        }
      }

      return {
        elements,
        appState: {
          viewBackgroundColor: "#ffffff",
          theme: "dark",
        },
      };
    }

    /**
     * 生成初始 Excalidraw 架构模板
     */
    function getDefaultExcalidrawScene() {
      const card1Id = generateId("rect");
      const text1Id = generateId("text");
      const card2Id = generateId("rect");
      const text2Id = generateId("text");
      const arrowId = generateId("arrow");

      return {
        type: "excalidraw",
        version: 2,
        elements: [
          {
            id: card1Id,
            type: "rectangle",
            x: 140,
            y: 160,
            width: 240,
            height: 120,
            angle: 0,
            strokeColor: "#2563eb",
            backgroundColor: "#dbeafe",
            fillStyle: "hachure",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            roundness: { type: 3 },
            seed: 1024,
            version: 1,
            versionNonce: 1,
            isDeleted: false,
            boundElements: [{ id: text1Id, type: "text" }, { id: arrowId, type: "arrow" }],
          },
          {
            id: text1Id,
            type: "text",
            x: 155,
            y: 195,
            width: 210,
            height: 50,
            angle: 0,
            strokeColor: "#1e1e1e",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            text: "核心业务中台\\nRESTful API 服务",
            fontSize: 16,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            containerId: card1Id,
            seed: 2048,
            version: 1,
            versionNonce: 1,
            isDeleted: false,
          },
          {
            id: card2Id,
            type: "rectangle",
            x: 520,
            y: 160,
            width: 240,
            height: 120,
            angle: 0,
            strokeColor: "#059669",
            backgroundColor: "#d1fae5",
            fillStyle: "hachure",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            roundness: { type: 3 },
            seed: 3072,
            version: 1,
            versionNonce: 1,
            isDeleted: false,
            boundElements: [{ id: text2Id, type: "text" }, { id: arrowId, type: "arrow" }],
          },
          {
            id: text2Id,
            type: "text",
            x: 535,
            y: 195,
            width: 210,
            height: 50,
            angle: 0,
            strokeColor: "#1e1e1e",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            text: "前端应用与白板\\nEdgeEver Canvas",
            fontSize: 16,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            containerId: card2Id,
            seed: 4096,
            version: 1,
            versionNonce: 1,
            isDeleted: false,
          },
          {
            id: arrowId,
            type: "arrow",
            x: 380,
            y: 220,
            width: 140,
            height: 0,
            angle: 0,
            strokeColor: "#3b82f6",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 2,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            roundness: { type: 2 },
            seed: 5120,
            version: 1,
            versionNonce: 1,
            isDeleted: false,
            points: [[0, 0], [140, 0]],
            startBinding: { elementId: card1Id, focus: 0, gap: 1 },
            endBinding: { elementId: card2Id, focus: 0, gap: 1 },
          },
        ],
        appState: {
          viewBackgroundColor: "#ffffff",
        },
      };
    }

    /**
     * 强力解析当前笔记（Context API 与 Workspace 探查）
     */
    async function resolveCurrentNote() {
      try {
        if (context.editor?.getDocument) {
          const doc = await context.editor.getDocument();
          if (doc) {
            const noteId = doc.noteId || doc.id;
            let full = null;
            if (noteId && context.notes?.get) {
              try {
                full = await context.notes.get(noteId);
              } catch (_) {}
            }
            return {
              id: noteId,
              noteId: noteId,
              title: doc.title || full?.title || "未命名画布",
              contentMarkdown: doc.contentMarkdown ?? full?.contentMarkdown ?? doc.content ?? full?.content ?? "",
              content: doc.content ?? full?.content ?? doc.contentMarkdown ?? full?.contentMarkdown ?? "",
              tags: doc.tags || full?.tags || [],
              notebookId: doc.notebookId || full?.notebookId,
            };
          }
        }
      } catch (_) {}

      try {
        if (context.editor?.getActiveNoteId && context.notes?.get) {
          const id = await context.editor.getActiveNoteId();
          if (id) {
            const full = await context.notes.get(id);
            if (full) {
              return {
                id,
                noteId: id,
                title: full.title || "未命名画布",
                contentMarkdown: full.contentMarkdown || full.content || "",
                content: full.content || full.contentMarkdown || "",
                tags: full.tags || [],
                notebookId: full.notebookId,
              };
            }
          }
        }
      } catch (_) {}

      try {
        if (context.workspace?.getActiveNote) {
          const full = await context.workspace.getActiveNote();
          if (full) {
            const id = full.id || full.noteId;
            return {
              id,
              noteId: id,
              title: full.title || "未命名画布",
              contentMarkdown: full.contentMarkdown || full.content || "",
              content: full.content || full.contentMarkdown || "",
              tags: full.tags || [],
              notebookId: full.notebookId,
            };
          }
        }
      } catch (_) {}

      return null;
    }

    /**
     * DOM 级精准嗅探：探查当前编辑器是否包含 excalidraw 或 canvas-board 标头/数据
     */
    function sniffCanvasFromDOM() {
      const contentEl = findEditorContentContainer();
      if (!contentEl) return null;

      const allText = contentEl.innerText || contentEl.textContent || "";
      const hasCanvasKeyword = /excalidraw|canvas-board/i.test(allText);

      const codeLangEls = contentEl.querySelectorAll("[class*='lang'], [class*='header'], [class*='title'], span, div");
      let hasLangTag = false;
      for (const el of codeLangEls) {
        const t = (el.textContent || "").trim();
        if (t === "EXCALIDRAW" || t === "CANVAS-BOARD" || /excalidraw|canvas-board/i.test(t)) {
          hasLangTag = true;
          break;
        }
      }

      const expandBtn = Array.from(contentEl.querySelectorAll("button, div, span")).find(
        (el) => el.textContent && el.textContent.includes("展开余下代码")
      );
      if (expandBtn) {
        try { expandBtn.click(); } catch (_) {}
      }

      const codeBlocks = contentEl.querySelectorAll("pre, code, [class*='code']");
      for (const block of codeBlocks) {
        const blockText = (block.innerText || block.textContent || "").trim();
        if (blockText.includes('"elements"') && (blockText.includes('"appState"') || blockText.includes('"viewport"') || blockText.includes('"type"'))) {
          try {
            const parsed = JSON.parse(blockText);
            if (parsed && Array.isArray(parsed.elements)) {
              return { isCanvas: true, data: convertLegacyCanvasToExcalidraw(parsed) };
            }
          } catch (_) {
            const match = blockText.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]);
                if (parsed && Array.isArray(parsed.elements)) {
                  return { isCanvas: true, data: convertLegacyCanvasToExcalidraw(parsed) };
                }
              } catch (_) {}
            }
          }
        }
      }

      if (hasCanvasKeyword || hasLangTag) {
        return { isCanvas: true, data: null };
      }

      return null;
    }

    /**
     * 判断当前笔记是否为画布笔记
     */
    function isCanvasNote(note, domSniff = null) {
      if (domSniff && domSniff.isCanvas) return true;
      if (!note) return false;

      const hasCanvasTag = Array.isArray(note.tags) && (
        note.tags.includes("画布") || note.tags.includes("canvas") || note.tags.includes("excalidraw")
      );
      if (hasCanvasTag) return true;

      const content = note.contentMarkdown || note.content || "";
      if (EXCALIDRAW_CODEBLOCK_REGEX.test(content) || /excalidraw/i.test(content)) {
        return true;
      }

      return false;
    }

    function parseCanvasData(content, domSniff = null) {
      if (domSniff && domSniff.data) {
        return domSniff.data;
      }

      const match = (content || "").match(EXCALIDRAW_CODEBLOCK_REGEX);
      if (match && match[1]) {
        try {
          const data = JSON.parse(match[1].trim());
          if (data && Array.isArray(data.elements)) {
            return convertLegacyCanvasToExcalidraw(data);
          }
        } catch (_) {}
      }

      const jsonMatch = (content || "").match(/\{[\s\S]*"elements"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0].trim());
          if (data && Array.isArray(data.elements)) {
            return convertLegacyCanvasToExcalidraw(data);
          }
        } catch (_) {}
      }

      return getDefaultExcalidrawScene();
    }

    function serializeCanvasData(noteTitle, data) {
      const title = noteTitle || "未命名画布";
      const payload = {
        type: "excalidraw",
        version: 2,
        source: "https://excalidraw.com",
        elements: data.elements || [],
        appState: data.appState || { viewBackgroundColor: "#ffffff" },
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      return `# ${title}\n\n\`\`\`excalidraw\n${jsonStr}\n\`\`\`\n`;
    }

    // ==================== 5. 模块一：菜单项与快捷入口 ====================

    async function resolveTargetNotebookId() {
      try {
        if (context.editor?.getDocument) {
          const doc = await context.editor.getDocument();
          if (doc?.notebookId) return String(doc.notebookId);
        }
      } catch (_) {}

      try {
        if (context.workspace?.getActiveNotebook) {
          const nb = await context.workspace.getActiveNotebook();
          if (nb?.id) return String(nb.id);
        }
      } catch (_) {}

      try {
        if (context.notebooks?.list) {
          const list = await context.notebooks.list();
          const nbs = Array.isArray(list) ? list : list?.notebooks || [];
          if (nbs.length > 0 && nbs[0].id) return String(nbs[0].id);
        }
      } catch (_) {}

      try {
        if (context.notes?.query) {
          const res = await context.notes.query({ limit: 1 });
          const items = Array.isArray(res) ? res : res?.notes || [];
          if (items.length > 0 && items[0].notebookId) {
            return String(items[0].notebookId);
          }
        }
      } catch (_) {}

      return "";
    }

    async function createNewCanvasNote() {
      try {
        const notebookId = await resolveTargetNotebookId();
        if (!notebookId) {
          throw new Error("未能定位有效笔记本，请确认知识库中存在至少一个笔记本。");
        }

        const title = `未命名画布 ${new Date().toLocaleDateString("zh-CN")}`;
        const initialScene = getDefaultExcalidrawScene();
        const markdownContent = serializeCanvasData(title, initialScene);

        let createdNote = null;
        if (context.notes?.create) {
          createdNote = await context.notes.create({
            notebookId,
            title,
            tags: ["画布"],
            contentMarkdown: markdownContent,
            content: markdownContent,
          });
        }

        if (createdNote?.id) {
          currentNote = createdNote;
          canvasData = initialScene;
          activeViewMode = "canvas";

          if (context.editor?.openDocument) {
            await context.editor.openDocument({ noteId: createdNote.id });
          } else if (context.ui?.openNote) {
            context.ui.openNote(createdNote.id);
          }
          if (context.ui?.showNotice) {
            context.ui.showNotice("🎨 已成功创建 Excalidraw 无限手绘白板！", { type: "success" });
          }

          setTimeout(() => checkAndMountCanvasBoard(true), 80);
          setTimeout(() => checkAndMountCanvasBoard(true), 250);
          setTimeout(() => checkAndMountCanvasBoard(true), 600);
        }
      } catch (err) {
        console.warn("[Canvas Board] 创建画布笔记失败:", err);
        if (context.ui?.showNotice) {
          context.ui.showNotice("创建失败: " + (err.message || "请稍后重试"), { type: "error" });
        }
      }
    }

    function ensureMenuItemInjected() {
      if (!settings.showMenuItem) return;

      const menus = document.querySelectorAll(
        ".dropdown-menu, .menu, .popover, [role='menu'], [class*='dropdown'], [class*='menu']"
      );

      menus.forEach((menu) => {
        const text = menu.textContent || "";
        if (
          (text.includes("思维导图") || text.includes("流程图") || text.includes("普通笔记") || text.includes("多维表格")) &&
          !menu.querySelector(".edgeever-cb-menu-item")
        ) {
          const item = document.createElement("div");
          item.className = "edgeever-cb-menu-item";
          item.setAttribute("role", "menuitem");
          item.innerHTML = `
            ${ICONS.canvas}
            <span>无限画布 (Excalidraw)</span>
          `;
          item.onclick = async (e) => {
            e.stopPropagation();
            menu.style.display = "none";
            await createNewCanvasNote();
          };

          menu.appendChild(item);
        }
      });
    }

    function ensureSidebarShortcutMounted() {
      if (!settings.showSidebarShortcut) {
        document.querySelectorAll(".edgeever-cb-sidebar-btn").forEach((b) => b.remove());
        return;
      }

      if (document.querySelector(".edgeever-cb-sidebar-btn")) return;

      const moreBtn = Array.from(document.querySelectorAll("button, [role='button'], div")).find(
        (b) => b.textContent && (b.textContent.includes("更多类型") || b.textContent.includes("更多"))
      );

      if (moreBtn && moreBtn.parentElement) {
        const shortcutBtn = document.createElement("button");
        shortcutBtn.type = "button";
        shortcutBtn.className = "edgeever-cb-sidebar-btn";
        shortcutBtn.title = "一键新建 Excalidraw 无限手绘白板";
        shortcutBtn.innerHTML = `${ICONS.canvas} 画布`;
        shortcutBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          createNewCanvasNote();
        };

        moreBtn.parentElement.appendChild(shortcutBtn);
      }
    }

    function getOrCreatePluginDock() {
      let dock = document.getElementById("edgeever-plugins-dock");
      if (!dock) {
        dock = document.createElement("div");
        dock.id = "edgeever-plugins-dock";
        dock.className = "edgeever-plugins-dock";
        document.body.appendChild(dock);
      }
      return dock;
    }

    function initDockButton() {
      if (!settings.enableDockButton) {
        document.getElementById("edgeever-cb-dock-btn")?.remove();
        return;
      }

      if (document.getElementById("edgeever-cb-dock-btn")) return;

      const dock = getOrCreatePluginDock();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "edgeever-cb-dock-btn";
      btn.className = "edgeever-cb-sidebar-btn";
      btn.title = "新建 Excalidraw 无限手绘白板";
      btn.style.width = "40px";
      btn.style.height = "40px";
      btn.style.borderRadius = "50%";
      btn.style.padding = "0";
      btn.innerHTML = ICONS.canvas;

      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        createNewCanvasNote();
      };

      dock.appendChild(btn);
    }

    // ==================== 6. 模块二：编辑器嗅探与视口全屏 ====================

    function findEditorContentContainer() {
      const selectors = [
        ".ProseMirror",
        ".milkdown",
        ".markdown-body",
        ".editor-content",
        ".memo-content",
        ".note-content",
        ".edgeever-preview-markdown",
        ".edgeever-workspace-editor .content",
        ".edgeever-workspace-editor [class*='content']",
        "article",
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.isConnected) return el;
      }
      return null;
    }

    function toggleMarkdownToolbars(show) {
      const toolbars = document.querySelectorAll(
        ".milkdown .toolbar, .editor-toolbar, [class*='toolbar'], [class*='format'], [role='toolbar']"
      );
      toolbars.forEach((tb) => {
        if (!tb.closest(".edgeever-canvas-board-container")) {
          tb.classList.toggle("edgeever-cb-hidden-toolbar", !show);
          if (!show) tb.style.display = "none";
          else tb.style.display = "";
        }
      });
    }

    function toggleFullViewport(enable) {
      const contentEl = findEditorContentContainer();
      if (!contentEl) return;
      let curr = contentEl.parentElement;
      while (curr && curr !== document.body) {
        if (curr.classList.contains("edgeever-workspace-editor") || curr.matches("[class*='editor-container']")) {
          break;
        }
        if (enable) {
          curr.classList.add("edgeever-cb-full-viewport");
        } else {
          curr.classList.remove("edgeever-cb-full-viewport");
        }
        curr = curr.parentElement;
      }
    }

    async function checkAndMountCanvasBoard(force = false) {
      const note = await resolveCurrentNote();
      const domSniff = sniffCanvasFromDOM();
      const isCanvas = isCanvasNote(note, domSniff);

      if (!isCanvas) {
        if (canvasContainerEl) {
          canvasContainerEl.remove();
          canvasContainerEl = null;
          iframeEl = null;
          isIframeReady = false;
        }
        document.querySelectorAll(".edgeever-canvas-board-container").forEach((el) => el.remove());
        document.querySelectorAll(".edgeever-cb-source-float-btn").forEach((el) => el.remove());

        toggleMarkdownToolbars(true);
        toggleFullViewport(false);

        const selectors = [
          ".ProseMirror",
          ".milkdown",
          ".markdown-body",
          ".editor-content",
          ".memo-content",
          ".note-content",
          ".edgeever-preview-markdown",
          ".edgeever-workspace-editor .content",
          ".edgeever-workspace-editor [class*='content']",
          "article",
        ];
        for (const sel of selectors) {
          document.querySelectorAll(sel).forEach((el) => {
            if (el.style.display === "none") el.style.display = "";
          });
        }
        return;
      }

      currentNote = note || { id: "current_canvas", title: "未命名画布", tags: ["画布"] };

      const contentEl = findEditorContentContainer();
      if (!contentEl) return;

      const parentWrap = contentEl.parentElement || contentEl;
      if (getComputedStyle(parentWrap).position === "static") {
        parentWrap.style.position = "relative";
      }
      parentWrap.style.minHeight = "600px";

      toggleMarkdownToolbars(false);
      toggleFullViewport(true);

      const currentId = String(currentNote.id || currentNote.noteId || "canvas_board");

      if (!force && canvasContainerEl && canvasContainerEl.isConnected) {
        if (canvasContainerEl.dataset.noteId === currentId) {
          if (activeViewMode === "canvas") {
            contentEl.style.display = "none";
            canvasContainerEl.style.display = "flex";
            toggleMarkdownToolbars(false);
            toggleFullViewport(true);
          }
          return;
        }
        canvasContainerEl.remove();
        canvasContainerEl = null;
        iframeEl = null;
        isIframeReady = false;
      }

      const rawContent = currentNote.contentMarkdown || currentNote.content || "";
      canvasData = parseCanvasData(rawContent, domSniff);

      mountCanvasUI(parentWrap, contentEl);

      const targetNoteId = currentNote.id || currentNote.noteId;
      if (targetNoteId && context.notes?.get) {
        context.notes.get(targetNoteId).then((full) => {
          if (full && (full.contentMarkdown || full.content)) {
            const freshData = parseCanvasData(full.contentMarkdown || full.content);
            if (freshData && Array.isArray(freshData.elements) && freshData.elements.length > 0) {
              canvasData = freshData;
              sendSceneToIframe();
            }
          }
        }).catch(() => {});
      }
    }

    function createSourceFloatButton(parentWrap, contentEl) {
      document.querySelector(".edgeever-cb-source-float-btn")?.remove();
      const floatBtn = document.createElement("button");
      floatBtn.type = "button";
      floatBtn.className = "edgeever-cb-source-float-btn";
      floatBtn.innerHTML = `${ICONS.canvas} 切换为画布视图`;
      floatBtn.title = "点击切回 Excalidraw 可视化手绘白板";

      floatBtn.onclick = () => {
        activeViewMode = "canvas";
        floatBtn.remove();
        toggleMarkdownToolbars(false);
        toggleFullViewport(true);
        if (contentEl) contentEl.style.display = "none";
        if (canvasContainerEl) {
          canvasContainerEl.style.display = "flex";
          const sniff = sniffCanvasFromDOM();
          if (sniff?.data) {
            canvasData = sniff.data;
            sendSceneToIframe();
          }
        } else {
          checkAndMountCanvasBoard(true);
        }
      };

      parentWrap.appendChild(floatBtn);
    }

    // ==================== 7. 模块三：Excalidraw 视口集成与双向通信 ====================

    function sendSceneToIframe() {
      if (iframeEl && iframeEl.contentWindow && isIframeReady && canvasData) {
        iframeEl.contentWindow.postMessage({
          type: "SET_SCENE",
          payload: canvasData,
        }, "*");
      }
    }

    function setSaveStatus(state) {
      if (!canvasContainerEl) return;
      const indicator = canvasContainerEl.querySelector(".edgeever-cb-save-indicator");
      if (!indicator) return;

      if (state === "saving") {
        indicator.innerHTML = `${ICONS.sync} 正在同步...`;
        indicator.classList.add("is-saving");
      } else {
        indicator.innerHTML = `${ICONS.check} 已自动同步`;
        indicator.classList.remove("is-saving");
      }
    }

    function scheduleAutoSave() {
      setSaveStatus("saving");
      if (saveTimeout) clearTimeout(saveTimeout);

      saveTimeout = setTimeout(async () => {
        if (!currentNote || !canvasData) {
          setSaveStatus("saved");
          return;
        }

        const noteId = currentNote.id || currentNote.noteId;
        const noteTitle = currentNote.title || "未命名画布";
        const newMarkdown = serializeCanvasData(noteTitle, canvasData);

        try {
          if (noteId && context.notes?.update) {
            await context.notes.update({
              id: noteId,
              title: noteTitle,
              contentMarkdown: newMarkdown,
              content: newMarkdown,
            });
          }
          currentNote.contentMarkdown = newMarkdown;
          currentNote.content = newMarkdown;
        } catch (err) {
          console.warn("[Canvas Board] 静默保存失败:", err);
        } finally {
          setSaveStatus("saved");
        }
      }, settings.autoSaveDelay);
    }

    function mountCanvasUI(parentWrap, contentEl) {
      document.querySelector(".edgeever-cb-source-float-btn")?.remove();

      if (activeViewMode === "canvas") {
        contentEl.style.display = "none";
        toggleMarkdownToolbars(false);
        toggleFullViewport(true);
      } else {
        contentEl.style.display = "";
        toggleMarkdownToolbars(true);
        toggleFullViewport(false);
      }

      canvasContainerEl = document.createElement("div");
      canvasContainerEl.className = "edgeever-canvas-board-container";
      canvasContainerEl.dataset.noteId = String(currentNote.id || currentNote.noteId || "");
      if (activeViewMode !== "canvas") {
        canvasContainerEl.style.display = "none";
        createSourceFloatButton(parentWrap, contentEl);
      }

      // 右上角浮动操作栏：支持「📄 源码模式」切换与「✓ 已自动同步」状态
      const floatingBar = document.createElement("div");
      floatingBar.className = "edgeever-cb-floating-bar";
      floatingBar.innerHTML = `
        <span class="edgeever-cb-save-indicator">${ICONS.check} 已自动同步</span>
        <button type="button" class="edgeever-cb-mini-btn btn-view-code" title="查看 Markdown 源码">${ICONS.code} 源码模式</button>
      `;

      floatingBar.querySelector(".btn-view-code").onclick = () => {
        activeViewMode = "code";
        if (canvasContainerEl) canvasContainerEl.style.display = "none";
        if (contentEl) contentEl.style.display = "";
        toggleMarkdownToolbars(true);
        toggleFullViewport(false);
        createSourceFloatButton(parentWrap, contentEl);
      };

      // 嵌入 Excalidraw 专业白板 iframe
      iframeEl = document.createElement("iframe");
      iframeEl.className = "edgeever-cb-excalidraw-iframe";
      iframeEl.setAttribute("allow", "clipboard-read; clipboard-write");
      iframeEl.srcdoc = EXCALIDRAW_RUNNER_HTML;

      canvasContainerEl.appendChild(floatingBar);
      canvasContainerEl.appendChild(iframeEl);
      parentWrap.appendChild(canvasContainerEl);

      isIframeReady = false;
    }

    // 监听来自 Excalidraw iframe 的事件
    window.addEventListener("message", (event) => {
      const { type, elements, appState } = event.data || {};

      if (type === "EXCALIDRAW_READY") {
        isIframeReady = true;
        sendSceneToIframe();
      } else if (type === "EXCALIDRAW_CHANGE") {
        if (elements) {
          canvasData = {
            type: "excalidraw",
            version: 2,
            elements,
            appState: appState || {},
          };
          scheduleAutoSave();
        }
      }
    });

    // ==================== 8. 全局定时巡检与生命周期守护 ====================

    ensureSidebarShortcutMounted();
    ensureMenuItemInjected();
    initDockButton();
    checkAndMountCanvasBoard(false);

    const observer = new MutationObserver(() => {
      ensureMenuItemInjected();
      ensureSidebarShortcutMounted();
      initDockButton();
      checkAndMountCanvasBoard(false);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    let lastLocation = window.location.href;
    const intervalTimer = setInterval(() => {
      ensureMenuItemInjected();
      ensureSidebarShortcutMounted();
      initDockButton();

      if (window.location.href !== lastLocation) {
        lastLocation = window.location.href;
        checkAndMountCanvasBoard(true);
      } else {
        checkAndMountCanvasBoard(false);
      }
    }, 1500);

    return {
      deactivate() {
        observer.disconnect();
        clearInterval(intervalTimer);
        document.querySelectorAll(".edgeever-cb-menu-item").forEach((el) => el.remove());
        document.querySelectorAll(".edgeever-cb-sidebar-btn").forEach((el) => el.remove());
        document.querySelectorAll(".edgeever-canvas-board-container").forEach((el) => el.remove());
        document.querySelectorAll(".edgeever-cb-source-float-btn").forEach((el) => el.remove());
        toggleMarkdownToolbars(true);
        toggleFullViewport(false);
      },
    };
  },
};
