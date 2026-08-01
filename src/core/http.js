/**
 * @file http.js
 * @description HTTP client wrapper untuk digunakan di dalam ekstensi Lembar.
 *
 * Dirancang agar kompatibel dengan:
 *   - Node.js (native fetch, v18+)
 *   - QuickJS / JS Runtime di lingkungan Android (dengan polyfill `fetch` dari aplikasi)
 *
 * Semua fungsi mengembalikan Promise. Error jaringan dan non-2xx status
 * akan melempar Exception dengan pesan yang informatif.
 */

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_TIMEOUT_MS = 15000; // 15 detik

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id,en;q=0.9',
};

// ============================================================================
// CORE HTTP FUNCTIONS
// ============================================================================

/**
 * Melakukan HTTP GET request dan mengembalikan teks body response.
 *
 * @param {string} url - URL tujuan.
 * @param {Record<string, string>} [headers={}] - Header tambahan.
 * @param {number} [timeoutMs] - Timeout dalam milidetik (default: 15000).
 * @returns {Promise<string>} Body response sebagai teks.
 * @throws {Error} Jika request gagal atau status bukan 2xx.
 */
export async function getText(url, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await _fetch(url, { method: 'GET', headers: { ...DEFAULT_HEADERS, ...headers } }, timeoutMs);
  return response.text();
}

/**
 * Melakukan HTTP GET request dan mengembalikan body response sebagai JSON.
 *
 * @param {string} url - URL tujuan.
 * @param {Record<string, string>} [headers={}] - Header tambahan.
 * @param {number} [timeoutMs] - Timeout dalam milidetik.
 * @returns {Promise<any>} Body response yang telah di-parse sebagai JSON.
 * @throws {Error} Jika request gagal, status bukan 2xx, atau body bukan JSON valid.
 */
export async function getJson(url, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await _fetch(
    url,
    {
      method: 'GET',
      headers: { ...DEFAULT_HEADERS, 'Accept': 'application/json', ...headers },
    },
    timeoutMs
  );
  return response.json();
}

/**
 * Melakukan HTTP POST request dengan body JSON.
 *
 * @param {string} url - URL tujuan.
 * @param {object} body - Data yang akan dikirim sebagai JSON.
 * @param {Record<string, string>} [headers={}] - Header tambahan.
 * @param {number} [timeoutMs] - Timeout dalam milidetik.
 * @returns {Promise<any>} Body response yang telah di-parse sebagai JSON.
 * @throws {Error} Jika request gagal atau status bukan 2xx.
 */
export async function postJson(url, body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await _fetch(
    url,
    {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    },
    timeoutMs
  );
  return response.json();
}

/**
 * Melakukan HTTP POST request dengan body form-urlencoded.
 *
 * @param {string} url - URL tujuan.
 * @param {Record<string, string>} formData - Data form yang akan dikirim.
 * @param {Record<string, string>} [headers={}] - Header tambahan.
 * @param {number} [timeoutMs] - Timeout dalam milidetik.
 * @returns {Promise<string>} Body response sebagai teks.
 */
export async function postForm(url, formData, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const body = new URLSearchParams(formData).toString();
  const response = await _fetch(
    url,
    {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers,
      },
      body,
    },
    timeoutMs
  );
  return response.text();
}

// ============================================================================
// INTERNAL HELPER
// ============================================================================

/**
 * Wrapper internal fetch dengan dukungan timeout dan validasi status.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 * @private
 */
async function _fetch(url, options, timeoutMs) {
  // Jika berjalan di QuickJS Android dan fetch tidak tersedia, gunakan NetworkBridge
  if (typeof fetch === 'undefined' && typeof NetworkBridge !== 'undefined') {
    if (options.method === 'GET') {
      const responseText = NetworkBridge.get(url);
      return {
        ok: true,
        text: async () => responseText,
        json: async () => JSON.parse(responseText),
      };
    } else {
      throw new Error(`NetworkBridge saat ini hanya mendukung GET. Request POST ke ${url} gagal.`);
    }
  }

  // Fallback ke fetch bawaan Node.js / Browser
  if (typeof fetch === 'undefined') {
    throw new Error('fetch atau NetworkBridge tidak ditemukan di JS Engine!');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`HTTP Request timeout setelah ${timeoutMs}ms: ${url}`);
    }
    throw new Error(`HTTP Request gagal untuk "${url}": ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status} (${response.statusText}) untuk URL: ${url}`);
  }

  return response;
}

/**
 * Membangun query string dari sebuah object.
 *
 * @param {Record<string, string | number | boolean>} params
 * @returns {string} Query string (tanpa leading `?`).
 *
 * @example
 * buildQueryString({ q: "one piece", page: 1 }) // => "q=one+piece&page=1"
 */
export function buildQueryString(params) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)])
    )
  ).toString();
}

/**
 * Menggabungkan base URL dengan path, menghindari double-slash.
 *
 * @param {string} base - URL dasar (misal: "https://example.com").
 * @param {string} path - Path yang akan digabungkan (misal: "/manga/1").
 * @returns {string} URL lengkap.
 *
 * @example
 * joinUrl("https://example.com/", "/manga/1") // => "https://example.com/manga/1"
 */
export function joinUrl(base, path) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
