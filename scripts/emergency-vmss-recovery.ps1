# Backend VMSS 서비스 강제 복구 스크립트
param(
    [string]$ResourceGroup = "rg-bcd00",
    [string]$VMSSBackend = "vmss-be-bcd00"
)

Write-Host "🚑 Backend VMSS 서비스 강제 복구 시작..." -ForegroundColor Red

# 모든 인스턴스 ID 가져오기
$instanceIds = az vmss list-instances --resource-group $ResourceGroup --name $VMSSBackend --query "[].instanceId" -o tsv

foreach ($instanceId in $instanceIds) {
    Write-Host "`n🔧 인스턴스 $instanceId 복구 중..." -ForegroundColor Yellow
    
    $result = az vmss run-command invoke `
        --resource-group $ResourceGroup `
        --name $VMSSBackend `
        --instance-id $instanceId `
        --command-id RunShellScript `
        --scripts "
            set -e
            echo '=== 🚑 긴급 복구 시작 ==='
            echo '인스턴스 ID: $instanceId'
            echo '시간: \$(date)'
            
            # 1. 현재 상태 확인
            echo '=== 현재 서비스 상태 확인 ==='
            sudo systemctl status yangju.service --no-pager || echo 'Service not active'
            sudo docker ps -a | grep yangju || echo 'No yangju containers'
            
            # 2. 완전 정리
            echo '=== 서비스 완전 정리 ==='
            sudo systemctl stop yangju.service || true
            sudo docker stop yangju-backend || true
            sudo docker rm yangju-backend || true
            sudo docker system prune -f || true
            
            # 3. 디렉토리 확인 및 권한 설정
            echo '=== 디렉토리 및 권한 확인 ==='
            sudo mkdir -p /opt/yangju
            sudo chown -R bcdbeuser00:bcdbeuser00 /opt/yangju
            ls -la /opt/yangju/
            
            # 4. .env 파일 확인 및 재생성
            echo '=== .env 파일 확인 ==='
            if [ ! -f /opt/yangju/.env ]; then
                echo 'IMAGE_TAG=latest' | sudo tee /opt/yangju/.env
                echo 'NODE_ENV=production' | sudo tee -a /opt/yangju/.env
                echo 'PORT=4000' | sudo tee -a /opt/yangju/.env
                sudo chown bcdbeuser00:bcdbeuser00 /opt/yangju/.env
                echo '.env 파일 생성됨'
            fi
            cat /opt/yangju/.env
            
            # 5. Docker 네트워크 정리 및 재생성
            echo '=== Docker 네트워크 정리 ==='
            sudo docker network prune -f || true
            sudo docker network create yangju-net || echo 'Network already exists'
            
            # 6. ACR 재인증
            echo '=== ACR 재인증 ==='
            TOKEN=\$(curl -s -H 'Metadata:true' 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/' | jq -r .access_token 2>/dev/null)
            if [ -n \"\$TOKEN\" ] && [ \"\$TOKEN\" != \"null\" ]; then
                echo \"\$TOKEN\" | sudo docker login acrbcd00.azurecr.io --username 00000000-0000-0000-0000-000000000000 --password-stdin
                echo 'ACR 로그인 성공'
            else
                echo 'ACR 로그인 실패'
                exit 1
            fi
            
            # 7. 최신 이미지 강제 풀
            echo '=== 최신 이미지 강제 풀 ==='
            sudo docker pull acrbcd00.azurecr.io/backend:latest
            
            # 8. 서비스 재시작
            echo '=== 서비스 재시작 ==='
            sudo systemctl daemon-reload
            sudo systemctl enable yangju.service
            sudo systemctl start yangju.service
            
            # 9. 서비스 상태 확인
            echo '=== 서비스 시작 대기 ==='
            sleep 30
            
            sudo systemctl status yangju.service --no-pager
            sudo docker ps | grep yangju
            
            # 10. Health Check
            echo '=== Health Check ==='
            for i in {1..10}; do
                if curl -fsS http://localhost:4000/health; then
                    echo 'Health check 성공!'
                    break
                elif [ \$i -eq 10 ]; then
                    echo 'Health check 실패'
                    sudo docker logs yangju-backend --tail 20
                    sudo journalctl -u yangju.service -n 20 --no-pager
                    exit 1
                else
                    echo \"Health check 시도 \$i/10...\"
                    sleep 5
                fi
            done
            
            echo '=== 🎉 복구 완료 ==='
        " `
        --query 'value[].message' -o tsv
    
    Write-Host "인스턴스 $instanceId 결과:"
    Write-Host $result -ForegroundColor Green
    Write-Host "------------------------"
}

Write-Host "`n✅ 모든 인스턴스 복구 완료!" -ForegroundColor Green
