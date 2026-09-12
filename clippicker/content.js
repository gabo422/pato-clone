(() => {
  'use strict';

  const MAX_RECENTS = 6;
  const PANEL_ID = 'opera-style-picker-panel';
  const RECENTS_KEY = 'recentFiles';
  const CLIP_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp' };

  let host = null;
  let pendingInput = null;
  let lastClipboard = null;
  let allowNative = false;
  let lastUserClick = { x: 0, y: 0 };

  const CSS_TEXT = `
    :host { all: initial; }
    .op-picker {
      position: fixed;
      z-index: 2147483647;
      width: 320px;
      background: #ffffff;
      color: #1f2328;
      border: 1px solid rgba(128,128,128,.35);
      border-radius: 12px;
      box-shadow: 0 10px 32px rgba(0,0,0,.25);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.35;
      overflow: hidden;
      user-select: none;
    }
    .op-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px; border-bottom: 1px solid rgba(128,128,128,.2);
      font-weight: 600; font-size: 14px; background: #fafafa;
    }
    .op-close {
      border: 0; background: transparent; cursor: pointer;
      font-size: 18px; line-height: 1; color: #666; padding: 2px 6px; border-radius: 6px;
    }
    .op-close:hover { background: rgba(0,0,0,.08); color: #111; }
    .op-section { padding: 10px 12px; border-bottom: 1px solid rgba(128,128,128,.18); }
    .op-section-title {
      font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
      color: #6b7280; margin-bottom: 8px; font-weight: 600;
    }
    .op-clip-preview {
      width: 100%; height: 120px; border-radius: 8px; border: 1px dashed rgba(128,128,128,.45);
      background: #f3f4f6; display: flex; align-items: center; justify-content: center;
      overflow: hidden; margin-bottom: 8px;
    }
    .op-clip-preview img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
    .op-clip-empty { color: #9ca3af; font-size: 12px; text-align: center; padding: 0 16px; }
    .op-clip-actions { display: flex; gap: 8px; }
    .op-btn {
      border: 1px solid rgba(128,128,128,.35); background: #fff; color: #1f2328;
      border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 12.5px; font-weight: 500;
      font-family: inherit;
    }
    .op-btn:hover:not(:disabled) { background: #f3f4f6; }
    .op-btn:disabled { opacity: .5; cursor: not-allowed; }
    .op-btn-primary { background: #0064e0; border-color: #0064e0; color: #fff; flex: 1; }
    .op-btn-primary:hover:not(:disabled) { background: #0053ba; }
    .op-btn-browse {
      width: calc(100% - 24px); padding: 9px; margin: 10px 12px 12px; font-weight: 600;
    }
    .op-recents-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .op-recent {
      border: 1px solid rgba(128,128,128,.3); border-radius: 8px; overflow: hidden;
      cursor: pointer; background: #fafafa; position: relative;
    }
    .op-recent:hover { border-color: #0064e0; box-shadow: 0 0 0 2px rgba(0,100,224,.25); }
    .op-recent img { width: 100%; height: 62px; object-fit: cover; display: block; }
    .op-recent-name {
      font-size: 10.5px; color: #374151; padding: 4px 6px; white-space: nowrap;
      text-overflow: ellipsis; overflow: hidden;
    }
    .op-recents-empty { color: #9ca3af; font-size: 12px; text-align: center; padding: 6px 0; }
    .op-footer { background: #fafafa; padding: 0 0 12px; border-top: 1px solid rgba(128,128,128,.18); }
    @media (prefers-color-scheme: dark) {
      .op-picker { background: #202124; color: #e8eaed; border-color: rgba(255,255,255,.2); }
      .op-header { background: #292a2d; }
      .op-footer { background: #292a2d; }
      .op-btn { background: #3c4043; color: #e8eaed; border-color: rgba(255,255,255,.2); }
      .op-btn:hover:not(:disabled) { background: #4b4f54; }
      .op-btn-primary { background: #0064e0; color: #fff; }
      .op-btn-primary:hover:not(:disabled) { background: #0053ba; }
      .op-close:hover { background: rgba(255,255,255,.12); color: #fff; }
      .op-section-title { color: #9aa0a6; }
      .op-clip-preview { background: #34363a; }
      .op-recent { background: #292a2d; }
      .op-recent-name { color: #ced1d5; }
      .op-clip-empty, .op-recents-empty { color: #80868b; }
    }
  `;

  // ---------- Storage ----------
  async function loadRecents() {
    const data = await chrome.storage.local.get(RECENTS_KEY);
    return data[RECENTS_KEY] || [];
  }

  async function storeRecents(recents) {
    await chrome.storage.local.set({ [RECENTS_KEY]: recents.slice(0, MAX_RECENTS) });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToFile(dataUrl, filename) {
    const comma = dataUrl.indexOf(',');
    const mime = (dataUrl.slice(5, comma).split(';')[0] || 'image/png').toLowerCase();
    const bin = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename || 'imagen.png', { type: mime });
  }

  function dataUrlExtension(dataUrl) {
    const mime = (dataUrl.slice(5, dataUrl.indexOf(',')).split(';')[0] || 'image/png').toLowerCase();
    return CLIP_MIME[mime] || 'png';
  }

  async function addRecent(file) {
    if (!file || !file.type || !file.type.startsWith('image/') || file.size === 0) return;
    const recents = await loadRecents();
    const dataUrl = await fileToDataUrl(file);
    const entry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2),
      name: file.name ? file.name : ('imagen.' + dataUrlExtension(dataUrl)),
      size: file.size,
      date: Date.now(),
      dataUrl
    };
    const filtered = recents.filter(r => !(r.name === entry.name && r.size === entry.size));
    filtered.unshift(entry);
    await storeRecents(filtered);
  }

  // ---------- Clipboard ----------
  async function readClipboardImage() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) return null;
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types && item.types.find(t => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          if (blob && blob.size > 0) return blob;
        }
      }
      return null;
    } catch (err) {
      console.warn('[Opera Picker] No se pudo leer el portapapeles:', err);
      return null;
    }
  }

  // ---------- Panel UI ----------
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function buildPanel() {
    host = document.createElement('div');
    host.id = PANEL_ID;
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = CSS_TEXT;
    shadow.appendChild(style);

    const root = document.createElement('div');
    root.className = 'op-picker';
    root.innerHTML = `
      <div class="op-header">
        <span class="op-title">Subir archivo</span>
        <button class="op-close" title="Cerrar">&#215;</button>
      </div>
      <div class="op-section op-clip">
        <div class="op-section-title">Portapapeles</div>
        <div class="op-clip-preview">
          <img class="op-clip-img" alt="Imagen del portapapeles" hidden>
          <div class="op-clip-empty">Leyendo portapapeles...</div>
        </div>
        <div class="op-clip-actions">
          <button class="op-btn op-btn-primary op-btn-paste" disabled>Usar esta imagen</button>
          <button class="op-btn op-btn-refresh" title="Actualizar portapapeles">Actualizar</button>
        </div>
      </div>
      <div class="op-section op-recents">
        <div class="op-section-title">Recientes</div>
        <div class="op-recents-grid"></div>
      </div>
      <div class="op-footer">
        <button class="op-btn op-btn-browse">Explorar archivos...</button>
      </div>
    `;
    shadow.appendChild(root);
    document.body.appendChild(host);

    const el = (sel) => root.querySelector(sel);

    el('.op-close').addEventListener('click', (e) => { e.stopPropagation(); closePanel(); });
    el('.op-btn-refresh').addEventListener('click', (e) => { e.stopPropagation(); refreshClipboard(); });
    el('.op-btn-paste').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!lastClipboard) return;
      const ext = CLIP_MIME[lastClipboard.type] || 'png';
      const file = new File([lastClipboard], 'portapapeles.' + ext, { type: lastClipboard.type });
      applyFiles([file]);
      addRecent(file);
    });
    el('.op-btn-browse').addEventListener('click', () => {
      allowNative = true;
      closePanel();
      if (pendingInput) pendingInput.click();
    });

    return root;
  }

  async function refreshClipboard() {
    const root = host.shadowRoot.querySelector('.op-picker');
    const img = root.querySelector('.op-clip-img');
    const empty = root.querySelector('.op-clip-empty');
    const btn = root.querySelector('.op-btn-paste');

    btn.disabled = true;
    img.hidden = true;
    empty.textContent = 'Leyendo portapapeles...';
    empty.hidden = false;

    lastClipboard = await readClipboardImage();

    if (lastClipboard) {
      const dataUrl = await fileToDataUrl(lastClipboard);
      img.src = dataUrl;
      img.hidden = false;
      empty.hidden = true;
      btn.disabled = false;
    } else {
      img.src = '';
      img.hidden = true;
      empty.textContent = 'No hay imagen en el portapapeles';
      empty.hidden = false;
    }
  }

  function renderRecents(list) {
    const root = host.shadowRoot.querySelector('.op-picker');
    const grid = root.querySelector('.op-recents-grid');
    grid.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'op-recents-empty';
      empty.textContent = 'Aún no hay archivos recientes';
      grid.appendChild(empty);
      return;
    }
    list.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'op-recent';
      item.title = entry.name + ' \u00b7 ' + formatSize(entry.size) + ' \u00b7 ' + new Date(entry.date).toLocaleString();
      item.innerHTML =
        '<img src="' + entry.dataUrl + '" alt="">' +
        '<div class="op-recent-name"></div>';
      item.querySelector('.op-recent-name').textContent = entry.name;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const file = dataUrlToFile(entry.dataUrl, entry.name);
        applyFiles([file]);
      });
      grid.appendChild(item);
    });
  }

  function positionPanel(input) {
    const root = host.shadowRoot.querySelector('.op-picker');
    let ax = lastUserClick.x;
    let ay = lastUserClick.y;
    const rect = input.getBoundingClientRect();
    // Si el input está oculto (Jira, Google, etc.) usamos el punto donde tocó el usuario
    if (rect.width > 0 && rect.height > 0) {
      ax = rect.left;
      ay = rect.bottom;
    }
    root.style.visibility = 'hidden';
    const w = root.offsetWidth;
    const h = root.offsetHeight;
    root.style.visibility = '';
    let top = ay + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, ay - h - 6);
    let left = Math.min(ax, window.innerWidth - w - 8);
    left = Math.max(8, left);
    root.style.top = top + 'px';
    root.style.left = left + 'px';
  }

  function closePanel() {
    if (host) {
      host.remove();
      host = null;
    }
    pendingInput = null;
    lastClipboard = null;
  }

  function notifyChange(input) {
    // Hacer que el tracker de frameworks (React, Vue) vea el valor como "distinto"
    try {
      const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');
      if (desc && desc.set && input.value) {
        desc.set.call(input, input.value);
      }
    } catch (e) { /* input tipo file: setter no vacío lanza; ignorar */ }

    const opts = { bubbles: true, composed: true };
    input.dispatchEvent(new Event('input', opts));
    input.dispatchEvent(new Event('change', opts));
  }

  function applyFiles(files) {
    if (!pendingInput || !files.length) return;
    const input = pendingInput;
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    try {
      input.files = dt.files;
    } catch (err) {
      console.warn('[ClipPicker] No se pudieron asignar los archivos:', err);
      return;
    }
    notifyChange(input);
    // Algunos frameworks re-escuchan o re-renderizan el input tarde; reintentamos una vez
    setTimeout(() => {
      if (input.isConnected && input.files && input.files.length === 0) {
        input.files = dt.files;
        notifyChange(input);
      }
    }, 50);
    closePanel();
  }

  function openPanel(input) {
    pendingInput = input;
    closePanel();
    buildPanel();
    positionPanel(input);
    loadRecents().then(renderRecents);
    refreshClipboard();
  }

  // ---------- Click interception ----------
  document.addEventListener('click', (e) => {
    if (e.isTrusted && !(host && e.composedPath().includes(host))) {
      lastUserClick = { x: e.clientX, y: e.clientY };
    }

    const path = e.composedPath();
    const input = path.find(el => el instanceof HTMLInputElement && el.type === 'file');

    if (host && !path.includes(host)) {
      closePanel();
    }

    if (!input) return;

    if (allowNative) {
      allowNative = false;
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    openPanel(input);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  }, true);

  window.addEventListener('blur', () => closePanel());

  // Save images picked via the native picker to recents
  document.addEventListener('change', async (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type === 'file') {
      const files = Array.from(e.target.files || []);
      for (const f of files) addRecent(f);
    }
  }, true);

  // If a page script removes our panel node, just reset state
  new MutationObserver((muts) => {
    if (!host) return;
    for (const m of muts) {
      if (m.removedNodes && Array.from(m.removedNodes).includes(host)) {
        host = null;
        pendingInput = null;
        lastClipboard = null;
      }
    }
  }).observe(document.documentElement || document.body, { childList: true, subtree: true });
})();