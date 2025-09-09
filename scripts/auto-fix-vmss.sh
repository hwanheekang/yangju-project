#!/bin/bash

# VMSS 자동 문제 해결 스크립트
# GitHub Actions에서 호출되어 실시간으로 문제를 감지하고 해결

set -euo pipefail

RESOURCE_GROUP="${1:-rg-bcd00}"
VMSS_NAME="${2:-vmss-be-bcd00}"
ACR_NAME="${3:-acrbcd00}"

echo "🔧 VMSS 자동 문제 해결 시작..."
echo "Resource Group: $RESOURCE_GROUP"
echo "VMSS Name: $VMSS_NAME"
echo "ACR Name: $ACR_NAME"

# 문제 감지 및 해결 함수들
fix_managed_identity() {
    echo "🔑 관리 ID 문제 해결 중..."
    
    # 시스템 할당 관리 ID 활성화
    if az vmss identity assign \
        --resource-group "$RESOURCE_GROUP" \
        --name "$VMSS_NAME" >/dev/null 2>&1; then
        echo "✅ 시스템 할당 관리 ID 활성화됨"
        return 0
    else
        echo "❌ 시스템 할당 관리 ID 활성화 실패"
        return 1
    fi
}

fix_acr_permissions() {
    echo "🐳 ACR 권한 문제 해결 중..."
    
    # 관리 ID Principal ID 획득
    local principal_id
    principal_id=$(az vmss show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$VMSS_NAME" \
        --query "identity.principalId" -o tsv 2>/dev/null)
    
    if [ -z "$principal_id" ] || [ "$principal_id" = "null" ]; then
        echo "❌ 관리 ID Principal ID를 찾을 수 없음"
        return 1
    fi
    
    echo "Principal ID: $principal_id"
    
    # ACR 권한 부여
    local subscription_id
    subscription_id=$(az account show --query "id" -o tsv)
    local acr_scope="/subscriptions/$subscription_id/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME"
    
    # AcrPull 역할 할당
    if az role assignment create \
        --assignee "$principal_id" \
        --role "AcrPull" \
        --scope "$acr_scope" >/dev/null 2>&1; then
        echo "✅ AcrPull 권한 할당됨"
    else
        echo "⚠️ AcrPull 권한이 이미 존재하거나 할당 실패"
    fi
    
    return 0
}

fix_nsg_rules() {
    echo "🛡️ NSG 규칙 문제 해결 중..."
    
    local nsg_name="${VMSS_NAME}-nsg"
    
    # HTTPS 아웃바운드 규칙 추가
    az network nsg rule create \
        --resource-group "$RESOURCE_GROUP" \
        --nsg-name "$nsg_name" \
        --name "Allow-HTTPS-Outbound-Auto" \
        --priority 100 \
        --source-address-prefixes "*" \
        --destination-address-prefixes "Internet" \
        --destination-port-ranges "443" \
        --access "Allow" \
        --protocol "Tcp" \
        --direction "Outbound" \
        --output none 2>/dev/null || echo "HTTPS 규칙이 이미 존재"
    
    # ACR 서비스 태그 규칙 추가
    az network nsg rule create \
        --resource-group "$RESOURCE_GROUP" \
        --nsg-name "$nsg_name" \
        --name "Allow-ACR-Auto" \
        --priority 110 \
        --source-address-prefixes "*" \
        --destination-address-prefixes "AzureContainerRegistry" \
        --destination-port-ranges "443" \
        --access "Allow" \
        --protocol "Tcp" \
        --direction "Outbound" \
        --output none 2>/dev/null || echo "ACR 규칙이 이미 존재"
    
    echo "✅ NSG 규칙 확인/추가 완료"
    return 0
}

restart_services() {
    echo "🔄 서비스 재시작 중..."
    
    # 첫 번째 인스턴스에서 서비스 재시작
    local instance_id
    instance_id=$(az vmss list-instances \
        --resource-group "$RESOURCE_GROUP" \
        --name "$VMSS_NAME" \
        --query "[0].instanceId" -o tsv 2>/dev/null)
    
    if [ -z "$instance_id" ] || [ "$instance_id" = "null" ]; then
        echo "❌ 실행 중인 인스턴스가 없음"
        return 1
    fi
    
    az vmss run-command invoke \
        --resource-group "$RESOURCE_GROUP" \
        --name "$VMSS_NAME" \
        --instance-id "$instance_id" \
        --command-id RunShellScript \
        --scripts "
            echo 'Restarting services on instance $instance_id...'
            
            # Docker 재시작
            sudo systemctl restart docker
            sleep 5
            
            # Yangju 서비스 재시작 (Backend VMSS인 경우)
            if systemctl list-units --type=service | grep -q yangju.service; then
                sudo systemctl restart yangju.service
                echo 'Yangju service restarted'
            fi
            
            echo 'Service restart complete'
        " \
        --query 'value[0].message' -o tsv >/dev/null
    
    echo "✅ 서비스 재시작 완료"
    return 0
}

test_connectivity() {
    echo "🌐 연결 테스트 중..."
    
    local instance_id
    instance_id=$(az vmss list-instances \
        --resource-group "$RESOURCE_GROUP" \
        --name "$VMSS_NAME" \
        --query "[0].instanceId" -o tsv 2>/dev/null)
    
    if [ -z "$instance_id" ] || [ "$instance_id" = "null" ]; then
        echo "❌ 테스트할 인스턴스가 없음"
        return 1
    fi
    
    local test_result
    test_result=$(az vmss run-command invoke \
        --resource-group "$RESOURCE_GROUP" \
        --name "$VMSS_NAME" \
        --instance-id "$instance_id" \
        --command-id RunShellScript \
        --scripts "
            # 관리 ID 토큰 테스트
            MI_TOKEN=\$(curl -s -H 'Metadata:true' 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/' | jq -r .access_token 2>/dev/null || echo 'FAILED')
            
            if [ \"\$MI_TOKEN\" != \"FAILED\" ] && [ -n \"\$MI_TOKEN\" ]; then
                echo 'MI_TOKEN_OK'
            else
                echo 'MI_TOKEN_FAILED'
            fi
            
            # ACR 연결 테스트
            if curl -sSf https://$ACR_NAME.azurecr.io/v2/ >/dev/null 2>&1; then
                echo 'ACR_CONNECTIVITY_OK'
            else
                echo 'ACR_CONNECTIVITY_FAILED'
            fi
            
            # Docker 로그인 테스트
            if [ \"\$MI_TOKEN\" != \"FAILED\" ]; then
                if echo \"\$MI_TOKEN\" | docker login $ACR_NAME.azurecr.io --username 00000000-0000-0000-0000-000000000000 --password-stdin >/dev/null 2>&1; then
                    echo 'DOCKER_LOGIN_OK'
                else
                    echo 'DOCKER_LOGIN_FAILED'
                fi
            fi
        " \
        --query 'value[0].message' -o tsv 2>/dev/null)
    
    echo "테스트 결과: $test_result"
    
    if echo "$test_result" | grep -q "MI_TOKEN_OK"; then
        echo "✅ 관리 ID 토큰 획득 성공"
    else
        echo "❌ 관리 ID 토큰 획득 실패"
        return 1
    fi
    
    if echo "$test_result" | grep -q "ACR_CONNECTIVITY_OK"; then
        echo "✅ ACR 연결 성공"
    else
        echo "❌ ACR 연결 실패"
        return 1
    fi
    
    if echo "$test_result" | grep -q "DOCKER_LOGIN_OK"; then
        echo "✅ Docker 로그인 성공"
    else
        echo "❌ Docker 로그인 실패"
        return 1
    fi
    
    return 0
}

# 메인 문제 해결 로직
main() {
    local issues_fixed=0
    local total_attempts=3
    
    for attempt in $(seq 1 $total_attempts); do
        echo ""
        echo "🔄 문제 해결 시도 $attempt/$total_attempts"
        
        # 1. 관리 ID 확인/수정
        if ! test_connectivity >/dev/null 2>&1; then
            echo "문제가 감지됨. 해결 시도 중..."
            
            # 관리 ID 문제 해결
            if fix_managed_identity; then
                ((issues_fixed++))
                sleep 10  # 전파 대기
            fi
            
            # ACR 권한 문제 해결
            if fix_acr_permissions; then
                ((issues_fixed++))
                sleep 5
            fi
            
            # NSG 규칙 문제 해결
            if fix_nsg_rules; then
                ((issues_fixed++))
            fi
            
            # 서비스 재시작
            if restart_services; then
                ((issues_fixed++))
                sleep 15  # 서비스 시작 대기
            fi
            
            # 다시 테스트
            if test_connectivity; then
                echo "✅ 문제 해결 완료! ($issues_fixed개 수정사항 적용)"
                return 0
            fi
        else
            echo "✅ 모든 연결이 정상입니다!"
            return 0
        fi
        
        if [ $attempt -lt $total_attempts ]; then
            echo "⏳ 30초 후 재시도..."
            sleep 30
        fi
    done
    
    echo "❌ $total_attempts번의 시도 후에도 문제가 해결되지 않았습니다."
    echo "수동 확인이 필요할 수 있습니다."
    return 1
}

# 스크립트 실행
main
