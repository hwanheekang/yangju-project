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

  // 응답이 성공적이지 않을 경우 에러 처리 (상태코드 포함)
  if (!response.ok) {
    let errorData = { message: '', details: '' };
    try {
      errorData = await response.json();
    } catch (_){
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
