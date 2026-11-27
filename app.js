import { directoryFiles, readDrop } from "/drop.js";


const icons = {
  clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3m0 7h8m-8 4h6"/>',
  key: '<circle cx="16" cy="8" r="5"/><path d="m12.5 11.5-9 9H2v-4l3-3h3l3-3"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m16 16 4 4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  text: '<path d="M4 6h16M4 11h16M4 16h11M4 21h7"/>',
  link: '<path d="M10 13a4 4 0 0 0 5.7 0l4-4a4 4 0 0 0-5.7-5.7l-2 2m2 6a4 4 0 0 0-5.7 0l-4 4A4 4 0 0 0 10 21l2-2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  hash: '<path d="m10 4-4 16M18 4l-4 16M4 9h16M3 15h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  enter: '<path d="M12 4h8v16h-8m-8-8h11m-4-4 4 4-4 4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5m-4 0a7 7 0 0 1 12-5l3 3m-1 2a7 7 0 0 1-12 5l-3-3"/>',
  qr: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h3v3h3m-6 3h1m5-7v1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2"/>',
  moon: '<path d="M20.8 14A9 9 0 0 1 10 3.2 9 9 0 1 0 20.8 14Z"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 13h6m-6 4h6"/>',
  expand: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  collapse: '<path d="M9 4v5H4m16 0h-5V4m0 16v-5h5m-16 0h5v5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  trash: '<path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6"/>',
};

function icon(element, name) {
  element.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + icons[name] + '</svg>';
  return element;
}

document.querySelectorAll("[data-icon]").forEach(element => icon(element, element.dataset.icon));

const byId = id => document.getElementById(id);
const createForm = byId("create-form");
const joinForm = byId("join-form");
const joinCode = byId("join-code");
const recentRoomsKey = "clipdrop.recentRooms";
const joinMessage = byId("join-message");
const postForm = byId("post-form");
const postText = byId("post-text");
const fileInput = byId("post-files");
const fileButton = byId("pick-files");
const shareDialog = byId("share-dialog");
const postDialog = byId("post-dialog");
const codePattern = /^[A-Z0-9][A-Z0-9-]{2,22}[A-Z0-9]$/i;
const codeHelp = "Use 4–24 letters, numbers, or hyphens. Start and end with a letter or number.";
const labels = { text: "Text", links: "Links", images: "Images", files: "Files" };
const formats = [...postForm.querySelectorAll('input[name="kind"]')];
const imageType = /^(image\/(?:png|jpeg|webp|gif|avif|bmp))$/;
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

let room;
let roomLookup;
let postLookup;
let activeFilter = "all";
let feedRequest;
let nextPage;
let posts = [];
let files = { images: [], files: [] };
let toastTimeout;
const deletedPostIds = new Set();

async function deletePost(target, item) {
  deletedPostIds.add(item.id);
  const partMatch = item.summary?.match(/^(.*?)\.part\d+$/);
  if (partMatch) {
    const baseName = partMatch[1];
    const siblingParts = posts.filter(p => p.id !== item.id && p.summary?.startsWith(baseName + ".part"));
    for (const sib of siblingParts) {
      deletedPostIds.add(sib.id);
      const sPath = feedPath(target, sib);
      api(sPath, { method: "DELETE", headers: roomHeaders(target) }).catch(() => {});
    }
  }
  posts = posts.filter(p => !deletedPostIds.has(p.id));
  renderFeed();
  const path = feedPath(target, item);
  await api(path, { method: "DELETE", headers: roomHeaders(target) });
}

function node(tag, value, className) {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = value;
  if (className) element.className = className;
  return element;
}

function message(target, text = "") {
  target.textContent = text;
  target.hidden = !text;
}

function action(text, run, className = "button secondary") {
  const button = node("button", text, className);
  button.type = "button";
  button.addEventListener("click", run);
  return button;
}

function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const button = byId("theme");
  icon(button, theme === "dark" ? "sun" : "moon");
  button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
}

const scheme = matchMedia("(prefers-color-scheme: dark)");
applyTheme(document.documentElement.dataset.theme ?? (scheme.matches ? "dark" : "light"));
scheme.addEventListener("change", event => {
  const saved = readLocal("clipdrop.theme", null);
  if (saved !== "dark" && saved !== "light") applyTheme(event.matches ? "dark" : "light");
});
byId("theme").addEventListener("click", () => {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  writeLocal("clipdrop.theme", theme);
});

const fullScreen = byId("fullscreen");
if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
  fullScreen.hidden = false;
  function updateFullScreen() {
    const on = Boolean(document.fullscreenElement);
    icon(fullScreen, on ? "collapse" : "expand");
    const label = on ? "Exit full screen" : "Enter full screen";
    fullScreen.setAttribute("aria-label", label);
    fullScreen.title = label;
  }

  document.addEventListener("fullscreenchange", updateFullScreen);
  fullScreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      notify("Full screen is unavailable in this window.");
    }
  });
  updateFullScreen();
}

function notify(text) {
  clearTimeout(toastTimeout);
  const target = shareDialog.open ? byId("share-status") : postDialog.open ? byId("detail-status") : byId("toast");
  message(target, text);
  toastTimeout = setTimeout(() => message(target), 2600);
}

async function copy(text, confirmation) {
  try {
    await navigator.clipboard.writeText(text);
    notify(confirmation);
  } catch {
    notify("Clipboard access is unavailable.");
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const value = response.headers.get("Content-Type")?.includes("application/json") ? await response.json() : null;
  if (!response.ok || !value) {
    const error = new Error(value?.error ?? "Could not reach Clipdrop. Try again.");
    error.status = response.status;
    throw error;
  }
  return value;
}

function shareURL(type, code) {
  const url = new URL("/", location.origin);
  url.hash = type + "=" + code;
  return url.href;
}

function joinTarget(value) {
  for (const item of value.match(/https?:\/\/[^\s<>"']+/gi) ?? []) {
    let url;
    try { url = new URL(item.replace(/[),.!?;]+$/, "")); } catch { continue; }
    if (url.origin !== location.origin || url.pathname !== "/") continue;
    const query = new URLSearchParams(url.hash.slice(1));
    for (const type of ["room", "clip"]) {
      const code = query.get(type);
      if (code && codePattern.test(code)) return { type, code: code.toUpperCase() };
    }
  }
  const text = value.trim().replace(/[–—]/g, "-");
  const spaced = text.match(/^([23456789A-HJ-NP-Z]{4})\s+([23456789A-HJ-NP-Z]{4})$/i);
  const labelled = text.replace(/https?:\/\/[^\s<>"']+/gi, " ").match(/\b(?:room )?code:\s*([a-z0-9-]+)\b/i)?.[1];
  const code = labelled ?? (spaced ? spaced[1] + "-" + spaced[2] : text);
  return codePattern.test(code) ? { type: "lookup", code: code.toUpperCase() } : null;
}

function showView(view) {
  byId("home").hidden = view !== "home";
  byId("room").hidden = view !== "room";
  byId("old-clip").hidden = view !== "clip";
}

function renderRecent() {
  const entries = readLocal(recentRoomsKey, []);
  const list = byId("recent-list");
  list.replaceChildren();
  for (const entry of entries) {
    const row = node("li");
    const button = action(entry.name, () => openDestination({ type: "room", code: entry.code }), "");
    button.append(node("span", entry.code));
    row.append(button);
    list.append(row);
  }
  byId("recent").hidden = !entries.length;
}

function rememberRoom(entry) {
  const recent = readLocal(recentRoomsKey, []).filter(item => item.code !== entry.code);
  writeLocal(recentRoomsKey, [{ name: entry.name, code: entry.code }, ...recent].slice(0, 3));
  renderRecent();
}

byId("clear-recent").addEventListener("click", () => {
  try {
    localStorage.removeItem(recentRoomsKey);
  } catch {
    notify("Could not clear recent rooms.");
    return;
  }
  joinCode.focus();
  renderRecent();
  notify("Recent rooms cleared from this browser.");
});

window.addEventListener("storage", event => {
  if (event.storageArea === localStorage && (event.key === recentRoomsKey || event.key === null)) renderRecent();
});

function browserToken() {
  const storageKey = "clipdrop.clientToken";
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (/^[a-f0-9]{48}$/.test(stored ?? "")) return stored;
  } catch {}
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, "0")).join("");
  try { sessionStorage.setItem(storageKey, token); } catch {}
  return token;
}

const ownerToken = browserToken();
let revealTimeout;

function roomHeaders(target, headers = {}) {
  return { ...headers, "X-Room-Generation": target.generation, "X-Clipdrop-Client": ownerToken };
}

async function roomRequest(target, resource, options = {}) {
  const response = await fetch("/api/rooms/" + target.code + "/" + resource, {
    ...options, headers: roomHeaders(target, options.headers),
  });
  if (!response.ok && response.status !== 304) {
    const details = await response.json().catch(() => ({}));
    const failure = new Error(details.error ?? "Could not reach the room.");
    failure.status = response.status;
    throw failure;
  }
  return response;
}

function showRoom(entry) {
  const different = room?.code !== entry.code;
  activeFilter = "all";
  room = entry;
  if (different) {
    postForm.reset();
    files = { images: [], files: [] };
    deletedPostIds.clear();
    updateComposer();
    message(byId("post-message"));
  }
  byId("room-title").textContent = room.name;
  byId("active-code").textContent = room.code;
  const chip = byId("copy-room-code");
  chip.setAttribute("aria-label", "Copy room code " + room.code);
  document.title = room.name + " · Clipdrop";
  rememberRoom(room);
  showView("room");
  setFilter("all");
  byId("room-title").focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function setHome() {
  roomLookup?.abort();
  postLookup?.abort();
  feedRequest?.abort();
  room = null;
  posts = [];
  nextPage = null;
  deletedPostIds.clear();
  byId("posts").replaceChildren();
  byId("detail-body").replaceChildren();
  postForm.reset();
  files = { images: [], files: [] };
  updateComposer();
  if (postDialog.open) postDialog.close();
  if (shareDialog.open) shareDialog.close();
  document.title = "Clipdrop — Shared rooms";
  showView("home");
  renderRecent();
}

function updateAddress(type, code) {
  const target = shareURL(type, code);
  if (target !== location.href) history.pushState(null, "", target);
}

async function openDestination({ type, code }) {
  roomLookup?.abort();
  const controller = new AbortController();
  roomLookup = controller;
  const options = { signal: controller.signal };
  const button = byId("join-button");
  button.disabled = true;
  message(joinMessage);
  try {
    let resolved = type;
    let item;
    if (type !== "clip") {
      try {
        item = await api("/api/rooms/" + code, options);
        resolved = "room";
      } catch (error) {
        if (type !== "lookup" || error.status !== 404) throw error;
        resolved = "clip";
      }
    }
    if (resolved === "clip") {
      try {
        item = await api("/api/clips/" + code, options);
      } catch (error) {
        if (type === "lookup" && error.status === 404) throw new Error("Room not found. Check the code and try again.");
        throw error;
      }
    }
    if (controller.signal.aborted) return;
    updateAddress(resolved, item.code);
    if (resolved === "room") showRoom(item);
    else renderOldClip(item);
  } catch (error) {
    if (controller.signal.aborted) return;
    setHome();
    joinCode.value = code;
    message(joinMessage, error.message);
    joinCode.focus();
  } finally {
    if (roomLookup === controller) button.disabled = false;
  }
}

function route() {
  const params = new URLSearchParams(location.hash.slice(1));
  const type = params.has("room") ? "room" : params.has("clip") ? "clip" : null;
  if (type && codePattern.test(params.get(type) ?? "")) {
    openDestination({ type, code: params.get(type).toUpperCase() });
  } else {
    setHome();
    byId("join-button").disabled = false;
    if (location.hash === "#join") joinCode.focus();
  }
}

window.addEventListener("hashchange", route);
byId("join-nav").addEventListener("click", event => {
  event.preventDefault();
  if (location.hash !== "#join") history.pushState(null, "", "#join");
  route();
  byId("join").scrollIntoView({ block: "nearest" });
});
document.querySelectorAll(".back-home").forEach(link => link.addEventListener("click", event => {
  event.preventDefault();
  history.pushState(null, "", "/");
  route();
  window.scrollTo(0, 0);
}));

joinForm.addEventListener("submit", event => {
  event.preventDefault();
  const target = joinTarget(joinCode.value);
  if (target) openDestination(target);
  else {
    message(joinMessage, "Enter a room code or paste a Clipdrop share link.");
    joinCode.focus();
  }
});
joinCode.addEventListener("input", () => message(joinMessage));
byId("paste-code").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    const target = joinTarget(text);
    if (target) return openDestination(target);
    message(joinMessage, "Copy a Clipdrop room code or share link first.");
  } catch {
    message(joinMessage, "Use your device’s paste shortcut in the code field.");
  }
  joinCode.focus();
});

createForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = byId("create-button");
  if (button.disabled) return;
  const codeInput = byId("room-code");
  const name = byId("room-name");
  const status = byId("create-message");
  const code = codeInput.value.trim();
  if (code && !codePattern.test(code)) {
    message(status, codeHelp);
    codeInput.focus();
    return;
  }
  const body = new FormData();
  body.set("name", name.value.trim());
  if (code) body.set("code", code);
  roomLookup?.abort();
  byId("join-button").disabled = false;
  button.disabled = true;
  button.lastChild.textContent = " Creating…";
  message(status);
  try {
    const entry = await api("/api/rooms", { method: "POST", body });
    roomLookup?.abort();
    byId("join-button").disabled = false;
    createForm.reset();
    updateAddress("room", entry.code);
    showRoom(entry);
  } catch (error) {
    message(status, error.message);
    if (error.status === 409) codeInput.focus();
  } finally {
    button.disabled = false;
    button.lastChild.textContent = " Create room";
  }
});

function drawQR(canvas, value, qrcode) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const modules = qr.getModuleCount();
  const scale = 5;
  const border = 4;
  canvas.width = canvas.height = (modules + border * 2) * scale;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#101010";
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.isDark(row, col)) context.fillRect((col + border) * scale, (row + border) * scale, scale, scale);
    }
  }
}

byId("share-room").addEventListener("click", async () => {
  const entry = room;
  if (!entry || shareDialog.open) return;
  let qrcode;
  try { ({ default: qrcode } = await import("/qrcode.js")); }
  catch { return notify("Could not load the room QR code. Try again."); }
  if (room !== entry || shareDialog.open) return;
  const { code, name } = entry;
  const url = shareURL("room", code);
  const invite = "Join " + name + " on Clipdrop\n" + url + "\nRoom code: " + code;
  drawQR(byId("share-qr"), url, qrcode);
  byId("share-code").textContent = code;
  const actions = byId("share-actions");
  actions.replaceChildren(
    action("Copy invitation", () => copy(invite, "Invitation copied."), "button primary"),
    action("Copy link", () => copy(url, "Link copied.")),
    action("Copy code", () => copy(code, "Room code copied.")),
  );
  if (typeof navigator.share === "function") actions.append(action("Share from device", async () => {
    try { await navigator.share({ title: name, text: "Join my Clipdrop room", url }); }
    catch (error) { if (error.name !== "AbortError") notify("Use Copy invitation to share this room."); }
  }));
  message(byId("share-status"));
  shareDialog.showModal();
});
byId("copy-room-code").addEventListener("click", () => copy(room.code, "Room code copied."));

function kindSelected() {
  return formats.find(input => input.checked).value;
}

function updateComposer() {
  const kind = kindSelected();
  byId("text-field").hidden = kind !== "text";
  byId("link-field").hidden = kind !== "links";
  byId("post-link").disabled = kind !== "links";
  byId("upload-field").hidden = !files[kind];
  fileInput.accept = kind === "images" ? "image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" : "";
  fileInput.value = "";
  byId("pick-folder").hidden = kind !== "files";
  renderFiles(kind);
}

function renderFiles(kind) {
  const list = byId("selected-files");
  list.replaceChildren();
  (files[kind] ?? []).forEach((file, index) => {
    const row = node("li");
    const remove = action("", () => {
      files[kind].splice(index, 1);
      renderFiles(kind);
      (list.querySelectorAll("button")[Math.min(index, list.children.length - 1)] ?? fileButton).focus();
    }, "icon-button");
    remove.setAttribute("aria-label", "Remove " + file.name);
    icon(remove, "close");
    row.append(node("span", file.name), remove);
    list.append(row);
  });
  list.hidden = !list.children.length;
}

function addFiles(incoming) {
  const kind = kindSelected();
  const status = byId("post-message");
  if (!files[kind] || byId("post-button").disabled) return;
  const next = [...files[kind], ...incoming];
  const totalBytes = next.reduce((size, file) => size + file.size, 0);
  if (totalBytes > 500_000_000) {
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
    message(status, `Total size exceeds the 500 MB limit (${totalMb} MB). Please keep total under 500 MB.`);
    return;
  }
  if (kind === "images" && next.some(file => !imageType.test(file.type))) {
    message(status, "Choose PNG, JPEG, WebP, GIF, AVIF, or BMP images.");
    return;
  }
  files[kind] = next;
  message(status);
  renderFiles(kind);
}

formats.forEach(input => input.addEventListener("change", () => {
  message(byId("post-message"));
  updateComposer();
}));
fileButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});
fileButton.addEventListener("dragover", event => {
  if (!event.dataTransfer.types.includes("Files")) return;
  event.preventDefault();
  fileButton.classList.add("dragging");
});
fileButton.addEventListener("dragleave", event => {
  if (!fileButton.contains(event.relatedTarget)) fileButton.classList.remove("dragging");
});
async function addFolder(entries) {
  const target = room;
  if (!target || !entries.length) return;
  const status = byId("post-message");
  const firstEntry = (entries[0].path || "").replace(/\\+/g, "/");
  const root = firstEntry.split("/")[0] || "folder";
  message(status, "Compressing folder (up to 500 MB)…");
  try {
    const { zipFolder } = await import("/tools.js");
    const archive = await zipFolder(entries, 500_000_000, root + ".zip");
    if (room !== target) return;
    formats.find(input => input.value === "files").checked = true;
    updateComposer();
    addFiles([archive]);
  } catch (error) {
    message(status, error.message);
  }
}

byId("pick-folder").addEventListener("click", () => byId("folder-input").click());
byId("folder-input").addEventListener("change", async event => {
  const entries = directoryFiles(event.target.files);
  event.target.value = "";
  try { await addFolder(entries); }
  catch (error) { message(byId("post-message"), error.message); }
});
fileButton.addEventListener("drop", async event => {
  event.preventDefault();
  fileButton.classList.remove("dragging");
  const target = room;
  try {
    const { folder, entries } = await readDrop(event.dataTransfer);
    if (target !== room) return;
    if (folder) await addFolder(entries);
    else addFiles(entries.map(entry => entry.file));
  } catch (error) { message(byId("post-message"), error.message); }
});
postText.addEventListener("paste", event => {
  if (!event.clipboardData.files.length || byId("post-button").disabled) return;
  if (event.clipboardData.getData("text/plain")) return;
  event.preventDefault();
  const incoming = [...event.clipboardData.files];
  const type = incoming.every(file => imageType.test(file.type)) ? "images" : "files";
  formats.find(input => input.value === type).checked = true;
  updateComposer();
  addFiles(incoming);
  fileButton.focus();
});

postForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = byId("post-button");
  if (button.disabled || !room) return;
  const target = room;
  const kind = kindSelected();
  const status = byId("post-message");
  const selectedFiles = files[kind] ?? [];
  const controls = [...formats, postText, byId("post-link"), fileButton, byId("pick-folder"), byId("sensitive"), ...byId("selected-files").querySelectorAll("button")];

  message(status);
  button.disabled = true;
  button.lastChild.textContent = " Posting…";
  controls.forEach(control => { control.disabled = true; });

  try {
    const CHUNK_LIMIT = 9_000_000;
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

    if (selectedFiles.length === 1 && selectedFiles[0].size > CHUNK_LIMIT) {
      const file = selectedFiles[0];
      const totalParts = Math.ceil(file.size / CHUNK_LIMIT);
      for (let i = 0; i < totalParts; i++) {
        if (room !== target) return;
        button.lastChild.textContent = ` Uploading part ${i + 1} of ${totalParts}…`;
        const start = i * CHUNK_LIMIT;
        const end = Math.min(file.size, start + CHUNK_LIMIT);
        const partBlob = file.slice(start, end);
        const partFile = new File([partBlob], `${file.name}.part${i + 1}`, { type: file.type });
        const partBody = new FormData();
        partBody.set("kind", kind);
        partBody.set("sensitive", String(byId("sensitive").checked));
        partBody.append("file", partFile);
        await roomRequest(target, "posts", { method: "POST", body: partBody });
      }
    } else if (selectedFiles.length > 7 || totalSize > CHUNK_LIMIT) {
      const batches = [];
      let currentBatch = [];
      let currentBatchSize = 0;
      for (const file of selectedFiles) {
        if (currentBatch.length >= 6 || (currentBatchSize + file.size > CHUNK_LIMIT && currentBatch.length > 0)) {
          batches.push(currentBatch);
          currentBatch = [];
          currentBatchSize = 0;
        }
        currentBatch.push(file);
        currentBatchSize += file.size;
      }
      if (currentBatch.length > 0) batches.push(currentBatch);

      for (let bi = 0; bi < batches.length; bi++) {
        if (room !== target) return;
        button.lastChild.textContent = ` Uploading batch ${bi + 1} of ${batches.length}…`;
        const batchBody = new FormData();
        batchBody.set("kind", kind);
        batchBody.set("sensitive", String(byId("sensitive").checked));
        for (const f of batches[bi]) batchBody.append("file", f);
        await roomRequest(target, "posts", { method: "POST", body: batchBody });
      }
    } else {
      const body = new FormData();
      body.set("kind", kind);
      body.set("sensitive", String(byId("sensitive").checked));
      if (kind === "text") body.set("value", new Blob([postText.value], { type: "text/plain" }), "note.txt");
      if (kind === "links") body.set("value", byId("post-link").value.trim());
      for (const file of selectedFiles) body.append("file", file);
      await roomRequest(target, "posts", { method: "POST", body });
    }

    if (room !== target) return;
    byId("sensitive").checked = false;
    if (kind === "text") postText.value = "";
    if (kind === "links") byId("post-link").value = "";
    if (files[kind]) files[kind] = [];
    updateComposer();
    if (activeFilter !== "all" && activeFilter !== kind) setFilter(kind);
    else loadFeed();
    notify("Posted to the room.");
  } catch (error) {
    if (room === target && error.status === 410) setHome();
    else if (room === target) message(status, error.message);
  } finally {
    controls.forEach(control => { control.disabled = false; });
    byId("post-link").disabled = kindSelected() !== "links";
    button.disabled = false;
    button.lastChild.textContent = " Post to room";
  }
});

function feedPath(entry, item) {
  return "/api/rooms/" + entry.code + "/posts/" + item.kind + "/" + item.id;
}

function postCard(item) {
  const entry = room;
  const button = action("", () => openPost(entry, item), "post-card");
  const group = node("div");
  const meta = node("div", undefined, "post-meta");
  const stamp = node("time", dateFormat.format(new Date(item.createdAt)));
  stamp.dateTime = new Date(item.createdAt).toISOString();
  meta.append(node("span", labels[item.kind]), stamp);
  if (item.expiresAt) meta.append(node("small", item.own ? "Awaiting recipient" : "One-time access"));
  if (item.count > 1) meta.append(node("small", item.count + " attachments"));

  const deleteBtn = action("", async event => {
    event.stopPropagation();
    event.preventDefault();
    const typeLabel = item.kind === "files" ? "file" : item.kind === "images" ? "image" : "post";
    if (!confirm(`Delete this ${typeLabel}?`)) return;
    try {
      await deletePost(entry, item);
      notify("Deleted.");
    } catch (error) {
      notify(error.message || "Could not delete.");
    }
  }, "icon-button delete-post-btn");
  deleteBtn.setAttribute("aria-label", "Delete " + item.summary);
  deleteBtn.title = "Delete " + (item.kind === "files" ? "file" : "post");
  icon(deleteBtn, "trash");
  meta.append(deleteBtn);

  group.append(meta, node("p", item.summary));
  button.append(group);
  if (item.kind === "images" && !item.expiresAt) {
    const image = node("img");
    image.alt = "";
    image.loading = "lazy";
    image.src = feedPath(entry, item) + "/files/0?preview";
    button.append(image);
  }
  return button;
}

function renderFeed() {
  posts = posts.filter(post => (!post.expiresAt || post.expiresAt > Date.now()) && !deletedPostIds.has(post.id) && !post.summary?.startsWith("__CLIPDROP_DELETE__:"));
  const container = byId("posts");
  const existing = new Map([...container.children].map(child => [child.dataset.id, child]));
  const visible = new Set(posts.map(post => post.id));
  for (const [id, child] of existing) if (!visible.has(id)) child.remove();
  posts.forEach((post, index) => {
    const atIndex = container.children[index];
    if (atIndex?.dataset.id === post.id) return;
    const card = existing.get(post.id) ?? postCard(post);
    card.dataset.id = post.id;
    container.insertBefore(card, atIndex ?? null);
  });
  byId("more").hidden = !nextPage;
  byId("empty").hidden = posts.length > 0;
  byId("empty-title").textContent = activeFilter === "all" ? "The board is empty" : "No " + labels[activeFilter].toLowerCase() + " posts yet";
  byId("empty-copy").textContent = activeFilter === "all" ? "Add the first post to get the room started." : "Share something here or switch to another filter.";
}

async function loadFeed({ older = false, quiet = false } = {}) {
  if (!room || (older && !nextPage) || (quiet && feedRequest)) return;
  feedRequest?.abort();
  const request = new AbortController();
  feedRequest = request;
  const target = room;
  const filter = activeFilter;
  const params = new URLSearchParams({ kind: filter });
  if (older) params.set("after", nextPage);
  const more = byId("more");
  more.disabled = true;
  if (!quiet) message(byId("board-message"));
  try {
    const page = await (await roomRequest(target, "posts?" + params, { signal: request.signal })).json();
    if (request.signal.aborted || room !== target || activeFilter !== filter) return;

    for (const p of page.posts) {
      if (p.summary && p.summary.startsWith("__CLIPDROP_DELETE__:")) {
        deletedPostIds.add(p.summary.slice("__CLIPDROP_DELETE__:".length).trim());
      }
    }
    page.posts = page.posts.filter(p => !p.summary?.startsWith("__CLIPDROP_DELETE__:") && !deletedPostIds.has(p.id));

    if (older) {
      const known = new Set(posts.map(item => item.id));
      posts.push(...page.posts.filter(item => !known.has(item.id)));
      nextPage = page.next;
    } else {
      const oldestFresh = page.posts.at(-1)?.id;
      const canMerge = oldestFresh && posts.length && oldestFresh >= posts[0].id;
      posts = canMerge ? [...page.posts, ...posts.filter(item => item.id > oldestFresh && !item.expiresAt)] : page.posts;
      if (posts.length <= page.posts.length) nextPage = page.next;
    }
    message(byId("board-message"));
    renderFeed();
  } catch (error) {
    if (!request.signal.aborted && error.status === 410 && room === target) setHome();
    else if (!request.signal.aborted && !quiet) message(byId("board-message"), error.message);
  } finally {
    if (feedRequest === request) {
      feedRequest = null;
      more.disabled = false;
    }
  }
}

function setFilter(kind) {
  activeFilter = kind;
  for (const button of document.querySelectorAll("[data-filter]")) {
    button.setAttribute("aria-pressed", String(button.dataset.filter === kind));
  }
  posts = [];
  nextPage = null;
  byId("posts").replaceChildren();
  byId("empty").hidden = true;
  byId("more").hidden = true;
  loadFeed();
}

document.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
  if (activeFilter !== button.dataset.filter) setFilter(button.dataset.filter);
}));
byId("refresh").addEventListener("click", () => loadFeed());
byId("more").addEventListener("click", () => loadFeed({ older: true }));
// Auto-refresh feed every 5 s when the tab is visible; use a slight backoff on hidden tabs
setInterval(() => { if (room && !document.hidden) loadFeed({ quiet: true }); }, 5000);
setInterval(() => { if (posts.some(post => post.expiresAt && post.expiresAt <= Date.now())) renderFeed(); }, 1000);

let convertLoader;
function loadConvertModule() {
  if (!convertLoader) convertLoader = import("/convert.js").catch(error => {
    convertLoader = undefined;
    throw error;
  });
  return convertLoader;
}

function fileList(parent, attachments, path, largeImages = false) {
  const list = node("ul", undefined, "attachment-list");
  attachments.forEach((file, index) => {
    const row = node("li");
    const resource = path + "/files/" + index;
    if (imageType.test(file.type)) {
      const image = node("img");
      image.alt = largeImages ? file.name : "";
      image.src = resource + "?preview";
      image.loading = "lazy";
      if (largeImages && index === 0) {
        image.className = "detail-image";
        parent.append(image);
      } else row.append(image);
    }
    if (/^(audio|video)\//.test(file.type) && path.startsWith("/api/rooms/")) {
      const player = node(file.type.startsWith("audio/") ? "audio" : "video", undefined, "room-media");
      player.controls = true;
      player.preload = "metadata";
      player.src = resource + "?stream";
      parent.append(player);
    }
    const download = node("a", "Download");
    download.href = resource;
    download.download = file.name;
    download.setAttribute("aria-label", "Download " + file.name);
    const convertBox = node("div", undefined, "convert-controls");
    loadConvertModule().then(({ getConversionTargets, convertBlob }) => {
      const targets = getConversionTargets(file);
      if (!targets.length) return;
      const select = node("select");
      select.setAttribute("aria-label", "Convert " + file.name + " to");
      for (const t of targets) {
        const opt = node("option", t.label);
        opt.value = t.id;
        select.append(opt);
      }
      const btn = action("Convert", async () => {
        btn.disabled = true;
        select.disabled = true;
        const prevLabel = btn.textContent;
        btn.textContent = "Converting…";
        try {
          const response = await fetch(resource);
          if (!response.ok) throw new Error("Could not fetch file.");
          const blob = await response.blob();
          const result = await convertBlob(blob, file, select.value);
          downloadBlob(result.blob, result.filename);
          notify("Converted to " + result.filename);
        } catch (error) {
          notify(error.message || "Could not convert this file.");
        } finally {
          btn.disabled = false;
          select.disabled = false;
          btn.textContent = prevLabel;
        }
      }, "button secondary");
      convertBox.append(select, btn);
    }).catch(() => {});
    const partMatch = file.name.match(/^(.*?)\.part(\d+)$/);
    if (partMatch) {
      const baseName = partMatch[1];
      const downloadAll = action("Download complete " + baseName, async () => {
        downloadAll.disabled = true;
        const prevText = downloadAll.textContent;
        try {
          const related = posts.filter(p => p.summary && p.summary.startsWith(baseName + ".part"));
          related.sort((a, b) => {
            const na = parseInt(a.summary.match(/\.part(\d+)/)?.[1] || "0", 10);
            const nb = parseInt(b.summary.match(/\.part(\d+)/)?.[1] || "0", 10);
            return na - nb;
          });
          const chunks = [];
          for (let pi = 0; pi < related.length; pi++) {
            downloadAll.textContent = `Downloading part ${pi + 1}/${related.length}…`;
            const pPath = feedPath(room, related[pi]) + "/files/0";
            const pRes = await fetch(pPath);
            if (!pRes.ok) throw new Error("Could not download part " + (pi + 1));
            chunks.push(await pRes.blob());
          }
          downloadBlob(new Blob(chunks, { type: "application/zip" }), baseName);
          notify("Downloaded " + baseName);
        } catch (err) {
          notify(err.message || "Could not download all parts.");
        } finally {
          downloadAll.disabled = false;
          downloadAll.textContent = prevText;
        }
      }, "button primary");
      row.append(node("span", file.name), downloadAll, convertBox, download);
    } else {
      row.append(node("span", file.name), convertBox, download);
    }
    list.append(row);
  });
  parent.append(list);
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = node("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function addTextTools(body, value, detectPayload) {
  const output = node("pre", value, "reader");
  const controls = node("div", undefined, "post-content-actions");
  const payload = detectPayload(value);
  controls.append(action("Copy text", () => copy(output.textContent, "Text copied.")));
  if (payload.format === "code") controls.append(action("Download ." + payload.extension,
    () => downloadBlob(new Blob([payload.code], { type: "text/plain" }), "clip." + payload.extension)));
  if (payload.format === "json") controls.append(action("Format JSON", () => { output.textContent = payload.formatted; }));
  if (payload.format === "base64") controls.append(action("Decode Base64", () => {
    if (payload.decodedText) output.textContent = payload.decodedText;
    else downloadBlob(new Blob([payload.decoded]), "decoded.bin");
  }));
  body.append(output, controls);
}

function renderClaim(entry, item, container) {
  container.replaceChildren(node("p", item.own ? "This post is waiting for a recipient." : "Opening it removes the post for everyone."));
  if (item.own) {
    container.append(action("Delete post", async () => {
      if (!confirm("Delete this sensitive post?")) return;
      try {
        await deletePost(entry, item);
        postDialog.close();
        notify("Deleted.");
      } catch (error) {
        notify(error.message || "Could not delete.");
      }
    }, "button destructive"));
    return;
  }
  const button = action(item.count ? "Download and burn" : "Open and burn", async () => {
    button.disabled = true;
    try {
      const response = await roomRequest(entry, "posts/" + item.kind + "/" + item.id + "/claim", { method: "POST" });
      const content = item.count ? await response.blob() : await response.json();
      if (room !== entry || !postDialog.open) return;
      posts = posts.filter(post => post.id !== item.id);
      renderFeed();
      container.replaceChildren();
      if (item.count) {
        downloadBlob(content, item.filename ?? "attachment");
        container.append(node("p", "The download was delivered and the shared post was removed."));
      } else {
        container.append(node("pre", content.value, "reader"), action("Copy text", () => copy(content.value, "Text copied.")));
        revealTimeout = setTimeout(() => {
          if (postDialog.open) postDialog.close();
        }, 15000);
      }
    } catch (error) {
      if (room === entry && error.status === 410) setHome();
      else if (room === entry) container.replaceChildren(node("p", error.message, "message"));
    }
  }, "button primary");
  container.append(button);
}

async function openPost(entry, item) {
  postLookup?.abort();
  const controller = new AbortController();
  postLookup = controller;
  const body = byId("detail-body");
  byId("detail-title").textContent = labels[item.kind] + " post";
  message(byId("detail-status"));
  body.replaceChildren(node("p", "Loading post…"));
  postDialog.showModal();
  if (item.expiresAt) return renderClaim(entry, item, body);
  const path = feedPath(entry, item);
  try {
    const post = await api(path, { signal: controller.signal });
    if (controller.signal.aborted) return;
    body.replaceChildren(node("p", dateFormat.format(new Date(post.createdAt))));
    if (post.kind === "text") {
      try {
        const { detectPayload } = await import("/tools.js");
        if (!controller.signal.aborted) addTextTools(body, post.value, detectPayload);
      } catch {
        if (!controller.signal.aborted) body.append(node("pre", post.value, "reader"),
          action("Copy text", () => copy(post.value, "Text copied.")));
      }
    } else if (post.kind === "links") {
      const link = node("a", post.value, "external-link");
      link.href = post.value;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      body.append(link);
    } else fileList(body, post.attachments, path, post.kind === "images");

    const actions = node("div", undefined, "dialog-actions");
    const deleteBtn = action("Delete " + (item.kind === "files" ? "file" : item.kind === "images" ? "image" : "post"), async () => {
      const typeLabel = item.kind === "files" ? "file" : item.kind === "images" ? "image" : "post";
      if (!confirm(`Are you sure you want to delete this ${typeLabel}?`)) return;
      deleteBtn.disabled = true;
      deleteBtn.textContent = "Deleting…";
      try {
        await deletePost(entry, item);
        postDialog.close();
        notify("Deleted successfully.");
      } catch (error) {
        notify(error.message || "Could not delete.");
        deleteBtn.disabled = false;
        deleteBtn.textContent = "Delete " + typeLabel;
      }
    }, "button destructive");
    actions.append(deleteBtn);
    body.append(actions);
  } catch (error) {
    if (!controller.signal.aborted) body.replaceChildren(node("p", error.message, "message"));
  }
}
postDialog.addEventListener("close", () => {
  postLookup?.abort();
  clearTimeout(revealTimeout);
  byId("detail-body").replaceChildren();
});

function renderOldClip(clip) {
  room = null;
  feedRequest?.abort();
  showView("clip");
  const target = byId("old-content");
  target.replaceChildren(node("p", clip.code + " · Expires " + dateFormat.format(new Date(clip.expiresAt))));
  if (clip.text) target.append(node("pre", clip.text, "reader"), action("Copy text", () => copy(clip.text, "Text copied.")));
  if (clip.attachments.length) fileList(target, clip.attachments, "/api/clips/" + clip.code);
  document.title = "Shared clip · Clipdrop";
  byId("old-title").focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

byId("clear-room")?.addEventListener("click", async () => {
  if (!room) return;
  if (!confirm("Clear all posts in this room? This cannot be undone.")) return;
  const btn = byId("clear-room");
  btn.disabled = true;
  try {
    const res = await roomRequest(room, "reset", { method: "POST" });
    const data = await res.json();
    if (data.generation) room.generation = data.generation;
    posts = [];
    nextPage = null;
    deletedPostIds.clear();
    renderFeed();
    notify("Room cleared.");
  } catch (err) {
    notify(err.message || "Could not clear room.");
  } finally {
    btn.disabled = false;
  }
});

updateComposer();
route();
