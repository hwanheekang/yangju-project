#!/bin/bash

# VMSS ACR 연결 문제 진단 스크립트
# 사용법: ./debug-vmss-acr.sh <resource-group> <vmss-name> <acr-name>

set -euo pipefail

if [ $# -lt 3 ]; then
    echo "사용법: $0 <resource-group> <vmss-name> <acr-name>"
    echo "예시: $0 rg-bcd00 vmss-be-bcd00 acrbcd00"
    exit 1
fi

RESOURCE_GROUP="$1"
VMSS_NAME="$2"
ACR_NAME="$3"

echo "=== VMSS ACR 연결 진단 시작 ==="
echo "리소스 그룹: $RESOURCE_GROUP"
echo "VMSS 이름: $VMSS_NAME"
echo "ACR 이름: $ACR_NAME"
echo ""

# 1. VMSS 상태 확인
echo "1. VMSS 상태 확인..."
if az vmss show --resource-group "$RESOURCE_GROUP" --name "$VMSS_NAME" >/dev/null 2>&1; then
    echo "✅ VMSS 존재 확인"
    
    # 관리 ID 확인
    IDENTITY_TYPE=$(az vmss show --resource-group "$RESOURCE_GROUP" --name "$VMSS_NAME" --query "identity.type" -o tsv)
    PRINCIPAL_ID=$(az vmss show --resource-group "$RESOURCE_GROUP" --name "$VMSS_NAME" --query "identity.principalId" -o tsv)
    
    echo "   - 관리 ID 타입: $IDENTITY_TYPE"
    echo "   - Principal ID: $PRINCIPAL_ID"
    
    if [ -z "$PRINCIPAL_ID" ] || [ "$PRINCIPAL_ID" = "null" ]; then
        echo "❌ 관리 ID가 활성화되지 않았습니다!"
        echo "   해결방법: az vmss identity assign --resource-group $RESOURCE_GROUP --name $VMSS_NAME"
    else
        echo "✅ 관리 ID 활성화됨"
    fi
else
    echo "❌ VMSS를 찾을 수 없습니다!"
    exit 1
fi

echo ""

# 2. ACR 권한 확인
echo "2. ACR 권한 확인..."
if [ -n "$PRINCIPAL_ID" ] && [ "$PRINCIPAL_ID" != "null" ]; then
    ACR_SCOPE="/subscriptions/$(az account show --query "id" -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME"
    
    echo "ACR 범위: $ACR_SCOPE"
    
    # AcrPull 역할 확인
    ACR_ROLES=$(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$ACR_SCOPE" --query "[].roleDefinitionName" -o tsv)
    
    if echo "$ACR_ROLES" | grep -q "AcrPull"; then
        echo "✅ AcrPull 역할 할당됨"
    else
        echo "❌ AcrPull 역할이 할당되지 않았습니다!"
        echo "   해결방법: az role assignment create --assignee $PRINCIPAL_ID --role AcrPull --scope $ACR_SCOPE"
    fi
    
    echo "할당된 역할들:"
    echo "$ACR_ROLES" | sed 's/^/   - /'
else
    echo "⚠️ 관리 ID가 없어 권한 확인을 건너뜁니다."
fi

echo ""

# 3. 네트워크 규칙 확인
echo "3. 네트워크 보안 그룹 확인..."
NSG_NAME="${VMSS_NAME}-nsg"

if az network nsg show --resource-group "$RESOURCE_GROUP" --name "$NSG_NAME" >/dev/null 2>&1; then
    echo "✅ NSG 존재: $NSG_NAME"
    
    # HTTPS 아웃바운드 규칙 확인
    HTTPS_RULES=$(az network nsg rule list --resource-group "$RESOURCE_GROUP" --nsg-name "$NSG_NAME" \
        --query "[?direction=='Outbound' && destinationPortRange=='443'].{name:name, access:access}" -o tsv)
    
    if [ -n "$HTTPS_RULES" ]; then
        echo "HTTPS 아웃바운드 규칙들:"
        echo "$HTTPS_RULES" | sed 's/^/   - /'
        
        if echo "$HTTPS_RULES" | grep -q "Allow"; then
            echo "✅ HTTPS 아웃바운드 허용됨"
        else
            echo "❌ HTTPS 아웃바운드가 차단되어 있습니다!"
        fi
    else
        echo "⚠️ HTTPS 아웃바운드 규칙이 명시적으로 정의되지 않았습니다."
        echo "   기본 규칙에 의존하고 있을 수 있습니다."
    fi
else
    echo "⚠️ NSG를 찾을 수 없습니다: $NSG_NAME"
fi

echo ""

# 4. VMSS 인스턴스에서 직접 테스트
echo "4. VMSS 인스턴스에서 연결 테스트..."
INSTANCE_IDS=$(az vmss list-instances --resource-group "$RESOURCE_GROUP" --name "$VMSS_NAME" --query "[].instanceId" -o tsv | head -1)

if [ -n "$INSTANCE_IDS" ]; then
    FIRST_INSTANCE=$(echo "$INSTANCE_IDS" | head -1)
    echo "인스턴스 $FIRST_INSTANCE에서 테스트 실행 중..."
    
    az vmss run-command invoke \
        --resource-group "$RESOURCE_GROUP" \
        --name "$VMSS_NAME" \
        --instance-id "$FIRST_INSTANCE" \
        --command-id RunShellScript \
        --scripts "
            echo '=== 연결 테스트 시작 ==='
            
            # DNS 해상도 테스트
            echo '1. DNS 해상도 테스트'
            if nslookup ${ACR_NAME}.azurecr.io >/dev/null 2>&1; then
                echo '✅ ACR DNS 해상도 성공'
            else
                echo '❌ ACR DNS 해상도 실패'
            fi
            
            # HTTPS 연결 테스트
            echo '2. HTTPS 연결 테스트'
            if curl -sSf https://${ACR_NAME}.azurecr.io/v2/ >/dev/null 2>&1; then
                echo '✅ ACR HTTPS 연결 성공'
            else
                echo '❌ ACR HTTPS 연결 실패'
            fi
            
            # 관리 ID 토큰 테스트
            echo '3. 관리 ID 토큰 테스트'
            MI_TOKEN=\$(curl -s -H 'Metadata:true' 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/' | jq -r .access_token 2>/dev/null || echo 'FAILED')
            if [ \"\$MI_TOKEN\" != \"FAILED\" ] && [ -n \"\$MI_TOKEN\" ]; then
                echo '✅ 관리 ID 토큰 획득 성공'
            else
                echo '❌ 관리 ID 토큰 획득 실패'
            fi
            
            # Docker 로그인 테스트
            echo '4. Docker 로그인 테스트'
            if [ \"\$MI_TOKEN\" != \"FAILED\" ]; then
                if echo \"\$MI_TOKEN\" | docker login ${ACR_NAME}.azurecr.io --username 00000000-0000-0000-0000-000000000000 --password-stdin >/dev/null 2>&1; then
                    echo '✅ ACR Docker 로그인 성공'
                else
                    echo '❌ ACR Docker 로그인 실패'
                fi
            fi
            
            echo '=== 연결 테스트 완료 ==='
        " \
        --query 'value[0].message' -o tsv
else
    echo "⚠️ 실행 중인 인스턴스가 없습니다."
fi

echo ""
echo "=== 진단 완료 ==="
echo ""
echo "문제 해결 가이드:"
echo "1. 관리 ID 미활성화: az vmss identity assign --resource-group $RESOURCE_GROUP --name $VMSS_NAME"
echo "2. AcrPull 권한 없음: az role assignment create --assignee <PRINCIPAL_ID> --role AcrPull --scope <ACR_SCOPE>"
echo "3. NSG 차단: az network nsg rule create로 HTTPS 아웃바운드 허용 규칙 추가"
echo "4. 클라우드 초기화 문제: cloud-init 스크립트에서 ACR 인증 로직 확인"
