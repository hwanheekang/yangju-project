# Application Gateway Health Probe 생성 PowerShell 스크립트
param(
    [string]$ResourceGroup = "rg-bcd00",
    [string]$AGWName = "agw-bcd00"
)

Write-Host "🔍 Application Gateway Health Probe 설정 중..." -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup"
Write-Host "Application Gateway: $AGWName"

# Application Gateway 존재 확인
try {
    $agw = az network application-gateway show --resource-group $ResourceGroup --name $AGWName 2>$null | ConvertFrom-Json
    if (!$agw) {
        Write-Host "❌ Application Gateway '$AGWName'를 찾을 수 없습니다." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Application Gateway 발견됨" -ForegroundColor Green
}
catch {
    Write-Host "❌ Application Gateway 확인 중 오류 발생: $_" -ForegroundColor Red
    exit 1
}

# Backend Address Pool 확인
try {
    $backendPools = az network application-gateway address-pool list --resource-group $ResourceGroup --gateway-name $AGWName --query "[].name" -o tsv
    Write-Host "기존 Backend Pools: $backendPools"
}
catch {
    Write-Host "⚠️ Backend Pool 정보 가져오기 실패: $_" -ForegroundColor Yellow
}

# Backend HTTP Settings 확인
try {
    $httpSettings = az network application-gateway http-settings list --resource-group $ResourceGroup --gateway-name $AGWName --query "[].name" -o tsv
    Write-Host "기존 HTTP Settings: $httpSettings"
}
catch {
    Write-Host "⚠️ HTTP Settings 정보 가져오기 실패: $_" -ForegroundColor Yellow
}

# Health Probe 생성 또는 업데이트
Write-Host "🏥 Health Probe 생성 중..." -ForegroundColor Cyan

# Frontend Health Probe (포트 80)
try {
    az network application-gateway probe create `
        --resource-group $ResourceGroup `
        --gateway-name $AGWName `
        --name "frontend-health-probe" `
        --protocol "Http" `
        --host-name-from-http-settings true `
        --path "/health" `
        --interval 30 `
        --timeout 10 `
        --threshold 3 `
        --match-status-codes "200-399" `
        --output none 2>$null
    Write-Host "✅ Frontend health probe 생성됨" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Frontend health probe already exists or creation failed" -ForegroundColor Yellow
}

# Backend Health Probe (포트 4000)
try {
    az network application-gateway probe create `
        --resource-group $ResourceGroup `
        --gateway-name $AGWName `
        --name "backend-health-probe" `
        --protocol "Http" `
        --host-name-from-http-settings true `
        --path "/health" `
        --interval 30 `
        --timeout 10 `
        --threshold 3 `
        --match-status-codes "200-399" `
        --output none 2>$null
    Write-Host "✅ Backend health probe 생성됨" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Backend health probe already exists or creation failed" -ForegroundColor Yellow
}

Write-Host "✅ Health Probes 생성 완료" -ForegroundColor Green

# HTTP Settings에 Health Probe 연결
Write-Host "🔗 HTTP Settings에 Health Probe 연결 중..." -ForegroundColor Cyan

# 기본 HTTP Settings 확인 및 업데이트
$httpSettingsList = ($httpSettings -split "`n") | Where-Object { $_ -ne "" }
foreach ($setting in $httpSettingsList) {
    if ($setting -like "*backend*" -or $setting -like "*default*") {
        try {
            Write-Host "HTTP Settings '$setting'에 backend health probe 적용..."
            az network application-gateway http-settings update `
                --resource-group $ResourceGroup `
                --gateway-name $AGWName `
                --name $setting `
                --probe "backend-health-probe" `
                --output none 2>$null
            Write-Host "✅ '$setting' HTTP settings updated with backend health probe" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️ '$setting' HTTP settings update failed: $_" -ForegroundColor Yellow
        }
    }
    elseif ($setting -like "*frontend*") {
        try {
            Write-Host "HTTP Settings '$setting'에 frontend health probe 적용..."
            az network application-gateway http-settings update `
                --resource-group $ResourceGroup `
                --gateway-name $AGWName `
                --name $setting `
                --probe "frontend-health-probe" `
                --output none 2>$null
            Write-Host "✅ '$setting' HTTP settings updated with frontend health probe" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️ '$setting' HTTP settings update failed: $_" -ForegroundColor Yellow
        }
    }
}

# Application Gateway 상태 확인
Write-Host "🔍 Application Gateway 상태 확인..." -ForegroundColor Cyan
try {
    az network application-gateway show `
        --resource-group $ResourceGroup `
        --name $AGWName `
        --query "{name:name, provisioningState:provisioningState, operationalState:operationalState}" `
        -o table
}
catch {
    Write-Host "⚠️ Application Gateway 상태 확인 실패: $_" -ForegroundColor Yellow
}

# Health Probes 목록 출력
Write-Host "🏥 설정된 Health Probes:" -ForegroundColor Cyan
try {
    az network application-gateway probe list `
        --resource-group $ResourceGroup `
        --gateway-name $AGWName `
        --query "[].{Name:name, Protocol:protocol, Path:path, Interval:intervalInSeconds, Timeout:timeoutInSeconds}" `
        -o table
}
catch {
    Write-Host "⚠️ Health Probes 목록 가져오기 실패: $_" -ForegroundColor Yellow
}

Write-Host "✅ Application Gateway Health Probe 설정 완료!" -ForegroundColor Green
