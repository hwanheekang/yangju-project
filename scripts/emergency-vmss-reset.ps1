# 긴급 VMSS 재생성 및 배포 스크립트
param(
    [string]$ResourceGroup = "rg-bcd00",
    [string]$VMSSBackend = "vmss-be-bcd00"
)

Write-Host "🚨 긴급 VMSS 재생성 시작..." -ForegroundColor Red

# 1. 현재 VMSS 완전 삭제
Write-Host "🗑️ 기존 VMSS 삭제 중..." -ForegroundColor Yellow
try {
    az vmss delete --resource-group $ResourceGroup --name $VMSSBackend --force-deletion $true --no-wait
    Write-Host "✅ VMSS 삭제 명령 전송됨" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ VMSS 삭제 실패 또는 이미 삭제됨: $_" -ForegroundColor Yellow
}

# 2. 5분 대기
Write-Host "⏳ VMSS 삭제 완료 대기 (5분)..." -ForegroundColor Yellow
Start-Sleep -Seconds 300

# 3. GitHub Actions 워크플로우 트리거를 위한 정보 출력
Write-Host "`n🚀 GitHub Actions 수동 실행 필요!" -ForegroundColor Green
Write-Host "다음 단계를 수행하세요:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. GitHub 저장소로 이동: https://github.com/hwanheekang/yangju-project" -ForegroundColor White
Write-Host "2. Actions 탭 클릭" -ForegroundColor White
Write-Host "3. 'Deploy to Azure (VMSS + Web App)' 워크플로우 선택" -ForegroundColor White
Write-Host "4. 'Run workflow' 버튼 클릭" -ForegroundColor White
Write-Host "5. 다음 설정 사용:" -ForegroundColor White
Write-Host "   - deployment_target: vmss-only" -ForegroundColor Yellow
Write-Host "   - environment: dev" -ForegroundColor Yellow
Write-Host "   - image_tag: latest" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 이유: 수동 복구보다 GitHub Actions의 전체 워크플로우가 더 안정적입니다." -ForegroundColor Cyan

Write-Host "`n✅ 준비 완료!" -ForegroundColor Green
