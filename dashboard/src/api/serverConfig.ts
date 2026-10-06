/**
 * 运行时服务器地址配置 — 仅在 Capacitor / 移动端 App 环境中生效。
 *
 * 浏览器 / PWA 环境中 Octop 前后端同源，base URL 为空字符串。
 * Capacitor App 中 WebView 加载本地文件，必须让用户配置 Octop 服务器地址。
 */

const SERVER_URL_KEY = "octop:mobile:server_url";
const SERVER_HISTORY_KEY = "octop:mobile:server_history";
const MAX_HISTORY = 5;

export interface ServerRecord {
  url: string;
  label?: string;
  lastUsedAt: number;
}

/**
 * 检测是否运行在 Capacitor 原生 App 环境中。
 * Capacitor 会在 WebView 中注入 window.Capacitor 对象。
 */
export function isCapacitorApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform) {
    try {
      return w.Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }
  // 兜底：检测 userAgent 中的 Capacitor 标识
  return /Capacitor/i.test(navigator.userAgent || "");
}

/** 校验服务器地址格式，返回规范化后的地址（去除末尾斜杠）。 */
export function normalizeServerUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // 只保留 protocol://host:port，去除路径
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** 获取当前配置的服务器 base URL。浏览器环境返回空字符串（同源）。 */
export function getServerBaseUrl(): string {
  if (!isCapacitorApp()) return "";
  try {
    return localStorage.getItem(SERVER_URL_KEY) || "";
  } catch {
    return "";
  }
}

/** 设置当前服务器地址，并加入历史记录。 */
export function setServerBaseUrl(url: string): void {
  const normalized = normalizeServerUrl(url);
  if (!normalized) return;
  try {
    localStorage.setItem(SERVER_URL_KEY, normalized);
    // 更新历史记录
    const history = getServerHistory();
    const filtered = history.filter((r) => r.url !== normalized);
    filtered.unshift({ url: normalized, lastUsedAt: Date.now() });
    const trimmed = filtered.slice(0, MAX_HISTORY);
    localStorage.setItem(SERVER_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

/** 清除当前服务器配置（登出/切换服务器时用）。 */
export function clearServerBaseUrl(): void {
  try {
    localStorage.removeItem(SERVER_URL_KEY);
  } catch {
    /* ignore */
  }
}

/** 获取服务器历史记录列表。 */
export function getServerHistory(): ServerRecord[] {
  try {
    const raw = localStorage.getItem(SERVER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is ServerRecord =>
        r && typeof r.url === "string" && typeof r.lastUsedAt === "number",
    );
  } catch {
    return [];
  }
}

/** 从历史记录中删除一条。 */
export function removeServerFromHistory(url: string): void {
  try {
    const history = getServerHistory().filter((r) => r.url !== url);
    localStorage.setItem(SERVER_HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* ignore */
  }
}

/**
 * 测试服务器是否可达。
 * 调用 /api/health 端点，返回是否成功及延迟。
 */
export async function testServerConnection(
  url: string,
): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const normalized = normalizeServerUrl(url);
  if (!normalized) {
    return { ok: false, error: "无效的服务器地址格式" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const start = performance.now();
  try {
    const res = await fetch(`${normalized}/api/health`, {
      method: "GET",
      signal: controller.signal,
      // 不携带 cookie，避免跨域问题
      credentials: "omit",
    });
    const latency = Math.round(performance.now() - start);
    if (res.ok) {
      return { ok: true, latencyMs: latency };
    }
    return { ok: false, latencyMs: latency, error: `服务器返回 ${res.status}` };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, latencyMs: latency, error: "连接超时（8秒）" };
    }
    return {
      ok: false,
      latencyMs: latency,
      error: err instanceof Error ? err.message : "网络连接失败",
    };
  } finally {
    clearTimeout(timeout);
  }
}
