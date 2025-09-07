
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite는 .env, .env.local, .env.production 등에서 VITE_ 접두어 환경변수를 자동으로 import.meta.env에 주입합니다.
  // 하지만 config 파일에서는 process.env 사용이 가능합니다.
  const target = process.env.VITE_API_URL || 'http://localhost:4000';
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

