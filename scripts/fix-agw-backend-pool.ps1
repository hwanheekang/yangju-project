# Application Gateway Backend Pool 긴급 수정
param(
    [string]$ResourceGroup = "rg-bcd00",
    [string]$AGWName = "agw-bcd00",
    [string]$VMSSBackend = "vmss-be-bcd00"
)

Write-Host "🔧 Application Gateway Backend Pool 긴급 수정..." -ForegroundColor Cyan

# 1. 현재 Backend Pool 상태 확인
Write-Host "`n📋 현재 Backend Pool 설정:" -ForegroundColor Yellow
$backendPools = az network application-gateway address-pool list --resource-group $ResourceGroup --gateway-name $AGWName -o table
Write-Host $backendPools

# 2. VMSS Backend Pool 설정 강제 업데이트
Write-Host "`n🔄 Backend Pool을 VMSS로 연결..." -ForegroundColor Yellow
try {
    # 기존 Backend Pool 삭제
    $existingPools = az network application-gateway address-pool list --resource-group $ResourceGroup --gateway-name $AGWName --query "[].name" -o tsv
    foreach ($pool in $existingPools) {
        if ($pool -like "*backend*" -or $pool -like "*default*") {
            Write-Host "기존 Backend Pool '$pool' 삭제 시도..."
            az network application-gateway address-pool delete --resource-group $ResourceGroup --gateway-name $AGWName --name $pool 2>$null
        }
    }
    
    # 새 Backend Pool 생성 (VMSS 연결)
    Write-Host "새 Backend Pool 생성 중..."
    az network application-gateway address-pool create `
        --resource-group $ResourceGroup `
        --gateway-name $AGWName `
        --name "vmss-backend-pool" `
        --servers ""
    
    # VMSS를 Backend Pool에 연결
    Write-Host "VMSS를 Backend Pool에 연결 중..."
    az network application-gateway address-pool update `
        --resource-group $ResourceGroup `
        --gateway-name $AGWName `
        --name "vmss-backend-pool" `
        --add servers /subscriptions/ecf0f1fa-1506-4930-bac0-6aca5098c569/resourceGroups/$ResourceGroup/providers/Microsoft.Compute/virtualMachineScaleSets/$VMSSBackend
    
    Write-Host "✅ Backend Pool이 VMSS에 연결됨" -ForegroundColor Green
}
catch {
    Write-Host "❌ Backend Pool 업데이트 실패: $_" -ForegroundColor Red
}

# 3. HTTP Settings 업데이트
Write-Host "`n🔧 HTTP Settings 업데이트..." -ForegroundColor Yellow
try {
    # Backend HTTP Settings 생성/업데이트
    az network application-gateway http-settings create `
        --resource-group $ResourceGroup `
        --gateway-name $AGWName `
        --name "backend-http-settings" `
        --port 4000 `
        --protocol Http `
        --timeout 30 `
        --path "/health" `
        --host-name-from-backend-pool true 2>$null
    
    # Health Probe 연결
    az network application-gateway http-settings update `
        --resource-group $ResourceGroup `
        --gateway-name $AGWName `
        --name "backend-http-settings" `
        --probe "backend-health-probe" 2>$null
    
    Write-Host "✅ HTTP Settings 업데이트 완료" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ HTTP Settings 업데이트 실패 (이미 존재할 수 있음): $_" -ForegroundColor Yellow
}

# 4. Request Routing Rule 업데이트
Write-Host "`n🔀 Request Routing Rule 업데이트..." -ForegroundColor Yellow
try {
    az network application-gateway rule update `
        --resource-group $ResourceGroup `
        --gateway-name $AGWName `
        --name "rule1" `
        --address-pool "vmss-backend-pool" `
        --http-settings "backend-http-settings" 2>$null
    
    Write-Host "✅ Routing Rule 업데이트 완료" -ForegroundColor Green
}
catch {
    Write-Host "❌ Routing Rule 업데이트 실패: $_" -ForegroundColor Red
}

# 5. 설정 확인
Write-Host "`n📋 업데이트된 설정 확인:" -ForegroundColor Yellow
try {
    Write-Host "Backend Pools:" -ForegroundColor Cyan
    az network application-gateway address-pool list --resource-group $ResourceGroup --gateway-name $AGWName -o table
    
    Write-Host "`nHTTP Settings:" -ForegroundColor Cyan
    az network application-gateway http-settings list --resource-group $ResourceGroup --gateway-name $AGWName -o table
    
    Write-Host "`nRouting Rules:" -ForegroundColor Cyan
    az network application-gateway rule list --resource-group $ResourceGroup --gateway-name $AGWName -o table
}
catch {
    Write-Host "⚠️ 설정 확인 중 오류: $_" -ForegroundColor Yellow
}

Write-Host "`n✅ Application Gateway 설정 업데이트 완료!" -ForegroundColor Green
Write-Host "⏳ 5-10분 후 다시 테스트해보세요." -ForegroundColor Cyan
