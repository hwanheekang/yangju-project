import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 백엔드와 통신을 위한 프록시 설정을 추가합니다.
  server: {
    proxy: {
      // '/api'로 시작하는 모든 요청을 아래 target 주소로 전달합니다.
      '/api': {
      target: 'http://localhost:4000,https://webapp-be-bcd00.azurewebsites.net',
      changeOrigin: true,
      secure: false,
      },
    },
  },
})

