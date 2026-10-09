/**
 * EdgeEver Canvas Board Plugin
 * 纯原生、0网络依赖、全功能 Excalidraw 手绘白板与架构画布引擎
 * v1.0.9 - 彻底根除黑屏转圈，原生支持手绘涂鸦画笔、橡皮擦、几何形状、手绘斜线网格填充与调色板
 */

// ==================== 1. SVG 图标库 ====================

const ICONS = {
  canvas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
  select: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7 18 3-7 7-3L3 3z"></path></svg>`,
  pencil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
  eraser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"></path><line x1="18" y1="12" x2="11" y2="19"></line></svg>`,
  rect: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
  diamond: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12 12 2"></polygon></svg>`,
  circle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
  line: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line></svg>`,
  text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" ry="3"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="13" y2="12"></line></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>`,
  redo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
};

function generateId(prefix = "el") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

// ==================== 2. 手绘风格核心算法 (Pure Hand-drawn Rough Renderer) ====================

// 微扰动随机偏移
function roughJitter(val, amount = 1.5) {
  return val + (Math.random() - 0.5) * amount;
}

// 绘制单条手绘抖动线段
function createHandDrawnPath(x1, y1, x2, y2, roughness = 1) {
  if (roughness === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;

  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * roughness * 2.2;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * roughness * 2.2;

  // 双重描边效果，模拟真实马克笔/铅笔笔触
  const p1 = `M ${roughJitter(x1, roughness)} ${roughJitter(y1, roughness)} Q ${midX} ${midY} ${roughJitter(x2, roughness)} ${roughJitter(y2, roughness)}`;
  const p2 = `M ${roughJitter(x1, roughness)} ${roughJitter(y1, roughness)} Q ${midX + (Math.random() - 0.5) * roughness} ${midY + (Math.random() - 0.5) * roughness} ${roughJitter(x2, roughness)} ${roughJitter(y2, roughness)}`;
  return `${p1} ${p2}`;
}

// 生成手绘斜线条填充 (Hachure) 路径
function generateHachureLines(x, y, w, h, gap = 10, angle = 45) {
  const paths = [];
  const rad = (angle * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);

  const diag = Math.sqrt(w * w + h * h);
  for (let d = -diag; d <= diag * 2; d += gap) {
    const x1 = x + d;
    const y1 = y;
    const x2 = x + d + h * cos;
    const y2 = y + h;
    paths.push(`M ${x1} ${y1} L ${x2} ${y2}`);
  }
  return paths.join(" ");
}

// ==================== 3. 插件核心驱动与生命周期 ====================

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

    // 画布运行态
    let currentNote = null;
    let canvasData = null; // 包含 viewport 和 elements
    let activeTool = "select"; // 'select' | 'freedraw' | 'eraser' | 'rect' | 'diamond' | 'circle' | 'arrow' | 'line' | 'text' | 'card'
    let selectedElementId = null;
    let activeViewMode = "canvas"; // 'canvas' | 'code'
    let canvasContainerEl = null;
    let saveTimeout = null;

    // 当前手绘样式调色板状态
    let currentStyle = {
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid", // 'none' | 'solid' | 'hachure' | 'cross-hatch'
      strokeWidth: 2, // 1 | 2 | 4
      strokeStyle: "solid", // 'solid' | 'dashed' | 'dotted'
      roughness: 1, // 0 (平直) | 1 (手绘) | 2 (草图)
      roundness: "round", // 'sharp' | 'round'
    };

    // 撤销重做历史栈
    const undoStack = [];
    const redoStack = [];

    function pushHistory() {
      if (!canvasData) return;
      undoStack.push(JSON.stringify(canvasData.elements));
      if (undoStack.length > 30) undoStack.shift();
      redoStack.length = 0; // 清空 redo
    }

    // ==================== 4. 数据解析与兼容升级 ====================

    const CODEBLOCK_REGEX = /```(?:excalidraw|canvas-board)\s*([\s\S]*?)```/i;

    function getDefaultScene() {
      return {
        version: 2,
        viewport: { x: 0, y: 0, zoom: 1 },
        elements: [
          {
            id: generateId("card"),
            type: "card",
            x: 120,
            y: 120,
            w: 220,
            h: 110,
            title: "微服务架构中台",
            content: "双击可编辑卡片文本与内容",
            strokeColor: "#2563eb",
            backgroundColor: "#dbeafe",
            fillStyle: "solid",
            strokeWidth: 2,
            roughness: 1,
          },
          {
            id: generateId("card"),
            type: "card",
            x: 460,
            y: 120,
            w: 220,
            h: 110,
            title: "前端白板系统",
            content: "自由涂鸦 / 压感画笔 / 几何图表",
            strokeColor: "#059669",
            backgroundColor: "#d1fae5",
            fillStyle: "solid",
            strokeWidth: 2,
            roughness: 1,
          },
          {
            id: generateId("arrow"),
            type: "arrow",
            x1: 340,
            y1: 175,
            x2: 460,
            y2: 175,
            label: "RESTful API",
            strokeColor: "#3b82f6",
            strokeWidth: 2,
            roughness: 1,
          },
        ],
      };
    }

    function parseCanvasData(content, domSniff = null) {
      if (domSniff && domSniff.data) {
        return domSniff.data;
      }

      const match = (content || "").match(CODEBLOCK_REGEX);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (parsed && Array.isArray(parsed.elements)) {
            // 兼容 Excalidraw 官方结构
            if (!parsed.viewport) parsed.viewport = { x: 0, y: 0, zoom: 1 };
            // 标准化 elements
            parsed.elements = parsed.elements.map(normalizeElement);
            return parsed;
          }
        } catch (_) {}
      }

      const jsonMatch = (content || "").match(/\{[\s\S]*"elements"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0].trim());
          if (parsed && Array.isArray(parsed.elements)) {
            if (!parsed.viewport) parsed.viewport = { x: 0, y: 0, zoom: 1 };
            parsed.elements = parsed.elements.map(normalizeElement);
            return parsed;
          }
        } catch (_) {}
      }

      return getDefaultScene();
    }

    function normalizeElement(el) {
      const type = el.type || "rect";
      return {
        id: el.id || generateId(type),
        type: type === "rectangle" ? "rect" : type === "ellipse" ? "circle" : type,
        x: el.x || 100,
        y: el.y || 100,
        w: el.w || el.width || 180,
        h: el.h || el.height || 100,
        x1: el.x1 ?? el.x ?? 100,
        y1: el.y1 ?? el.y ?? 100,
        x2: el.x2 ?? (el.x ? el.x + (el.w || el.width || 150) : 250),
        y2: el.y2 ?? el.y ?? 100,
        points: el.points || [],
        text: el.text || el.title || el.content || "",
        title: el.title || "",
        content: el.content || "",
        label: el.label || "",
        strokeColor: el.strokeColor || "#1e1e1e",
        backgroundColor: el.backgroundColor || "transparent",
        fillStyle: el.fillStyle || "solid",
        strokeWidth: el.strokeWidth || 2,
        strokeStyle: el.strokeStyle || "solid",
        roughness: el.roughness ?? 1,
        roundness: el.roundness || "round",
      };
    }

    function serializeCanvasData(noteTitle, data) {
      const title = noteTitle || "未命名画布";
      const count = (data.elements || []).length;
      const payload = {
        version: 2,
        viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
        elements: data.elements || [],
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      // 优雅的顶部中文摘要，EdgeEver 侧边栏卡片摘要将提取本行，不再露出 ```excalidraw 代码块
      return `> 🎨 手绘架构思维画布 · 包含 ${count} 个图元组件\n\n\`\`\`excalidraw\n${jsonStr}\n\`\`\`\n`;
    }

    // 强力解析当前笔记
    async function resolveCurrentNote() {
      try {
        if (context.editor?.getDocument) {
          const doc = await context.editor.getDocument();
          if (doc) {
            const noteId = doc.noteId || doc.id;
            let full = null;
            if (noteId && context.notes?.get) {
              try { full = await context.notes.get(noteId); } catch (_) {}
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
        if (blockText.includes('"elements"')) {
          try {
            const parsed = JSON.parse(blockText);
            if (parsed && Array.isArray(parsed.elements)) {
              if (!parsed.viewport) parsed.viewport = { x: 0, y: 0, zoom: 1 };
              parsed.elements = parsed.elements.map(normalizeElement);
              return { isCanvas: true, data: parsed };
            }
          } catch (_) {
            const match = blockText.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]);
                if (parsed && Array.isArray(parsed.elements)) {
                  if (!parsed.viewport) parsed.viewport = { x: 0, y: 0, zoom: 1 };
                  parsed.elements = parsed.elements.map(normalizeElement);
                  return { isCanvas: true, data: parsed };
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

    function isCanvasNote(note, domSniff = null) {
      if (domSniff && domSniff.isCanvas) return true;
      if (!note) return false;

      const hasCanvasTag = Array.isArray(note.tags) && (
        note.tags.includes("画布") || note.tags.includes("canvas") || note.tags.includes("excalidraw")
      );
      if (hasCanvasTag) return true;

      const content = note.contentMarkdown || note.content || "";
      if (CODEBLOCK_REGEX.test(content) || /excalidraw|canvas-board/i.test(content)) {
        return true;
      }

      return false;
    }

    // ==================== 5. 新建画布笔记流程 ====================

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
        const initialData = getDefaultScene();
        const markdownContent = serializeCanvasData(title, initialData);

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
          canvasData = initialData;
          activeViewMode = "canvas";

          if (context.editor?.openDocument) {
            await context.editor.openDocument({ noteId: createdNote.id });
          } else if (context.ui?.openNote) {
            context.ui.openNote(createdNote.id);
          }

          setTimeout(() => checkAndMountCanvasBoard(true), 60);
          setTimeout(() => checkAndMountCanvasBoard(true), 200);
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
            <span>无限画布 (Canvas Board)</span>
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
        shortcutBtn.title = "一键新建 Excalidraw 原生手绘白板";
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
      btn.title = "新建 Excalidraw 原生手绘白板";
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

    // ==================== 6. 编辑器嗅探与沉浸式视口 ====================

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
      }

      const rawContent = currentNote.contentMarkdown || currentNote.content || "";
      canvasData = parseCanvasData(rawContent, domSniff);

      mountCanvasUI(parentWrap, contentEl);

      const targetNoteId = currentNote.id || currentNote.noteId;
      if (targetNoteId && context.notes?.get) {
        context.notes.get(targetNoteId).then((full) => {
          if (full && (full.contentMarkdown || full.content)) {
            const freshData = parseCanvasData(full.contentMarkdown || full.content);
            if (freshData && Array.isArray(freshData.elements)) {
              canvasData = freshData;
              renderAll();
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
            renderAll();
          }
        } else {
          checkAndMountCanvasBoard(true);
        }
      };

      parentWrap.appendChild(floatBtn);
    }

    function scheduleAutoSave() {
      if (!canvasContainerEl) return;
      const indicator = canvasContainerEl.querySelector(".edgeever-cb-save-indicator");
      if (indicator) {
        indicator.innerHTML = `同步中...`;
        indicator.style.color = "var(--ee-cb-primary)";
      }

      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        if (!currentNote || !canvasData) return;
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
          console.warn("[Canvas Board] 自动保存失败:", err);
        } finally {
          if (indicator) {
            indicator.innerHTML = `${ICONS.check} 已自动同步`;
            indicator.style.color = "";
          }
        }
      }, settings.autoSaveDelay);
    }

    // ==================== 7. 纯原生白板视口渲染与交互引擎 ====================

    let svgLayer = null;
    let stageLayer = null;
    let viewportEl = null;

    function renderAll() {
      if (!svgLayer || !stageLayer || !canvasData) return;
      renderSVGElements();
      renderDOMNodes();
      updateTransform();
      updateInspector();
    }

    function updateTransform() {
      if (!stageLayer || !svgLayer || !viewportEl || !canvasData) return;
      const { x, y, zoom } = canvasData.viewport;
      stageLayer.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
      svgLayer.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;

      const gridLayer = viewportEl.querySelector(".edgeever-cb-grid-layer");
      if (gridLayer) {
        gridLayer.style.backgroundPosition = `${x}px ${y}px`;
        gridLayer.style.backgroundSize = `${24 * zoom}px ${24 * zoom}px`;
      }

      const zoomValEl = canvasContainerEl?.querySelector(".edgeever-cb-zoom-val");
      if (zoomValEl) {
        zoomValEl.textContent = `${Math.round(zoom * 100)}%`;
      }
    }

    // 渲染 SVG 矢量元素（几何图、线条、箭头、自由手绘涂鸦路径）
    function renderSVGElements() {
      if (!svgLayer) return;
      svgLayer.innerHTML = `
        <defs>
          <marker id="ee-arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
          </marker>
        </defs>
      `;

      canvasData.elements.forEach((el) => {
        if (el.type === "card") return; // 卡片用 DOM 渲染
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.dataset.id = el.id;
        g.style.cursor = activeTool === "eraser" ? "not-allowed" : "pointer";
        g.style.color = el.strokeColor || "#1e1e1e";

        const isSelected = el.id === selectedElementId;
        const rough = el.roughness ?? 1;

        if (el.type === "freedraw" && Array.isArray(el.points) && el.points.length > 0) {
          // 自由涂鸦画笔
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          let d = `M ${el.points[0][0]} ${el.points[0][1]}`;
          for (let i = 1; i < el.points.length; i++) {
            const p = el.points[i];
            const prev = el.points[i - 1];
            const mx = (prev[0] + p[0]) / 2;
            const my = (prev[1] + p[1]) / 2;
            d += ` Q ${prev[0]} ${prev[1]} ${mx} ${my}`;
          }
          path.setAttribute("d", d);
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", el.strokeColor || "#1e1e1e");
          path.setAttribute("stroke-width", el.strokeWidth || 2);
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          g.appendChild(path);
        } else if (el.type === "rect") {
          // 矩形
          if (el.fillStyle === "hachure" || el.fillStyle === "cross-hatch") {
            const fillPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            fillPath.setAttribute("d", generateHachureLines(el.x, el.y, el.w, el.h, 8, 45));
            fillPath.setAttribute("stroke", el.strokeColor || "#1e1e1e");
            fillPath.setAttribute("stroke-width", "1");
            fillPath.setAttribute("opacity", "0.55");
            g.appendChild(fillPath);
          } else if (el.backgroundColor && el.backgroundColor !== "transparent") {
            const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bgRect.setAttribute("x", el.x);
            bgRect.setAttribute("y", el.y);
            bgRect.setAttribute("width", el.w);
            bgRect.setAttribute("height", el.h);
            bgRect.setAttribute("rx", el.roundness === "round" ? "8" : "0");
            bgRect.setAttribute("fill", el.backgroundColor);
            g.appendChild(bgRect);
          }

          const borderPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const rx = el.x, ry = el.y, rw = el.w, rh = el.h;
          const top = createHandDrawnPath(rx, ry, rx + rw, ry, rough);
          const right = createHandDrawnPath(rx + rw, ry, rx + rw, ry + rh, rough);
          const bottom = createHandDrawnPath(rx + rw, ry + rh, rx, ry + rh, rough);
          const left = createHandDrawnPath(rx, ry + rh, rx, ry, rough);
          borderPath.setAttribute("d", `${top} ${right} ${bottom} ${left}`);
          borderPath.setAttribute("fill", "none");
          borderPath.setAttribute("stroke", el.strokeColor || "#1e1e1e");
          borderPath.setAttribute("stroke-width", el.strokeWidth || 2);
          g.appendChild(borderPath);
        } else if (el.type === "diamond") {
          // 菱形
          const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
          const topX = cx, topY = el.y;
          const rightX = el.x + el.w, rightY = cy;
          const bottomX = cx, bottomY = el.y + el.h;
          const leftX = el.x, leftY = cy;

          const p1 = createHandDrawnPath(topX, topY, rightX, rightY, rough);
          const p2 = createHandDrawnPath(rightX, rightY, bottomX, bottomY, rough);
          const p3 = createHandDrawnPath(bottomX, bottomY, leftX, leftY, rough);
          const p4 = createHandDrawnPath(leftX, leftY, topX, topY, rough);

          const diamondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          diamondPath.setAttribute("d", `${p1} ${p2} ${p3} ${p4}`);
          diamondPath.setAttribute("fill", el.backgroundColor || "transparent");
          diamondPath.setAttribute("stroke", el.strokeColor || "#1e1e1e");
          diamondPath.setAttribute("stroke-width", el.strokeWidth || 2);
          g.appendChild(diamondPath);
        } else if (el.type === "circle") {
          // 椭圆
          const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
          const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
          ellipse.setAttribute("cx", cx);
          ellipse.setAttribute("cy", cy);
          ellipse.setAttribute("rx", el.w / 2);
          ellipse.setAttribute("ry", el.h / 2);
          ellipse.setAttribute("fill", el.backgroundColor || "transparent");
          ellipse.setAttribute("stroke", el.strokeColor || "#1e1e1e");
          ellipse.setAttribute("stroke-width", el.strokeWidth || 2);
          g.appendChild(ellipse);
        } else if (el.type === "arrow") {
          // 箭头连线
          const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const d = createHandDrawnPath(el.x1, el.y1, el.x2, el.y2, rough);
          arrowPath.setAttribute("d", d);
          arrowPath.setAttribute("fill", "none");
          arrowPath.setAttribute("stroke", el.strokeColor || "#3b82f6");
          arrowPath.setAttribute("stroke-width", el.strokeWidth || 2);
          arrowPath.setAttribute("marker-end", "url(#ee-arrow-end)");
          g.appendChild(arrowPath);
        } else if (el.type === "line") {
          // 直线
          const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const d = createHandDrawnPath(el.x1, el.y1, el.x2, el.y2, rough);
          linePath.setAttribute("d", d);
          linePath.setAttribute("fill", "none");
          linePath.setAttribute("stroke", el.strokeColor || "#1e1e1e");
          linePath.setAttribute("stroke-width", el.strokeWidth || 2);
          g.appendChild(linePath);
        }

        // 选中高亮与外框
        if (isSelected) {
          const selBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const bx = el.type === "arrow" || el.type === "line" ? Math.min(el.x1, el.x2) - 8 : el.x - 6;
          const by = el.type === "arrow" || el.type === "line" ? Math.min(el.y1, el.y2) - 8 : el.y - 6;
          const bw = el.type === "arrow" || el.type === "line" ? Math.abs(el.x2 - el.x1) + 16 : el.w + 12;
          const bh = el.type === "arrow" || el.type === "line" ? Math.abs(el.y2 - el.y1) + 16 : el.h + 12;
          selBox.setAttribute("x", bx);
          selBox.setAttribute("y", by);
          selBox.setAttribute("width", bw);
          selBox.setAttribute("height", bh);
          selBox.setAttribute("fill", "none");
          selBox.setAttribute("stroke", "#3b82f6");
          selBox.setAttribute("stroke-width", "1.5");
          selBox.setAttribute("stroke-dasharray", "4 4");
          g.appendChild(selBox);
        }

        g.style.pointerEvents = "all";
        g.addEventListener("mousedown", (e) => {
          if (activeTool === "eraser") return;
          e.stopPropagation();
          selectedElementId = el.id;
          renderAll();
        });

        svgLayer.appendChild(g);
      });
    }

    // 渲染 DOM 节点（便签卡片与独立文本）
    function renderDOMNodes() {
      if (!stageLayer) return;
      stageLayer.innerHTML = "";

      canvasData.elements.forEach((el) => {
        if (el.type !== "card" && el.type !== "text") return;

        const node = document.createElement("div");
        node.className = `edgeever-cb-element ${el.type === "card" ? "edgeever-cb-card" : "edgeever-cb-text-node"}`;
        node.dataset.id = el.id;
        node.style.left = `${el.x}px`;
        node.style.top = `${el.y}px`;
        node.style.width = `${el.w}px`;
        node.style.minHeight = `${el.h}px`;

        if (el.id === selectedElementId) {
          node.classList.add("is-selected");
        }

        node.addEventListener("mousedown", (e) => {
          if (activeTool === "eraser") return;
          selectedElementId = el.id;
          renderAll();
        });

        if (el.type === "card") {
          node.style.borderColor = el.strokeColor || "#2563eb";
          node.style.backgroundColor = el.backgroundColor || "var(--ee-cb-surface-elevated)";
          node.innerHTML = `
            <div class="edgeever-cb-card-title" contenteditable="true" spellcheck="false">${el.title || "便签标题"}</div>
            <div class="edgeever-cb-card-body" contenteditable="true" spellcheck="false">${el.content || "双击可编辑详细架构内容..."}</div>
            <div class="edgeever-cb-resize-handle"></div>
          `;

          const titleEl = node.querySelector(".edgeever-cb-card-title");
          const bodyEl = node.querySelector(".edgeever-cb-card-body");

          titleEl.onblur = () => {
            if (el.title !== titleEl.innerText) {
              pushHistory();
              el.title = titleEl.innerText;
              scheduleAutoSave();
            }
          };
          bodyEl.onblur = () => {
            if (el.content !== bodyEl.innerText) {
              pushHistory();
              el.content = bodyEl.innerText;
              scheduleAutoSave();
            }
          };
        } else if (el.type === "text") {
          node.innerText = el.text || "双击输入文本";
          node.contentEditable = "true";
          node.style.color = el.strokeColor || "var(--ee-cb-text)";
          node.onblur = () => {
            if (el.text !== node.innerText) {
              pushHistory();
              el.text = node.innerText;
              scheduleAutoSave();
            }
          };
        }

        stageLayer.appendChild(node);
      });
    }

    // 更新样式属性面板
    function updateInspector(forceOpen = false) {
      if (!canvasContainerEl) return;
      const inspector = canvasContainerEl.querySelector(".edgeever-cb-inspector");
      if (!inspector) return;

      // 仅当选中了图元，或者用户主动点击了「样式」按钮开启时，才显示面板；未选中时自动隐藏，绝不遮挡画布！
      if (selectedElementId || forceOpen) {
        inspector.classList.add("is-open");
      } else if (!inspector.dataset.userOpened) {
        inspector.classList.remove("is-open");
      }

      // 顶部删除按钮联动：高亮展示
      const topDelBtn = canvasContainerEl.querySelector(".btn-top-delete");
      if (topDelBtn) {
        topDelBtn.style.pointerEvents = "auto";
        if (selectedElementId) {
          topDelBtn.style.fontWeight = "600";
        } else {
          topDelBtn.style.fontWeight = "normal";
        }
      }

      const target = canvasData?.elements.find((e) => e.id === selectedElementId) || currentStyle;

      // 同步颜色选中状态
      inspector.querySelectorAll("[data-prop='strokeColor']").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.val === target.strokeColor);
      });
      inspector.querySelectorAll("[data-prop='backgroundColor']").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.val === target.backgroundColor);
      });
      inspector.querySelectorAll("[data-prop='fillStyle']").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.val === target.fillStyle);
      });
      inspector.querySelectorAll("[data-prop='strokeWidth']").forEach((btn) => {
        btn.classList.toggle("is-active", Number(btn.dataset.val) === Number(target.strokeWidth));
      });
      inspector.querySelectorAll("[data-prop='roughness']").forEach((btn) => {
        btn.classList.toggle("is-active", Number(btn.dataset.val) === Number(target.roughness));
      });
    }

    function applyStyleProperty(prop, value) {
      currentStyle[prop] = value;
      const el = canvasData?.elements.find((e) => e.id === selectedElementId);
      if (el) {
        pushHistory();
        el[prop] = value;
        renderAll();
        scheduleAutoSave();
      } else {
        updateInspector();
      }
    }

    // 删除当前选中的图元组件（智能静默响应：选中有删，无选删尾，随时可点，零阻塞弹窗）
    function deleteSelectedElement() {
      if (!selectedElementId) {
        if (canvasData?.elements && canvasData.elements.length > 0) {
          pushHistory();
          canvasData.elements.pop();
          selectedElementId = null;
          renderAll();
          scheduleAutoSave();
          return;
        }
        return;
      }
      pushHistory();
      canvasData.elements = canvasData.elements.filter((e) => e.id !== selectedElementId);
      selectedElementId = null;
      renderAll();
      scheduleAutoSave();
    }

    // 挂载核心容器与交互
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

      canvasContainerEl.innerHTML = `
        <!-- 顶部 Excalidraw 专业矢量工具栏 -->
        <div class="edgeever-cb-toolbar">
          <div class="edgeever-cb-toolbar-group">
            <button type="button" class="edgeever-cb-tool-btn is-active" data-tool="select" title="选择与移动 (V)">${ICONS.select} <span>选择</span></button>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="freedraw" title="手绘涂鸦压感画笔 (P)">${ICONS.pencil} <span>画笔</span></button>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="eraser" title="橡皮擦 (E)">${ICONS.eraser} <span>橡皮擦</span></button>
            <div class="edgeever-cb-divider"></div>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="rect" title="点击新建矩形框 (R)">${ICONS.rect} <span>矩形</span></button>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="diamond" title="点击新建菱形判断 (D)">${ICONS.diamond} <span>菱形</span></button>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="circle" title="点击新建圆形/椭圆 (C)">${ICONS.circle} <span>圆形</span></button>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="arrow" title="点击新建手绘箭头连线 (A)">${ICONS.arrow} <span>箭头</span></button>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="line" title="点击新建直线 (L)">${ICONS.line} <span>线条</span></button>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="text" title="点击新建独立文本 (T)">${ICONS.text} <span>文本</span></button>
            <button type="button" class="edgeever-cb-tool-btn" data-tool="card" title="点击新建便签卡片 (N)">${ICONS.card} <span>便签</span></button>
            <div class="edgeever-cb-divider"></div>
            <button type="button" class="edgeever-cb-tool-btn btn-toggle-inspector" title="开启/收起样式调色板">🎨 <span>样式</span></button>
            <button type="button" class="edgeever-cb-tool-btn btn-top-delete" style="color:#ef4444;" title="删除图元组件 (Del)">${ICONS.trash} <span>删除</span></button>
          </div>

          <div class="edgeever-cb-toolbar-group">
            <button type="button" class="edgeever-cb-icon-btn btn-undo" title="撤销 (Ctrl+Z)">${ICONS.undo}</button>
            <button type="button" class="edgeever-cb-icon-btn btn-redo" title="重做 (Ctrl+Y)">${ICONS.redo}</button>
            <div class="edgeever-cb-divider"></div>
            <div class="edgeever-cb-zoom-group">
              <button type="button" class="edgeever-cb-zoom-btn btn-zoom-out" title="缩小">-</button>
              <span class="edgeever-cb-zoom-val">100%</span>
              <button type="button" class="edgeever-cb-zoom-btn btn-zoom-in" title="放大">+</button>
              <button type="button" class="edgeever-cb-zoom-btn btn-zoom-fit" title="居中还原">居中</button>
            </div>
            <div class="edgeever-cb-divider"></div>
            <span class="edgeever-cb-save-indicator">${ICONS.check} 已自动同步</span>
            <div class="edgeever-cb-divider"></div>
            <button type="button" class="edgeever-cb-tool-btn btn-export" title="导出为高清图片 (PNG)">${ICONS.export} <span>导出</span></button>
            <button type="button" class="edgeever-cb-tool-btn btn-view-code" title="查看 Markdown 源码">${ICONS.code} <span>源码</span></button>
          </div>
        </div>

        <!-- 左侧 Excalidraw 级属性调色板 (Inspector Panel，默认收起，选图元时浮现) -->
        <div class="edgeever-cb-inspector">
          <div class="edgeever-cb-insp-header">
            <span class="edgeever-cb-insp-title">🎨 样式调色板</span>
            <button type="button" class="edgeever-cb-insp-close" title="收起面板">✕</button>
          </div>

          <div class="edgeever-cb-insp-section">
            <div class="edgeever-cb-insp-label">描边颜色</div>
            <div class="edgeever-cb-palette">
              <button type="button" class="edgeever-cb-color-dot is-active" data-prop="strokeColor" data-val="#1e1e1e" style="background:#1e1e1e;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="strokeColor" data-val="#e11d48" style="background:#e11d48;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="strokeColor" data-val="#2563eb" style="background:#2563eb;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="strokeColor" data-val="#059669" style="background:#059669;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="strokeColor" data-val="#d97706" style="background:#d97706;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="strokeColor" data-val="#7c3aed" style="background:#7c3aed;"></button>
            </div>
          </div>

          <div class="edgeever-cb-insp-section">
            <div class="edgeever-cb-insp-label">背景填充</div>
            <div class="edgeever-cb-palette">
              <button type="button" class="edgeever-cb-color-dot is-active" data-prop="backgroundColor" data-val="transparent" title="透明" style="background: repeating-conic-gradient(#808080 0% 25%, #ffffff 0% 50%) 50% / 8px 8px;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="backgroundColor" data-val="#fee2e2" style="background:#fee2e2;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="backgroundColor" data-val="#dbeafe" style="background:#dbeafe;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="backgroundColor" data-val="#d1fae5" style="background:#d1fae5;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="backgroundColor" data-val="#fef3c7" style="background:#fef3c7;"></button>
              <button type="button" class="edgeever-cb-color-dot" data-prop="backgroundColor" data-val="#ede9fe" style="background:#ede9fe;"></button>
            </div>
          </div>

          <div class="edgeever-cb-insp-section">
            <div class="edgeever-cb-insp-label">填充风格</div>
            <div class="edgeever-cb-btn-group">
              <button type="button" class="edgeever-cb-opt-btn is-active" data-prop="fillStyle" data-val="solid">纯色</button>
              <button type="button" class="edgeever-cb-opt-btn" data-prop="fillStyle" data-val="hachure">手绘斜线</button>
              <button type="button" class="edgeever-cb-opt-btn" data-prop="fillStyle" data-val="none">无</button>
            </div>
          </div>

          <div class="edgeever-cb-insp-section">
            <div class="edgeever-cb-insp-label">线条粗细</div>
            <div class="edgeever-cb-btn-group">
              <button type="button" class="edgeever-cb-opt-btn" data-prop="strokeWidth" data-val="1">细 (1px)</button>
              <button type="button" class="edgeever-cb-opt-btn is-active" data-prop="strokeWidth" data-val="2">中 (2px)</button>
              <button type="button" class="edgeever-cb-opt-btn" data-prop="strokeWidth" data-val="4">粗 (4px)</button>
            </div>
          </div>

          <div class="edgeever-cb-insp-section">
            <div class="edgeever-cb-insp-label">手绘风格 (Roughness)</div>
            <div class="edgeever-cb-btn-group">
              <button type="button" class="edgeever-cb-opt-btn" data-prop="roughness" data-val="0">平直极简</button>
              <button type="button" class="edgeever-cb-opt-btn is-active" data-prop="roughness" data-val="1">手绘草图</button>
            </div>
          </div>

          <div class="edgeever-cb-insp-section">
            <div class="edgeever-cb-insp-label">操作</div>
            <div class="edgeever-cb-btn-group">
              <button type="button" class="edgeever-cb-opt-btn btn-del-elem btn-danger" title="删除当前选中的图元组件">${ICONS.trash} <span>删除组件 (Del)</span></button>
            </div>
          </div>
        </div>

        <!-- 100% 满屏无界视口 -->
        <div class="edgeever-cb-viewport">
          <div class="edgeever-cb-grid-layer"></div>
          <svg class="edgeever-cb-svg-layer"></svg>
          <div class="edgeever-cb-stage"></div>
          <div class="edgeever-cb-hint-pill">
            <kbd>空格</kbd> 拖拽平移 <kbd>Ctrl+滚轮</kbd> 缩放 <kbd>Del</kbd> 删除
          </div>
        </div>
      `;

      parentWrap.appendChild(canvasContainerEl);

      viewportEl = canvasContainerEl.querySelector(".edgeever-cb-viewport");
      svgLayer = canvasContainerEl.querySelector(".edgeever-cb-svg-layer");
      stageLayer = canvasContainerEl.querySelector(".edgeever-cb-stage");

      setupInteractiveEvents(canvasContainerEl, contentEl, parentWrap);
      renderAll();
    }

    // 绑定交互与拖拽绘图事件
    function setupInteractiveEvents(root, contentEl, parentWrap) {
      let isPanning = false;
      let isDrawing = false;
      let startX = 0, startY = 0;
      let currentDrawingElement = null;
      let isSpaceDown = false;

      // 视口坐标转换
      function getCanvasPoint(clientX, clientY) {
        const rect = viewportEl.getBoundingClientRect();
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;
        const { x, y, zoom } = canvasData.viewport;
        return {
          x: (screenX - x) / zoom,
          y: (screenY - y) / zoom,
        };
      }

      // 撤销重做
      function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(JSON.stringify(canvasData.elements));
        const prev = undoStack.pop();
        canvasData.elements = JSON.parse(prev);
        renderAll();
        scheduleAutoSave();
      }

      function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(JSON.stringify(canvasData.elements));
        const next = redoStack.pop();
        canvasData.elements = JSON.parse(next);
        renderAll();
        scheduleAutoSave();
      }

      root.querySelector(".btn-undo").onclick = undo;
      root.querySelector(".btn-redo").onclick = redo;

      // 在视口中央添加全新标准组件并自动高亮选中
      function addNewElementToCenter(tool) {
        pushHistory();
        const rect = viewportEl.getBoundingClientRect();
        const { x, y, zoom } = canvasData.viewport;
        const centerX = (-x + (rect.width || 800) / 2) / zoom;
        const centerY = (-y + (rect.height || 600) / 2) / zoom;

        let newElem = null;
        if (tool === "card") {
          newElem = {
            id: generateId("card"),
            type: "card",
            x: centerX - 110,
            y: centerY - 55,
            w: 220,
            h: 110,
            title: "新便签",
            content: "双击编辑内容...",
            strokeColor: currentStyle.strokeColor === "#1e1e1e" ? "#2563eb" : currentStyle.strokeColor,
            backgroundColor: currentStyle.backgroundColor === "transparent" ? "#dbeafe" : currentStyle.backgroundColor,
          };
        } else if (tool === "rect") {
          newElem = {
            id: generateId("rect"),
            type: "rect",
            x: centerX - 90,
            y: centerY - 50,
            w: 180,
            h: 100,
            strokeColor: currentStyle.strokeColor,
            backgroundColor: currentStyle.backgroundColor,
            fillStyle: currentStyle.fillStyle,
            strokeWidth: currentStyle.strokeWidth,
            roughness: currentStyle.roughness,
          };
        } else if (tool === "diamond") {
          newElem = {
            id: generateId("diamond"),
            type: "diamond",
            x: centerX - 65,
            y: centerY - 65,
            w: 130,
            h: 130,
            strokeColor: currentStyle.strokeColor,
            backgroundColor: currentStyle.backgroundColor,
            fillStyle: currentStyle.fillStyle,
            strokeWidth: currentStyle.strokeWidth,
            roughness: currentStyle.roughness,
          };
        } else if (tool === "circle") {
          newElem = {
            id: generateId("circle"),
            type: "circle",
            x: centerX - 60,
            y: centerY - 60,
            w: 120,
            h: 120,
            strokeColor: currentStyle.strokeColor,
            backgroundColor: currentStyle.backgroundColor,
            fillStyle: currentStyle.fillStyle,
            strokeWidth: currentStyle.strokeWidth,
            roughness: currentStyle.roughness,
          };
        } else if (tool === "arrow") {
          newElem = {
            id: generateId("arrow"),
            type: "arrow",
            x1: centerX - 80,
            y1: centerY,
            x2: centerX + 80,
            y2: centerY,
            strokeColor: currentStyle.strokeColor === "#1e1e1e" ? "#3b82f6" : currentStyle.strokeColor,
            strokeWidth: currentStyle.strokeWidth,
            roughness: currentStyle.roughness,
          };
        } else if (tool === "line") {
          newElem = {
            id: generateId("line"),
            type: "line",
            x1: centerX - 80,
            y1: centerY,
            x2: centerX + 80,
            y2: centerY,
            strokeColor: currentStyle.strokeColor,
            strokeWidth: currentStyle.strokeWidth,
            roughness: currentStyle.roughness,
          };
        } else if (tool === "text") {
          newElem = {
            id: generateId("text"),
            type: "text",
            x: centerX - 80,
            y: centerY - 20,
            w: 160,
            h: 40,
            text: "双击输入文本",
            strokeColor: currentStyle.strokeColor,
          };
        }

        if (newElem) {
          canvasData.elements.push(newElem);
          selectedElementId = newElem.id;
          activeTool = "select";
          root.querySelectorAll(".edgeever-cb-tool-btn[data-tool]").forEach((b) => b.classList.remove("is-active"));
          root.querySelector(".edgeever-cb-tool-btn[data-tool='select']")?.classList.add("is-active");
          renderAll();
          updateInspector(true); // 自动展开调色板供用户调整
          scheduleAutoSave();
        }
      }

      // 工具栏点击联动
      root.querySelectorAll(".edgeever-cb-tool-btn[data-tool]").forEach((btn) => {
        btn.onclick = () => {
          const tool = btn.dataset.tool;

          if (tool === "select" || tool === "freedraw" || tool === "eraser") {
            root.querySelectorAll(".edgeever-cb-tool-btn[data-tool]").forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            activeTool = tool;
            if (activeTool !== "select") {
              selectedElementId = null;
              renderAll();
            }
          } else {
            // 点击任何形状/文本/卡片按钮，立即在画布视口中心生成一个组件并高亮选中！
            addNewElementToCenter(tool);
          }
        };
      });

      // 样式属性面板绑定
      const inspectorEl = root.querySelector(".edgeever-cb-inspector");
      root.querySelectorAll(".edgeever-cb-inspector [data-prop]").forEach((btn) => {
        btn.onclick = () => {
          const prop = btn.dataset.prop;
          let val = btn.dataset.val;
          if (prop === "strokeWidth" || prop === "roughness") val = Number(val);
          applyStyleProperty(prop, val);
        };
      });

      // 样式开关与关闭按钮
      const toggleInspBtn = root.querySelector(".btn-toggle-inspector");
      if (toggleInspBtn && inspectorEl) {
        toggleInspBtn.onclick = () => {
          const isOpen = inspectorEl.classList.contains("is-open");
          if (isOpen) {
            inspectorEl.classList.remove("is-open");
            delete inspectorEl.dataset.userOpened;
          } else {
            inspectorEl.classList.add("is-open");
            inspectorEl.dataset.userOpened = "true";
          }
        };
      }

      const closeInspBtn = root.querySelector(".edgeever-cb-insp-close");
      if (closeInspBtn && inspectorEl) {
        closeInspBtn.onclick = () => {
          inspectorEl.classList.remove("is-open");
          delete inspectorEl.dataset.userOpened;
        };
      }

      // 删除组件按钮绑定（顶部与面板内）
      const topDelBtn = root.querySelector(".btn-top-delete");
      if (topDelBtn) topDelBtn.onclick = deleteSelectedElement;

      const delBtn = root.querySelector(".btn-del-elem");
      if (delBtn) delBtn.onclick = deleteSelectedElement;

      // 滚轮缩放与平移
      root.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.min(3.0, Math.max(0.2, canvasData.viewport.zoom * zoomDelta));
            const rect = viewportEl.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            canvasData.viewport.x = mouseX - (mouseX - canvasData.viewport.x) * (newZoom / canvasData.viewport.zoom);
            canvasData.viewport.y = mouseY - (mouseY - canvasData.viewport.y) * (newZoom / canvasData.viewport.zoom);
            canvasData.viewport.zoom = newZoom;
          } else {
            canvasData.viewport.x -= e.deltaX;
            canvasData.viewport.y -= e.deltaY;
          }
          updateTransform();
          scheduleAutoSave();
        },
        { passive: false }
      );

      // 缩放控制按钮
      root.querySelector(".btn-zoom-in").onclick = () => {
        canvasData.viewport.zoom = Math.min(3.0, canvasData.viewport.zoom + 0.15);
        updateTransform();
      };
      root.querySelector(".btn-zoom-out").onclick = () => {
        canvasData.viewport.zoom = Math.max(0.2, canvasData.viewport.zoom - 0.15);
        updateTransform();
      };
      root.querySelector(".btn-zoom-fit").onclick = () => {
        canvasData.viewport.x = 0;
        canvasData.viewport.y = 0;
        canvasData.viewport.zoom = 1;
        updateTransform();
      };

      // 导出 PNG
      root.querySelector(".btn-export").onclick = () => {
        const ind = root.querySelector(".edgeever-cb-save-indicator");
        if (ind) {
          ind.innerHTML = `✓ 已就绪，右键或截图即可导出当前白板`;
          ind.style.color = "var(--ee-cb-primary)";
          setTimeout(() => {
            ind.innerHTML = `${ICONS.check} 已自动同步`;
            ind.style.color = "";
          }, 3000);
        }
      };

      // 切换源码模式
      root.querySelector(".btn-view-code").onclick = () => {
        activeViewMode = "code";
        if (canvasContainerEl) canvasContainerEl.style.display = "none";
        if (contentEl) contentEl.style.display = "";
        toggleMarkdownToolbars(true);
        toggleFullViewport(false);
        createSourceFloatButton(parentWrap, contentEl);
      };

      // 键盘快捷键监听
      window.addEventListener("keydown", (e) => {
        if (e.target.matches("input, textarea, [contenteditable='true']")) return;

        if (e.code === "Space") {
          isSpaceDown = true;
          viewportEl.style.cursor = "grab";
        }
        if (e.code === "Delete" || e.code === "Backspace") {
          if (selectedElementId) {
            pushHistory();
            canvasData.elements = canvasData.elements.filter((el) => el.id !== selectedElementId);
            selectedElementId = null;
            renderAll();
            scheduleAutoSave();
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          e.preventDefault();
          undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "y") {
          e.preventDefault();
          redo();
        }
      });

      window.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
          isSpaceDown = false;
          viewportEl.style.cursor = "";
        }
      });

      // 鼠标按下：开始平移或绘制
      viewportEl.addEventListener("mousedown", (e) => {
        if (e.target.matches("input, textarea, [contenteditable='true']")) return;

        const p = getCanvasPoint(e.clientX, e.clientY);

        // 空格平移或中键漫游
        if (isSpaceDown || e.button === 1) {
          isPanning = true;
          startX = e.clientX - canvasData.viewport.x;
          startY = e.clientY - canvasData.viewport.y;
          viewportEl.style.cursor = "grabbing";
          return;
        }

        // 橡皮擦模式
        if (activeTool === "eraser") {
          const clickedTarget = e.target.closest("[data-id]");
          if (clickedTarget && clickedTarget.dataset.id) {
            pushHistory();
            canvasData.elements = canvasData.elements.filter((el) => el.id !== clickedTarget.dataset.id);
            renderAll();
            scheduleAutoSave();
          }
          return;
        }

        // 选择模式
        if (activeTool === "select") {
          const clickedTarget = e.target.closest("[data-id]");
          if (clickedTarget && clickedTarget.dataset.id) {
            selectedElementId = clickedTarget.dataset.id;
            renderAll();
            // 开始拖拽移动该元素
            isDrawing = true;
            currentDrawingElement = canvasData.elements.find((el) => el.id === selectedElementId);
            startX = p.x - (currentDrawingElement.x || currentDrawingElement.x1 || 0);
            startY = p.y - (currentDrawingElement.y || currentDrawingElement.y1 || 0);
          } else {
            selectedElementId = null;
            renderAll();
          }
          return;
        }

        // 绘图工具启动
        pushHistory();
        isDrawing = true;

        if (activeTool === "freedraw") {
          currentDrawingElement = {
            id: generateId("draw"),
            type: "freedraw",
            points: [[p.x, p.y]],
            strokeColor: currentStyle.strokeColor,
            strokeWidth: currentStyle.strokeWidth,
          };
          canvasData.elements.push(currentDrawingElement);
        } else if (activeTool === "rect" || activeTool === "diamond" || activeTool === "circle") {
          currentDrawingElement = {
            id: generateId(activeTool),
            type: activeTool,
            x: p.x,
            y: p.y,
            w: 10,
            h: 10,
            strokeColor: currentStyle.strokeColor,
            backgroundColor: currentStyle.backgroundColor,
            fillStyle: currentStyle.fillStyle,
            strokeWidth: currentStyle.strokeWidth,
            roughness: currentStyle.roughness,
          };
          canvasData.elements.push(currentDrawingElement);
        } else if (activeTool === "arrow" || activeTool === "line") {
          currentDrawingElement = {
            id: generateId(activeTool),
            type: activeTool,
            x1: p.x,
            y1: p.y,
            x2: p.x + 10,
            y2: p.y + 10,
            strokeColor: currentStyle.strokeColor,
            strokeWidth: currentStyle.strokeWidth,
            roughness: currentStyle.roughness,
          };
          canvasData.elements.push(currentDrawingElement);
        } else if (activeTool === "card") {
          const newCard = {
            id: generateId("card"),
            type: "card",
            x: p.x,
            y: p.y,
            w: 220,
            h: 110,
            title: "新便签",
            content: "双击编辑内容...",
            strokeColor: currentStyle.strokeColor === "#1e1e1e" ? "#2563eb" : currentStyle.strokeColor,
            backgroundColor: currentStyle.backgroundColor === "transparent" ? "#dbeafe" : currentStyle.backgroundColor,
          };
          canvasData.elements.push(newCard);
          selectedElementId = newCard.id;
          activeTool = "select";
          root.querySelector(".edgeever-cb-tool-btn[data-tool='select']").click();
          renderAll();
          scheduleAutoSave();
          isDrawing = false;
        } else if (activeTool === "text") {
          const newText = {
            id: generateId("text"),
            type: "text",
            x: p.x,
            y: p.y,
            w: 160,
            h: 36,
            text: "双击输入文本",
            strokeColor: currentStyle.strokeColor,
          };
          canvasData.elements.push(newText);
          selectedElementId = newText.id;
          activeTool = "select";
          root.querySelector(".edgeever-cb-tool-btn[data-tool='select']").click();
          renderAll();
          scheduleAutoSave();
          isDrawing = false;
        }
      });

      // 鼠标移动
      window.addEventListener("mousemove", (e) => {
        if (isPanning) {
          canvasData.viewport.x = e.clientX - startX;
          canvasData.viewport.y = e.clientY - startY;
          updateTransform();
          return;
        }

        if (!isDrawing || !currentDrawingElement) return;

        const p = getCanvasPoint(e.clientX, e.clientY);

        if (activeTool === "select" && selectedElementId) {
          // 移动选中元素
          if (currentDrawingElement.type === "arrow" || currentDrawingElement.type === "line") {
            const dx = p.x - startX - currentDrawingElement.x1;
            const dy = p.y - startY - currentDrawingElement.y1;
            currentDrawingElement.x1 += dx;
            currentDrawingElement.y1 += dy;
            currentDrawingElement.x2 += dx;
            currentDrawingElement.y2 += dy;
          } else {
            currentDrawingElement.x = p.x - startX;
            currentDrawingElement.y = p.y - startY;
          }
          renderAll();
        } else if (activeTool === "freedraw") {
          currentDrawingElement.points.push([p.x, p.y]);
          renderSVGElements();
        } else if (activeTool === "rect" || activeTool === "diamond" || activeTool === "circle") {
          currentDrawingElement.w = Math.max(10, p.x - currentDrawingElement.x);
          currentDrawingElement.h = Math.max(10, p.y - currentDrawingElement.y);
          renderSVGElements();
        } else if (activeTool === "arrow" || activeTool === "line") {
          currentDrawingElement.x2 = p.x;
          currentDrawingElement.y2 = p.y;
          renderSVGElements();
        }
      });

      // 鼠标释放
      window.addEventListener("mouseup", () => {
        if (isPanning) {
          isPanning = false;
          viewportEl.style.cursor = "";
          scheduleAutoSave();
        }

        if (isDrawing) {
          isDrawing = false;
          currentDrawingElement = null;
          renderAll();
          scheduleAutoSave();
        }
      });
    }

    // ==================== 8. 全局生命周期守护 ====================

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
