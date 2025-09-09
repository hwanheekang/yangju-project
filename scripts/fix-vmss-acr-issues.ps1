# VMSS ACR 연결 문제 해결 명령어 모음
# PowerShell에서 실행 가능

# 1. 관리 ID 활성화 및 권한 부여
Write-Host "=== 1. 관리 ID 활성화 및 권한 부여 ===" -ForegroundColor Green

# 변수 설정 (실제 값으로 변경하세요)
$resourceGroup = "rg-bcd00"
$vmssName = "vmss-be-bcd00"
$acrName = "acrbcd00"
$subscriptionId = (az account show --query "id" -o tsv)

# VMSS 관리 ID 활성화
Write-Host "관리 ID 활성화 중..." -ForegroundColor Yellow
az vmss identity assign --resource-group $resourceGroup --name $vmssName

# Principal ID 획득
$principalId = az vmss show --resource-group $resourceGroup --name $vmssName --query "identity.principalId" -o tsv
Write-Host "Principal ID: $principalId" -ForegroundColor Cyan

# AcrPull 역할 할당
Write-Host "AcrPull 역할 할당 중..." -ForegroundColor Yellow
$acrScope = "/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.ContainerRegistry/registries/$acrName"
az role assignment create --assignee $principalId --role "AcrPull" --scope $acrScope

# 2. Key Vault 권한 추가
Write-Host "`n=== 2. Key Vault 권한 추가 ===" -ForegroundColor Green

# Key Vault 이름 확인
$kvName = az keyvault list --resource-group $resourceGroup --query "[0].name" -o tsv
if ($kvName) {
    Write-Host "Key Vault 이름: $kvName" -ForegroundColor Cyan
    
    # Key Vault 권한 부여
    az role assignment create --assignee $principalId --role "Key Vault Secrets User" --scope "/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.KeyVault/vaults/$kvName"
    
    # 액세스 정책 설정
    az keyvault set-policy --name $kvName --object-id $principalId --secret-permissions get list
    Write-Host "Key Vault 권한 설정 완료" -ForegroundColor Green
} else {
    Write-Host "Key Vault를 찾을 수 없습니다." -ForegroundColor Red
}

# 3. NSG 아웃바운드 규칙 확인 및 생성
Write-Host "`n=== 3. NSG 아웃바운드 규칙 확인 및 생성 ===" -ForegroundColor Green

$nsgName = "$vmssName-nsg"

# HTTPS 아웃바운드 규칙 생성
Write-Host "HTTPS 아웃바운드 규칙 생성 중..." -ForegroundColor Yellow
az network nsg rule create `
  --resource-group $resourceGroup `
  --nsg-name $nsgName `
  --name "Allow-HTTPS-Outbound" `
  --priority 100 `
  --source-address-prefixes "*" `
  --destination-address-prefixes "Internet" `
  --destination-port-ranges "443" `
  --access "Allow" `
  --protocol "Tcp" `
  --direction "Outbound"

# ACR 서비스 태그 규칙 생성
az network nsg rule create `
  --resource-group $resourceGroup `
  --nsg-name $nsgName `
  --name "Allow-Azure-Services" `
  --priority 110 `
  --source-address-prefixes "*" `
  --destination-address-prefixes "AzureContainerRegistry" `
  --destination-port-ranges "443" `
  --access "Allow" `
  --protocol "Tcp" `
  --direction "Outbound"

# Key Vault 서비스 태그 규칙 생성
az network nsg rule create `
  --resource-group $resourceGroup `
  --nsg-name $nsgName `
  --name "Allow-KeyVault-Access" `
  --priority 120 `
  --source-address-prefixes "*" `
  --destination-address-prefixes "AzureKeyVault" `
  --destination-port-ranges "443" `
  --access "Allow" `
  --protocol "Tcp" `
  --direction "Outbound"

Write-Host "NSG 규칙 생성 완료" -ForegroundColor Green

# 4. VMSS 인스턴스 진단 테스트
Write-Host "`n=== 4. VMSS 인스턴스 진단 테스트 ===" -ForegroundColor Green

# 첫 번째 인스턴스에서 테스트 실행
$instanceId = az vmss list-instances --resource-group $resourceGroup --name $vmssName --query "[0].instanceId" -o tsv

if ($instanceId) {
    Write-Host "인스턴스 $instanceId에서 진단 테스트 실행 중..." -ForegroundColor Yellow
    
    $testScript = @"
echo '=== VMSS 인스턴스 진단 테스트 ==='

# 1. 관리 ID 테스트
echo '1. 관리 ID 토큰 테스트'
MI_TOKEN=`$(curl -s -H 'Metadata:true' 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/' | jq -r .access_token 2>/dev/null || echo 'FAILED')
if [ "`$MI_TOKEN" != "FAILED" ] && [ -n "`$MI_TOKEN" ]; then
    echo '✅ 관리 ID 토큰 획득 성공'
else
    echo '❌ 관리 ID 토큰 획득 실패'
fi

# 2. ACR 연결 테스트
echo '2. ACR 연결 테스트'
if nslookup $acrName.azurecr.io >/dev/null 2>&1; then
    echo '✅ ACR DNS 해상도 성공'
else
    echo '❌ ACR DNS 해상도 실패'
fi

if curl -sSf https://$acrName.azurecr.io/v2/ >/dev/null 2>&1; then
    echo '✅ ACR HTTPS 연결 성공'
else
    echo '❌ ACR HTTPS 연결 실패'
fi

# 3. Docker 로그인 테스트
echo '3. Docker 로그인 테스트'
if [ "`$MI_TOKEN" != "FAILED" ]; then
    if echo "`$MI_TOKEN" | docker login $acrName.azurecr.io --username 00000000-0000-0000-0000-000000000000 --password-stdin >/dev/null 2>&1; then
        echo '✅ Docker 로그인 성공'
    else
        echo '❌ Docker 로그인 실패'
    fi
fi

echo '=== 진단 테스트 완료 ==='
"@

    az vmss run-command invoke `
      --resource-group $resourceGroup `
      --name $vmssName `
      --instance-id $instanceId `
      --command-id RunShellScript `
      --scripts $testScript `
      --query 'value[0].message' -o tsv
} else {
    Write-Host "실행 중인 인스턴스가 없습니다." -ForegroundColor Red
}

# 5. 배포 후 확인 명령어
Write-Host "`n=== 5. 배포 후 확인 명령어 ===" -ForegroundColor Green

Write-Host "VMSS 인스턴스 로그 확인:" -ForegroundColor Cyan
Write-Host "az vmss run-command invoke --resource-group $resourceGroup --name $vmssName --instance-id 0 --command-id RunShellScript --scripts 'sudo journalctl -u yangju.service -f --lines 50'"

Write-Host "`n컨테이너 상태 확인:" -ForegroundColor Cyan
Write-Host "az vmss run-command invoke --resource-group $resourceGroup --name $vmssName --instance-id 0 --command-id RunShellScript --scripts 'sudo docker ps; sudo docker logs yangju-backend'"

Write-Host "`n권한 확인:" -ForegroundColor Cyan
Write-Host "az role assignment list --assignee $principalId --query '[].{Role:roleDefinitionName, Scope:scope}' -o table"

Write-Host "`n=== 모든 설정이 완료되었습니다! ===" -ForegroundColor Green
Write-Host "이제 GitHub Actions 워크플로우를 다시 실행해 보세요." -ForegroundColor Yellow
