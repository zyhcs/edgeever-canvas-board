/**
 * EdgeEver Canvas Board Plugin
 * 无限白板与架构画布全套套件
 * v1.0.0 - 原生集成「更多类型 ▾」新建菜单、无限网格视口、卡片连线与离线自动同步
 */

// ==================== 1. SVG 图标库 ====================

const ICONS = {
  canvas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
  select: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7 18 3-7 7-3L3 3z"></path></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" ry="3"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="13" y2="12"></line></svg>`,
  rect: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
  circle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`,
  diamond: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12 12 2"></polygon></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
  text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
  delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  export: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateId(prefix = "el") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

// ==================== 2. 插件核心生命周期与驱动 ====================

export default {
  async activate(context) {
    let settings = {
      showMenuItem: true,
      showSidebarShortcut: true,
      defaultGridStyle: "dots",
      autoSaveDelay: 500,
      enableDockButton: true,
    };

    async function loadSettings() {
      try {
        if (context.storage?.get) {
          const s = await context.storage.get("settings");
          if (s) {
            settings.showMenuItem = s.show_menu_item !== false;
            settings.showSidebarShortcut = s.show_sidebar_shortcut !== false;
            settings.defaultGridStyle = s.default_grid_style || "dots";
            settings.autoSaveDelay = s.auto_save_delay || 500;
            settings.enableDockButton = s.enable_dock_button !== false;
          }
        }
      } catch (_) {}
    }

    await loadSettings();

    // 活跃状态
    let currentNote = null;
    let canvasData = null; // 当前正在编辑的画布数据
    let activeTool = "select"; // 'select' | 'card' | 'rect' | 'circle' | 'diamond' | 'arrow' | 'text'
    let selectedElementId = null;
    let activeViewMode = "canvas"; // 'canvas' | 'code'
    let canvasContainerEl = null;
    let saveTimeout = null;

    // ==================== 3. 辅助解析器：画布笔记识别与创建 ====================

    const CANVAS_CODEBLOCK_REGEX = /```canvas-board\s*([\s\S]*?)```/i;

    function isCanvasNote(note) {
      if (!note) return false;
      const content = note.contentMarkdown || note.content || "";
      if (CANVAS_CODEBLOCK_REGEX.test(content)) return true;
      if (Array.isArray(note.tags) && (note.tags.includes("画布") || note.tags.includes("canvas"))) return true;
      if (note.title && (note.title.includes("画布") || note.title.includes("Whiteboard"))) return true;
      return false;
    }

    function parseCanvasData(content) {
      const match = content.match(CANVAS_CODEBLOCK_REGEX);
      if (match && match[1]) {
        try {
          const data = JSON.parse(match[1].trim());
          if (data && Array.isArray(data.elements)) {
            return data;
          }
        } catch (_) {}
      }

      // 默认初始画布模板
      return {
        version: 1,
        viewport: { x: 0, y: 0, zoom: 1 },
        elements: [
          {
            id: generateId("card"),
            type: "card",
            x: 120,
            y: 120,
            w: 220,
            h: 110,
            title: "SAP 核心层 (ECC/S4)",
            content: "采购订单 / 物料主数据 / 会计凭证",
            color: "blue",
          },
          {
            id: generateId("card"),
            type: "card",
            x: 440,
            y: 120,
            w: 220,
            h: 110,
            title: "CPI 接口中间件",
            content: "RESTful API / JSON 路由适配",
            color: "green",
          },
          {
            id: generateId("arrow"),
            type: "arrow",
            from: "el_1",
            to: "el_2",
            label: "HTTP POST",
          },
        ],
      };
    }

    function serializeCanvasData(noteTitle, data) {
      const title = noteTitle || "未命名架构画布";
      const jsonStr = JSON.stringify(data, null, 2);
      return `# ${title}\n\n\`\`\`canvas-board\n${jsonStr}\n\`\`\`\n`;
    }

    /**
     * 创建一篇全新无限画布笔记
     */
    async function createNewCanvasNote() {
      try {
        const title = `未命名画布 ${new Date().toLocaleDateString("zh-CN")}`;
        const initialData = {
          version: 1,
          viewport: { x: 0, y: 0, zoom: 1 },
          elements: [
            {
              id: generateId("card"),
              type: "card",
              x: 140,
              y: 140,
              w: 220,
              h: 110,
              title: "核心系统模块",
              content: "双击可直接编辑卡片内容...",
              color: "blue",
            },
            {
              id: generateId("card"),
              type: "card",
              x: 460,
              y: 140,
              w: 220,
              h: 110,
              title: "接口与服务层",
              content: "从左侧卡片连线到此处",
              color: "green",
            },
          ],
        };

        const markdownContent = serializeCanvasData(title, initialData);

        let createdNote = null;
        if (context.notes?.create) {
          createdNote = await context.notes.create({
            title,
            tags: ["画布"],
            contentMarkdown: markdownContent,
            content: markdownContent,
          });
        }

        if (createdNote?.id) {
          if (context.editor?.openDocument) {
            await context.editor.openDocument({ noteId: createdNote.id });
          } else if (context.ui?.openNote) {
            context.ui.openNote(createdNote.id);
          }
          if (context.ui?.showNotice) {
            context.ui.showNotice("🎨 已成功创建无限画布笔记！", { type: "success" });
          }
        }
      } catch (err) {
        console.warn("[Canvas Board] 创建画布笔记失败:", err);
        if (context.ui?.showNotice) {
          context.ui.showNotice("创建失败: " + (err.message || "请稍后重试"), { type: "error" });
        }
      }
    }

    // ==================== 4. 模块一：在「更多类型 ▾」菜单中无缝挂载 ====================

    function ensureMenuItemInjected() {
      if (!settings.showMenuItem) return;

      // 寻找 EdgeEver 弹出的下拉菜单（类名通常带有 dropdown/menu/popover）
      const menus = document.querySelectorAll(
        ".dropdown-menu, .menu, .popover, [role='menu'], [class*='dropdown'], [class*='menu']"
      );

      menus.forEach((menu) => {
        // 判断是否是 EdgeEver 的新建类型菜单（包含“思维导图”或“流程图”等特征文本）
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
            // 尝试关闭菜单
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

      // 找到新建笔记按钮旁的容器
      const moreBtn = Array.from(document.querySelectorAll("button, [role='button'], div")).find(
        (b) => b.textContent && (b.textContent.includes("更多类型") || b.textContent.includes("更多"))
      );

      if (moreBtn && moreBtn.parentElement) {
        const shortcutBtn = document.createElement("button");
        shortcutBtn.type = "button";
        shortcutBtn.className = "edgeever-cb-sidebar-btn";
        shortcutBtn.title = "一键新建无限架构画布";
        shortcutBtn.innerHTML = `${ICONS.canvas} 画布`;
        shortcutBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          createNewCanvasNote();
        };

        moreBtn.parentElement.appendChild(shortcutBtn);
      }
    }

    // ==================== 5. 模块二：统一插件工具坞 (Plugin Dock) 接入 ====================

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
      btn.title = "新建无限画布笔记 (Canvas Board)";
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

    // ==================== 6. 模块三：无限画布引擎 (Interactive Viewport) ====================

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

    async function checkAndMountCanvasBoard() {
      // 获取当前活跃笔记
      try {
        if (context.editor?.getDocument) {
          const doc = await context.editor.getDocument();
          if (doc) currentNote = doc;
        }
      } catch (_) {}

      if (!currentNote || !isCanvasNote(currentNote)) {
        if (canvasContainerEl) {
          canvasContainerEl.remove();
          canvasContainerEl = null;
        }
        return;
      }

      const contentParent = findEditorContentContainer();
      if (!contentParent) return;

      // 确保父容器具备相对定位
      const parentWrap = contentParent.parentElement || contentParent;
      if (getComputedStyle(parentWrap).position === "static") {
        parentWrap.style.position = "relative";
      }

      if (canvasContainerEl && canvasContainerEl.isConnected) {
        if (canvasContainerEl.dataset.noteId === String(currentNote.id || currentNote.noteId)) {
          return; // 已挂载且为同一笔记
        }
        canvasContainerEl.remove();
      }

      // 初始化画布数据
      const rawContent = currentNote.contentMarkdown || currentNote.content || "";
      canvasData = parseCanvasData(rawContent);

      mountCanvasUI(parentWrap);
    }

    function mountCanvasUI(container) {
      canvasContainerEl = document.createElement("div");
      canvasContainerEl.className = "edgeever-canvas-board-container";
      canvasContainerEl.dataset.noteId = String(currentNote.id || currentNote.noteId || "");

      canvasContainerEl.innerHTML = `
        <!-- 背景点阵网格 -->
        <div class="edgeever-cb-grid-layer style-${settings.defaultGridStyle}"></div>

        <!-- 顶部悬浮工具栏 -->
        <div class="edgeever-cb-toolbar">
          <button type="button" class="edgeever-cb-tool-btn is-active" data-tool="select" title="选择/移动 (V)">${ICONS.select}</button>
          <button type="button" class="edgeever-cb-tool-btn" data-tool="card" title="新建便签卡片 (N)">${ICONS.card}</button>
          <button type="button" class="edgeever-cb-tool-btn" data-tool="rect" title="矩形容器框 (R)">${ICONS.rect}</button>
          <button type="button" class="edgeever-cb-tool-btn" data-tool="circle" title="圆形节点 (C)">${ICONS.circle}</button>
          <button type="button" class="edgeever-cb-tool-btn" data-tool="diamond" title="菱形判断 (D)">${ICONS.diamond}</button>
          <button type="button" class="edgeever-cb-tool-btn" data-tool="arrow" title="箭头连线 (A)">${ICONS.arrow}</button>
          <button type="button" class="edgeever-cb-tool-btn" data-tool="text" title="独立文本 (T)">${ICONS.text}</button>
          <div class="edgeever-cb-divider"></div>
          <button type="button" class="edgeever-cb-tool-btn btn-delete" title="删除选中元素 (Del)">${ICONS.delete}</button>
          <button type="button" class="edgeever-cb-tool-btn btn-export" title="导出为图片 (PNG)">${ICONS.export}</button>
        </div>

        <!-- 右上角模式切换 -->
        <div class="edgeever-cb-view-switch">
          <button type="button" class="edgeever-cb-switch-btn is-active btn-view-canvas">🎨 画布视图</button>
          <button type="button" class="edgeever-cb-switch-btn btn-view-code">📄 源码</button>
        </div>

        <!-- SVG 连线图层 -->
        <svg class="edgeever-cb-svg-layer">
          <defs>
            <marker id="cb-arrow-marker" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
            </marker>
          </defs>
        </svg>

        <!-- 舞台 (节点卡片) -->
        <div class="edgeever-cb-stage"></div>

        <!-- 左下角状态与缩放 -->
        <div class="edgeever-cb-status-bar">
          <button type="button" class="edgeever-cb-zoom-btn btn-zoom-out">-</button>
          <span class="edgeever-cb-zoom-val">100%</span>
          <button type="button" class="edgeever-cb-zoom-btn btn-zoom-in">+</button>
          <button type="button" class="edgeever-cb-zoom-btn btn-zoom-fit">居中</button>
          <div class="edgeever-cb-divider"></div>
          <span class="edgeever-cb-save-indicator">${ICONS.check} 已自动同步</span>
        </div>
      `;

      container.appendChild(canvasContainerEl);

      setupCanvasEvents(canvasContainerEl);
      renderElements();
    }

    // ==================== 7. 画布交互引擎与事件绑定 ====================

    function setupCanvasEvents(root) {
      const stage = root.querySelector(".edgeever-cb-stage");
      const grid = root.querySelector(".edgeever-cb-grid-layer");
      const zoomValEl = root.querySelector(".edgeever-cb-zoom-val");

      let isPanning = false;
      let startX = 0, startY = 0;
      let isSpaceDown = false;

      function updateViewportTransform() {
        const { x, y, zoom } = canvasData.viewport;
        stage.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;

        // 同步网格背景
        grid.style.backgroundPosition = `${x}px ${y}px`;
        grid.style.backgroundSize = `${24 * zoom}px ${24 * zoom}px`;

        zoomValEl.textContent = `${Math.round(zoom * 100)}%`;
        renderConnections();
      }

      // 空格键平移支持
      window.addEventListener("keydown", (e) => {
        if (e.code === "Space" && !e.target.matches("input, textarea, [contenteditable='true']")) {
          isSpaceDown = true;
          stage.classList.add("is-panning");
        }
        if (e.code === "Delete" || e.code === "Backspace") {
          if (selectedElementId && !e.target.matches("input, textarea, [contenteditable='true']")) {
            deleteSelectedElement();
          }
        }
      });

      window.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
          isSpaceDown = false;
          stage.classList.remove("is-panning", "is-panning-active");
        }
      });

      // 滚轮缩放与双指平移
      root.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            // 缩放
            const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.min(3.0, Math.max(0.2, canvasData.viewport.zoom * zoomDelta));

            // 以鼠标位置为缩放中心
            const rect = root.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            canvasData.viewport.x = mouseX - (mouseX - canvasData.viewport.x) * (newZoom / canvasData.viewport.zoom);
            canvasData.viewport.y = mouseY - (mouseY - canvasData.viewport.y) * (newZoom / canvasData.viewport.zoom);
            canvasData.viewport.zoom = newZoom;
          } else {
            // 平移
            canvasData.viewport.x -= e.deltaX;
            canvasData.viewport.y -= e.deltaY;
          }
          updateViewportTransform();
          scheduleAutoSave();
        },
        { passive: false }
      );

      // 鼠标拖拽平移视口
      root.addEventListener("mousedown", (e) => {
        if (isSpaceDown || e.button === 1 || e.target === stage || e.target === grid || e.target.closest(".edgeever-cb-svg-layer")) {
          isPanning = true;
          startX = e.clientX - canvasData.viewport.x;
          startY = e.clientY - canvasData.viewport.y;
          stage.classList.add("is-panning-active");
        }
      });

      window.addEventListener("mousemove", (e) => {
        if (!isPanning) return;
        canvasData.viewport.x = e.clientX - startX;
        canvasData.viewport.y = e.clientY - startY;
        updateViewportTransform();
      });

      window.addEventListener("mouseup", () => {
        if (isPanning) {
          isPanning = false;
          stage.classList.remove("is-panning-active");
          scheduleAutoSave();
        }
      });

      // 工具栏切换
      root.querySelectorAll(".edgeever-cb-tool-btn[data-tool]").forEach((btn) => {
        btn.onclick = () => {
          root.querySelectorAll(".edgeever-cb-tool-btn[data-tool]").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          activeTool = btn.dataset.tool;

          if (activeTool !== "select") {
            // 点击快捷新建对应元素
            addNewElement(activeTool);
          }
        };
      });

      // 缩放控制按钮
      root.querySelector(".btn-zoom-in").onclick = () => {
        canvasData.viewport.zoom = Math.min(3.0, canvasData.viewport.zoom + 0.15);
        updateViewportTransform();
      };
      root.querySelector(".btn-zoom-out").onclick = () => {
        canvasData.viewport.zoom = Math.max(0.2, canvasData.viewport.zoom - 0.15);
        updateViewportTransform();
      };
      root.querySelector(".btn-zoom-fit").onclick = () => {
        canvasData.viewport.x = 0;
        canvasData.viewport.y = 0;
        canvasData.viewport.zoom = 1;
        updateViewportTransform();
      };

      // 删除按钮
      root.querySelector(".btn-delete").onclick = deleteSelectedElement;

      // 导出图片
      root.querySelector(".btn-export").onclick = exportCanvasAsImage;

      // 视图切换
      root.querySelector(".btn-view-code").onclick = () => {
        if (canvasContainerEl) canvasContainerEl.style.display = "none";
        const contentEl = findEditorContentContainer();
        if (contentEl) contentEl.style.display = "block";
      };
      root.querySelector(".btn-view-canvas").onclick = () => {
        if (canvasContainerEl) canvasContainerEl.style.display = "flex";
      };

      updateViewportTransform();
    }

    // ==================== 8. 元素渲染与拖拽缩放逻辑 ====================

    function renderElements() {
      if (!canvasContainerEl || !canvasData) return;
      const stage = canvasContainerEl.querySelector(".edgeever-cb-stage");
      stage.innerHTML = "";

      canvasData.elements.forEach((el) => {
        if (el.type === "arrow") return; // 连线在 SVG 层渲染

        const div = document.createElement("div");
        div.className = `edgeever-cb-element edgeever-cb-${el.type}`;
        div.id = el.id;
        div.style.left = `${el.x}px`;
        div.style.top = `${el.y}px`;
        if (el.w) div.style.width = `${el.w}px`;
        if (el.h) div.style.height = `${el.h}px`;
        if (el.color) div.dataset.color = el.color;

        if (el.type === "card") {
          div.innerHTML = `
            <div class="edgeever-cb-card-title" contenteditable="true">${escapeHtml(el.title || "卡片标题")}</div>
            <div class="edgeever-cb-card-body" contenteditable="true">${escapeHtml(el.content || "双击输入内容...")}</div>
            <div class="edgeever-cb-port top" data-port="top"></div>
            <div class="edgeever-cb-port right" data-port="right"></div>
            <div class="edgeever-cb-port bottom" data-port="bottom"></div>
            <div class="edgeever-cb-port left" data-port="left"></div>
            <div class="edgeever-cb-resize-handle"></div>
          `;
        } else if (el.type === "rect" || el.type === "circle" || el.type === "diamond") {
          div.className += ` edgeever-cb-shape-${el.type}`;
          div.innerHTML = `
            <div class="edgeever-cb-shape-text" contenteditable="true">${escapeHtml(el.title || "节点")}</div>
            <div class="edgeever-cb-port top" data-port="top"></div>
            <div class="edgeever-cb-port right" data-port="right"></div>
            <div class="edgeever-cb-port bottom" data-port="bottom"></div>
            <div class="edgeever-cb-port left" data-port="left"></div>
            <div class="edgeever-cb-resize-handle"></div>
          `;
        } else if (el.type === "text") {
          div.className += " edgeever-cb-text-node";
          div.setAttribute("contenteditable", "true");
          div.textContent = el.content || "输入文字...";
        }

        // 绑定拖拽与选择事件
        bindElementDrag(div, el);
        stage.appendChild(div);
      });

      renderConnections();
    }

    function bindElementDrag(node, elData) {
      let isDragging = false;
      let startMouseX = 0, startMouseY = 0;
      let startElemX = 0, startElemY = 0;

      node.addEventListener("mousedown", (e) => {
        if (e.target.matches("[contenteditable='true']")) return;
        if (e.target.matches(".edgeever-cb-resize-handle")) {
          startResize(e, node, elData);
          return;
        }
        if (e.target.matches(".edgeever-cb-port")) {
          startConnect(e, elData, e.target.dataset.port);
          return;
        }

        e.stopPropagation();
        selectElement(elData.id);

        isDragging = true;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startElemX = elData.x;
        startElemY = elData.y;
      });

      window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const zoom = canvasData.viewport.zoom;
        const dx = (e.clientX - startMouseX) / zoom;
        const dy = (e.clientY - startMouseY) / zoom;

        elData.x = Math.round(startElemX + dx);
        elData.y = Math.round(startElemY + dy);

        node.style.left = `${elData.x}px`;
        node.style.top = `${elData.y}px`;

        renderConnections();
      });

      window.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          scheduleAutoSave();
        }
      });

      // 文本变更监听
      const titleEl = node.querySelector(".edgeever-cb-card-title, .edgeever-cb-shape-text");
      if (titleEl) {
        titleEl.oninput = () => {
          elData.title = titleEl.textContent;
          scheduleAutoSave();
        };
      }
      const bodyEl = node.querySelector(".edgeever-cb-card-body");
      if (bodyEl) {
        bodyEl.oninput = () => {
          elData.content = bodyEl.textContent;
          scheduleAutoSave();
        };
      }
      if (elData.type === "text") {
        node.oninput = () => {
          elData.content = node.textContent;
          scheduleAutoSave();
        };
      }
    }

    function startResize(e, node, elData) {
      e.stopPropagation();
      let startX = e.clientX;
      let startY = e.clientY;
      let startW = elData.w || 200;
      let startH = elData.h || 100;
      let isResizing = true;

      function onMouseMove(moveEv) {
        if (!isResizing) return;
        const zoom = canvasData.viewport.zoom;
        const dw = (moveEv.clientX - startX) / zoom;
        const dh = (moveEv.clientY - startY) / zoom;

        elData.w = Math.max(120, Math.round(startW + dw));
        elData.h = Math.max(60, Math.round(startH + dh));

        node.style.width = `${elData.w}px`;
        node.style.height = `${elData.h}px`;
        renderConnections();
      }

      function onMouseUp() {
        isResizing = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        scheduleAutoSave();
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    function startConnect(e, fromEl, fromPort) {
      e.stopPropagation();
      // 简单连线逻辑：提示点击目标节点完成连接
      if (context.ui?.showNotice) context.ui.showNotice("请点击需要连接的目标卡片完成连线", { type: "info" });

      function onStageClick(targetEv) {
        const targetNode = targetEv.target.closest(".edgeever-cb-element");
        if (targetNode && targetNode.id !== fromEl.id) {
          canvasData.elements.push({
            id: generateId("arrow"),
            type: "arrow",
            from: fromEl.id,
            to: targetNode.id,
            label: "调用",
          });
          renderConnections();
          scheduleAutoSave();
        }
        window.removeEventListener("click", onStageClick, { capture: true });
      }

      setTimeout(() => {
        window.addEventListener("click", onStageClick, { capture: true, once: true });
      }, 50);
    }

    function selectElement(id) {
      selectedElementId = id;
      if (!canvasContainerEl) return;
      canvasContainerEl.querySelectorAll(".edgeever-cb-element").forEach((el) => {
        el.classList.toggle("is-selected", el.id === id);
      });
    }

    function deleteSelectedElement() {
      if (!selectedElementId || !canvasData) return;
      canvasData.elements = canvasData.elements.filter(
        (el) => el.id !== selectedElementId && el.from !== selectedElementId && el.to !== selectedElementId
      );
      selectedElementId = null;
      renderElements();
      scheduleAutoSave();
    }

    function addNewElement(type) {
      if (!canvasData) return;
      const { x, y, zoom } = canvasData.viewport;
      // 放置在屏幕中心位置
      const centerX = Math.round((-x + 300) / zoom);
      const centerY = Math.round((-y + 200) / zoom);

      const colors = ["blue", "green", "amber", "purple", "red"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newEl = {
        id: generateId(type),
        type,
        x: centerX,
        y: centerY,
        w: type === "circle" ? 120 : type === "diamond" ? 110 : 200,
        h: type === "circle" ? 120 : type === "diamond" ? 110 : 100,
        title: type === "card" ? "新便签卡片" : "新模块",
        content: "双击输入详细内容...",
        color: randomColor,
      };

      canvasData.elements.push(newEl);
      renderElements();
      selectElement(newEl.id);
      scheduleAutoSave();

      // 切回选择工具
      activeTool = "select";
      canvasContainerEl.querySelectorAll(".edgeever-cb-tool-btn[data-tool]").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.tool === "select");
      });
    }

    // ==================== 9. SVG 智能贝塞尔箭头连线渲染 ====================

    function renderConnections() {
      if (!canvasContainerEl || !canvasData) return;
      const svg = canvasContainerEl.querySelector(".edgeever-cb-svg-layer");
      if (!svg) return;

      // 清空除 marker 外的路径
      svg.querySelectorAll("path, text").forEach((p) => p.remove());

      const arrows = canvasData.elements.filter((e) => e.type === "arrow");
      const { x, y, zoom } = canvasData.viewport;

      arrows.forEach((arr) => {
        const fromEl = canvasData.elements.find((e) => e.id === arr.from);
        const toEl = canvasData.elements.find((e) => e.id === arr.to);
        if (!fromEl || !toEl) return;

        // 计算连接端点 (从 fromEl 右侧中点连接到 toEl 左侧中点)
        const x1 = (fromEl.x + (fromEl.w || 200)) * zoom + x;
        const y1 = (fromEl.y + (fromEl.h || 100) / 2) * zoom + y;
        const x2 = toEl.x * zoom + x;
        const y2 = (toEl.y + (toEl.h || 100) / 2) * zoom + y;

        const dx = Math.abs(x2 - x1) * 0.5;
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#3b82f6");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("marker-end", "url(#cb-arrow-marker)");
        svg.appendChild(path);

        if (arr.label) {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("x", (x1 + x2) / 2);
          text.setAttribute("y", (y1 + y2) / 2 - 8);
          text.setAttribute("fill", "#8b949e");
          text.setAttribute("font-size", "11");
          text.setAttribute("text-anchor", "middle");
          text.textContent = arr.label;
          svg.appendChild(text);
        }
      });
    }

    // ==================== 10. 静默自动保存与导出 ====================

    function scheduleAutoSave() {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        if (!currentNote || !canvasData) return;
        const noteId = currentNote.id || currentNote.noteId;
        const markdown = serializeCanvasData(currentNote.title, canvasData);

        try {
          if (noteId && context.notes?.update) {
            await context.notes.update(noteId, {
              contentMarkdown: markdown,
              content: markdown,
            });
          }
          if (context.editor?.setContent) {
            await context.editor.setContent(markdown);
          }

          // 提示保存完成
          const indicator = canvasContainerEl?.querySelector(".edgeever-cb-save-indicator");
          if (indicator) {
            indicator.innerHTML = `${ICONS.check} 已自动同步`;
            indicator.style.opacity = "1";
          }
        } catch (e) {
          console.warn("[Canvas Board] 自动保存异常:", e);
        }
      }, settings.autoSaveDelay);
    }

    async function exportCanvasAsImage() {
      if (!canvasData || canvasData.elements.length === 0) {
        if (context.ui?.showNotice) context.ui.showNotice("画布暂无内容可导出", { type: "info" });
        return;
      }

      try {
        // 创建 Canvas 导出
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");

        // 绘制深色背景
        ctx.fillStyle = "#161b22";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制所有元素
        canvasData.elements.forEach((el) => {
          if (el.type === "card" || el.type === "rect") {
            ctx.fillStyle = "#21262d";
            ctx.strokeStyle = el.color === "green" ? "#10b981" : "#3b82f6";
            ctx.lineWidth = 3;
            ctx.fillRect(el.x, el.y, el.w || 200, el.h || 100);
            ctx.strokeRect(el.x, el.y, el.w || 200, el.h || 100);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 14px sans-serif";
            ctx.fillText(el.title || "", el.x + 12, el.y + 28);

            ctx.fillStyle = "#8b949e";
            ctx.font = "12px sans-serif";
            ctx.fillText(el.content || "", el.x + 12, el.y + 54);
          }
        });

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            if (context.ui?.showNotice) context.ui.showNotice("画布图片已成功生成并复制到剪贴板！", { type: "success" });
          } catch (_) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${currentNote?.title || "画布"}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      } catch (err) {
        if (context.ui?.showNotice) context.ui.showNotice("导出图片失败: " + err.message, { type: "error" });
      }
    }

    // ==================== 11. 全局监听与轮询挂载 ====================

    let observerTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        ensureMenuItemInjected();
        ensureSidebarShortcutMounted();
        initDockButton();
        checkAndMountCanvasBoard();
      }, 250);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 注册系统命令
    if (context.commands?.register) {
      context.commands.register({
        id: "canvas-board-new",
        title: "Canvas Board: 新建无限架构画布笔记",
        shortcut: "Alt-B",
        run: createNewCanvasNote,
        execute: createNewCanvasNote,
      });
      context.commands.register({
        id: "canvas-board-toggle",
        title: "Canvas Board: 切换当前笔记画布/源码视图",
        run: () => {
          if (canvasContainerEl) {
            canvasContainerEl.style.display = canvasContainerEl.style.display === "none" ? "flex" : "none";
          }
        },
        execute: () => {
          if (canvasContainerEl) {
            canvasContainerEl.style.display = canvasContainerEl.style.display === "none" ? "flex" : "none";
          }
        },
      });
    }

    // 初始扫描
    setTimeout(() => {
      ensureMenuItemInjected();
      ensureSidebarShortcutMounted();
      initDockButton();
      checkAndMountCanvasBoard();
    }, 300);

    // 卸载与清理
    return () => {
      observer.disconnect();
      if (canvasContainerEl) canvasContainerEl.remove();
      document.querySelectorAll(".edgeever-cb-menu-item").forEach((el) => el.remove());
      document.querySelectorAll(".edgeever-cb-sidebar-btn").forEach((el) => el.remove());
      document.getElementById("edgeever-cb-dock-btn")?.remove();
    };
  },

  deactivate() {
    if (typeof window !== "undefined") {
      document.querySelector(".edgeever-canvas-board-container")?.remove();
      document.querySelectorAll(".edgeever-cb-menu-item").forEach((el) => el.remove());
      document.querySelectorAll(".edgeever-cb-sidebar-btn").forEach((el) => el.remove());
      document.getElementById("edgeever-cb-dock-btn")?.remove();
    }
  },
};
