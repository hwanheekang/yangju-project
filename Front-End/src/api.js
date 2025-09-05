/**
 * localStorage에서 JWT 토큰을 가져오는 함수
 * @returns {string|null} 저장된 토큰 또는 null
 */
const getToken = () => localStorage.getItem('jwtToken');

/* =========================
   API Base URL Resolver
   ========================= */
const RUNTIME_CFG =
  (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

const {
  VITE_BACKEND_MODE,
  VITE_API_BASE,
  VITE_API_PORT,
  VITE_API_PREFIX = '/api',
} = import.meta.env || {};

const stripTrailingSlash = (s) =>
  typeof s === 'string' && s.endsWith('/') ? s.slice(0, -1) : s;

const joinPath = (base, path) => {
  const b = stripTrailingSlash(base ?? '');
  const p = path?.startsWith('/') ? path : `/${path ?? ''}`;
  return `${b}${p}`;
};

const pickApiBase = () => {
  // 1) 런타임 주입이 가장 우선
  if (RUNTIME_CFG.apiBase) return stripTrailingSlash(RUNTIME_CFG.apiBase);

  // 2) 절대 URL이 환경변수로 지정된 경우(Web App 등)
  if (VITE_API_BASE) return stripTrailingSlash(VITE_API_BASE);

  // 3) VMSS 모드: 현재 호스트 + 포트 + 프리픽스
  if (VITE_BACKEND_MODE === 'vmss' && VITE_API_PORT) {
    const origin = `${location.protocol}//${location.hostname}:${VITE_API_PORT}`;
    return joinPath(origin, VITE_API_PREFIX || '/api');
  }

  // 4) 기본: 같은 오리진의 /api (리버스 프록시 전제)
  return VITE_API_PREFIX || '/api';
};

/**
 * 백엔드 API에 요청을 보내는 범용 함수
 * @param {string} endpoint - '/auth/login'과 같이 /api 뒤에 붙는 경로
 * @param {object} options - fetch 함수에 전달할 옵션 (method, body 등)
 * @returns {Promise<any>} API 응답 데이터를 담은 Promise
 */
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 토큰이 존재하면 Authorization 헤더에 추가
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const base = pickApiBase();
  const url =
    base.startsWith('http') || base.startsWith('//')
      ? joinPath(base, endpoint) // 절대 URL
      : `${stripTrailingSlash(base)}${endpoint}`; // 상대(/api)

  // 개발 환경에서는 Vite 프록시가 /api를 처리합니다.
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 응답이 성공적이지 않을 경우 에러 처리 (상태코드 포함)
  if (!response.ok) {
    let errorData = { message: '', details: '' };
    try {
      errorData = await response.json();
  } catch {
      // 응답 본문이 JSON이 아닐 때 무시
    }
    const errorMsg = errorData.message || errorData.error || `HTTP 에러! 상태: ${response.status}`;
    // 상태코드와 DB 상세 메시지도 포함
    const details = errorData.details ? `\n상세: ${errorData.details}` : '';
    throw new Error(`${errorMsg} (HTTP ${response.status})${details}`);
  }

  // 응답 내용이 없는 경우 (e.g., 204 No Content)
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
};

export default apiFetch;
