/**
 * localStorage에서 JWT 토큰을 가져오는 함수
 * @returns {string|null} 저장된 토큰 또는 null
 */
const getToken = () => localStorage.getItem('jwtToken');

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

  // Vite 프록시가 기본 URL('http://localhost:4000')을 처리해줍니다.
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  // 응답이 성공적이지 않을 경우 에러 처리
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: '알 수 없는 에러가 발생했습니다.' }));
    throw new Error(errorData.message || `HTTP 에러! 상태: ${response.status}`);
  }

  // 응답 내용이 없는 경우 (e.g., 204 No Content)
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
};

export default apiFetch;
