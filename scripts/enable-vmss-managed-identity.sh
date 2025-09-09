#!/bin/bash

# VMSS 관리 ID 활성화 및 ACR 권한 부여 스크립트
# 사용법: ./enable-vmss-managed-identity.sh <resource-group> <vmss-name> <acr-name> <subscription-id>

set -euo pipefail

# 파라미터 확인
if [ $# -lt 4 ]; then
    echo "사용법: $0 <resource-group> <vmss-name> <acr-name> <subscription-id>"
    echo "예시: $0 rg-bcd00 vmss-be-bcd00 acrbcd00 your-subscription-id"
    exit 1
fi

RESOURCE_GROUP="$1"
VMSS_NAME="$2"
ACR_NAME="$3"
SUBSCRIPTION_ID="$4"

echo "=== VMSS 관리 ID 설정 시작 ==="
echo "리소스 그룹: $RESOURCE_GROUP"
echo "VMSS 이름: $VMSS_NAME"
echo "ACR 이름: $ACR_NAME"
echo "구독 ID: $SUBSCRIPTION_ID"

# 1. VMSS 존재 확인
echo "1. VMSS 존재 여부 확인..."
if ! az vmss show --resource-group "$RESOURCE_GROUP" --name "$VMSS_NAME" >/dev/null 2>&1; then
    echo "❌ 오류: VMSS '$VMSS_NAME'을 리소스 그룹 '$RESOURCE_GROUP'에서 찾을 수 없습니다."
    exit 1
fi
echo "✅ VMSS 확인됨"

# 2. 시스템 할당 관리 ID 활성화
echo "2. 시스템 할당 관리 ID 활성화..."
az vmss identity assign \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VMSS_NAME"

# 3. 관리 ID Principal ID 획득
echo "3. 관리 ID Principal ID 획득..."
PRINCIPAL_ID=$(az vmss show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VMSS_NAME" \
    --query "identity.principalId" \
    --output tsv)

if [ -z "$PRINCIPAL_ID" ] || [ "$PRINCIPAL_ID" = "null" ]; then
    echo "❌ 오류: 관리 ID Principal ID를 획득할 수 없습니다."
    exit 1
fi

echo "✅ 관리 ID Principal ID: $PRINCIPAL_ID"

# 4. ACR 존재 확인
echo "4. ACR 존재 여부 확인..."
if ! az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
    echo "❌ 오류: ACR '$ACR_NAME'을 찾을 수 없습니다."
    exit 1
fi
echo "✅ ACR 확인됨"

# 5. AcrPull 역할 할당
echo "5. AcrPull 역할 할당..."
ACR_SCOPE="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME"

az role assignment create \
    --assignee "$PRINCIPAL_ID" \
    --role "AcrPull" \
    --scope "$ACR_SCOPE" || echo "AcrPull 역할이 이미 할당되어 있거나 할당에 실패했습니다."

# 6. 역할 할당 확인
echo "6. 역할 할당 확인..."
echo "할당된 역할:"
az role assignment list \
    --assignee "$PRINCIPAL_ID" \
    --scope "$ACR_SCOPE" \
    --query "[].{Role:roleDefinitionName, Scope:scope}" \
    --output table

# 7. VMSS 인스턴스 업그레이드 (기존 인스턴스에 관리 ID 적용)
echo "7. VMSS 인스턴스 업그레이드..."
echo "기존 인스턴스에 관리 ID를 적용하기 위해 rolling upgrade를 시작합니다..."

# Rolling upgrade 정책 설정
az vmss update \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VMSS_NAME" \
    --set upgradePolicy.mode=Rolling \
    --set upgradePolicy.rollingUpgradePolicy.maxBatchInstancePercent=50 \
    --set upgradePolicy.rollingUpgradePolicy.maxUnhealthyInstancePercent=20 \
    --set upgradePolicy.rollingUpgradePolicy.pauseTimeBetweenBatches=PT30S

# Rolling upgrade 시작
az vmss rolling-upgrade start \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VMSS_NAME"

echo "✅ VMSS 관리 ID 설정 완료!"
echo ""
echo "다음 단계:"
echo "1. Rolling upgrade가 완료될 때까지 기다리세요 (몇 분 소요)"
echo "2. GitHub Actions 워크플로우로 애플리케이션을 다시 배포하세요"
echo "3. 인스턴스가 ACR에서 이미지를 성공적으로 가져오는지 확인하세요"
echo ""
echo "Rolling upgrade 상태 확인:"
echo "az vmss rolling-upgrade get-latest --resource-group $RESOURCE_GROUP --name $VMSS_NAME"
