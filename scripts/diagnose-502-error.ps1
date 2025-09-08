# 502 Bad Gateway 문제 긴급 진단 스크립트
param(
    [string]$ResourceGroup = "rg-bcd00",
    [string]$AGWName = "agw-bcd00",
    [string]$VMSSBackend = "vmss-be-bcd00",
    [string]$VMSSFrontend = "vmss-fe-bcd00"
)

Write-Host "🚨 502 Bad Gateway 긴급 진단 시작..." -ForegroundColor Red
Write-Host "시간: $(Get-Date)" -ForegroundColor Cyan

# 1. Application Gateway 상태 확인
Write-Host "`n🔍 1. Application Gateway 상태 확인" -ForegroundColor Yellow
try {
    $agwStatus = az network application-gateway show --resource-group $ResourceGroup --name $AGWName --query "{name:name, provisioningState:provisioningState, operationalState:operationalState}" -o json | ConvertFrom-Json
    Write-Host "AGW 이름: $($agwStatus.name)" -ForegroundColor Green
    Write-Host "프로비저닝 상태: $($agwStatus.provisioningState)" -ForegroundColor Green
    Write-Host "운영 상태: $($agwStatus.operationalState)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Application Gateway 정보 가져오기 실패: $_" -ForegroundColor Red
}

# 2. Backend Pool 상태 확인
Write-Host "`n🏥 2. Backend Pool Health 상태 확인" -ForegroundColor Yellow
try {
    $backendHealth = az network application-gateway show-backend-health --resource-group $ResourceGroup --name $AGWName -o json | ConvertFrom-Json
    foreach ($pool in $backendHealth.backendAddressPools) {
        Write-Host "Backend Pool: $($pool.name)" -ForegroundColor Cyan
        foreach ($backend in $pool.backendHttpSettingsCollection) {
            Write-Host "  HTTP Settings: $($backend.name)" -ForegroundColor White
            foreach ($server in $backend.servers) {
                $healthColor = if ($server.health -eq "Healthy") { "Green" } else { "Red" }
                Write-Host "    서버: $($server.address) - 상태: $($server.health)" -ForegroundColor $healthColor
                if ($server.health -ne "Healthy") {
                    Write-Host "      ❌ 오류: $($server.healthProbeLog)" -ForegroundColor Red
                }
            }
        }
    }
}
catch {
    Write-Host "❌ Backend Health 정보 가져오기 실패: $_" -ForegroundColor Red
}

# 3. VMSS Backend 인스턴스 상태 확인
Write-Host "`n🖥️ 3. Backend VMSS 인스턴스 상태 확인" -ForegroundColor Yellow
try {
    $vmssInstances = az vmss list-instances --resource-group $ResourceGroup --name $VMSSBackend --query "[].{InstanceId:instanceId, ProvisioningState:provisioningState, PowerState:powerState}" -o json | ConvertFrom-Json
    foreach ($instance in $vmssInstances) {
        Write-Host "인스턴스 ID: $($instance.InstanceId) - 프로비저닝: $($instance.ProvisioningState) - 전원: $($instance.PowerState)" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Backend VMSS 인스턴스 정보 가져오기 실패: $_" -ForegroundColor Red
}

# 4. Backend 서비스 Health Check 테스트
Write-Host "`n🏃 4. Backend 서비스 직접 테스트" -ForegroundColor Yellow
if ($vmssInstances -and $vmssInstances.Count -gt 0) {
    $firstInstanceId = $vmssInstances[0].InstanceId
    Write-Host "첫 번째 인스턴스 ($firstInstanceId)에서 헬스체크 테스트..." -ForegroundColor Cyan
    
    try {
        $healthTestResult = az vmss run-command invoke `
            --resource-group $ResourceGroup `
            --name $VMSSBackend `
            --instance-id $firstInstanceId `
            --command-id RunShellScript `
            --scripts "
                echo '=== 서비스 상태 확인 ==='
                sudo systemctl status yangju.service --no-pager || echo 'Yangju service not found'
                
                echo '=== Docker 컨테이너 상태 ==='
                sudo docker ps -a | grep yangju || echo 'No yangju containers found'
                
                echo '=== 포트 4000 리스닝 확인 ==='
                sudo netstat -tlnp | grep :4000 || echo 'Port 4000 not listening'
                
                echo '=== Health Endpoint 테스트 ==='
                curl -v http://localhost:4000/health 2>&1 || echo 'Health endpoint failed'
                
                echo '=== 최근 로그 확인 ==='
                sudo journalctl -u yangju.service -n 10 --no-pager || echo 'No service logs'
                sudo docker logs yangju-backend --tail 10 2>/dev/null || echo 'No container logs'
            " `
            --query 'value[].message' -o tsv
        
        Write-Host "테스트 결과:" -ForegroundColor Cyan
        Write-Host $healthTestResult -ForegroundColor White
    }
    catch {
        Write-Host "❌ Backend 서비스 테스트 실패: $_" -ForegroundColor Red
    }
}

# 5. Network Security Group 규칙 확인
Write-Host "`n🛡️ 5. NSG 규칙 확인" -ForegroundColor Yellow
try {
    $nsgRules = az network nsg rule list --resource-group $ResourceGroup --nsg-name "$VMSSBackend-nsg" --query "[].{Name:name, Direction:direction, Priority:priority, Access:access, Protocol:protocol, SourcePort:sourcePortRange, DestPort:destinationPortRange}" -o table
    Write-Host $nsgRules
}
catch {
    Write-Host "❌ NSG 규칙 정보 가져오기 실패: $_" -ForegroundColor Red
}

# 6. Load Balancer 상태 확인
Write-Host "`n⚖️ 6. Load Balancer 상태 확인" -ForegroundColor Yellow
try {
    $lbStatus = az network lb show --resource-group $ResourceGroup --name "nlb-bcd00" --query "{name:name, provisioningState:provisioningState}" -o json | ConvertFrom-Json
    Write-Host "Load Balancer: $($lbStatus.name) - 상태: $($lbStatus.provisioningState)" -ForegroundColor Green
    
    # Backend Pool 상태
    $lbBackendPools = az network lb address-pool list --resource-group $ResourceGroup --lb-name "nlb-bcd00" -o table
    Write-Host "Backend Pools:" -ForegroundColor Cyan
    Write-Host $lbBackendPools
}
catch {
    Write-Host "❌ Load Balancer 정보 가져오기 실패: $_" -ForegroundColor Red
}

# 7. Application Gateway Listener 및 Rules 확인
Write-Host "`n🔧 7. Application Gateway 설정 확인" -ForegroundColor Yellow
try {
    # Listeners
    $listeners = az network application-gateway http-listener list --resource-group $ResourceGroup --gateway-name $AGWName --query "[].{Name:name, Port:frontendPort, Protocol:protocol}" -o table
    Write-Host "HTTP Listeners:" -ForegroundColor Cyan
    Write-Host $listeners
    
    # Rules
    $rules = az network application-gateway rule list --resource-group $ResourceGroup --gateway-name $AGWName --query "[].{Name:name, Priority:priority}" -o table
    Write-Host "Request Routing Rules:" -ForegroundColor Cyan
    Write-Host $rules
    
    # HTTP Settings
    $httpSettings = az network application-gateway http-settings list --resource-group $ResourceGroup --gateway-name $AGWName --query "[].{Name:name, Port:port, Protocol:protocol, Probe:probe.id}" -o table
    Write-Host "HTTP Settings:" -ForegroundColor Cyan
    Write-Host $httpSettings
}
catch {
    Write-Host "❌ Application Gateway 설정 정보 가져오기 실패: $_" -ForegroundColor Red
}

Write-Host "`n🏁 진단 완료. 위 정보를 바탕으로 문제를 분석해주세요." -ForegroundColor Green
Write-Host "시간: $(Get-Date)" -ForegroundColor Cyan
