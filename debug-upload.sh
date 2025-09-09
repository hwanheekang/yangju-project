#!/bin/bash

echo "=== 413 Error Debugging Script ==="
echo "Current date: $(date)"
echo ""

# 1. 백엔드 컨테이너 상태 확인
echo "1. Backend container status:"
sudo docker ps | grep yangju-backend
echo ""

# 2. 백엔드 컨테이너 로그 확인 (최근 50줄)
echo "2. Backend container logs (last 50 lines):"
sudo docker logs yangju-backend --tail 50
echo ""

# 3. nginx 설정 확인 (컨테이너 내부)
echo "3. Backend container nginx config:"
sudo docker exec yangju-backend cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo "nginx config not found"
echo ""

# 4. 백엔드 내부 포트 확인
echo "4. Backend internal ports:"
sudo docker exec yangju-backend netstat -tlnp 2>/dev/null || echo "netstat not available"
echo ""

# 5. Express.js 설정 확인 (프로세스)
echo "5. Backend processes:"
sudo docker exec yangju-backend ps aux 2>/dev/null || echo "ps not available"
echo ""

# 6. 환경변수 확인
echo "6. Backend environment variables (filtered):"
sudo docker exec yangju-backend printenv | grep -E "(PORT|NODE_ENV|CORS)" 2>/dev/null || echo "env vars not accessible"
echo ""

# 7. 테스트용 작은 업로드 시도
echo "7. Test small upload to backend directly:"
curl -X POST -F "image=@/dev/null" http://localhost:4000/api/upload-image -v 2>&1 | head -20
echo ""

# 8. 백엔드 헬스체크
echo "8. Backend health check:"
curl -s http://localhost:4000/health | jq . 2>/dev/null || curl -s http://localhost:4000/health
echo ""

echo "=== End of debugging ==="
