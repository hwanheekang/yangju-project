#!/bin/bash

# Application Gateway Health Probe 생성 스크립트
set -euo pipefail

RESOURCE_GROUP="${1:-rg-bcd00}"
AGW_NAME="${2:-agw-bcd00}"

echo "🔍 Application Gateway Health Probe 설정 중..."
echo "Resource Group: $RESOURCE_GROUP"
echo "Application Gateway: $AGW_NAME"

# Application Gateway 존재 확인
if ! az network application-gateway show --resource-group "$RESOURCE_GROUP" --name "$AGW_NAME" >/dev/null 2>&1; then
    echo "❌ Application Gateway '$AGW_NAME'를 찾을 수 없습니다."
    exit 1
fi

echo "✅ Application Gateway 발견됨"

# Backend Address Pool 확인
BACKEND_POOLS=$(az network application-gateway address-pool list \
    --resource-group "$RESOURCE_GROUP" \
    --gateway-name "$AGW_NAME" \
    --query "[].name" -o tsv)

echo "기존 Backend Pools: $BACKEND_POOLS"

# Backend HTTP Settings 확인
HTTP_SETTINGS=$(az network application-gateway http-settings list \
    --resource-group "$RESOURCE_GROUP" \
    --gateway-name "$AGW_NAME" \
    --query "[].name" -o tsv)

echo "기존 HTTP Settings: $HTTP_SETTINGS"

# Health Probe 생성 또는 업데이트
echo "🏥 Health Probe 생성 중..."

# Frontend Health Probe (포트 80)
az network application-gateway probe create \
    --resource-group "$RESOURCE_GROUP" \
    --gateway-name "$AGW_NAME" \
    --name "frontend-health-probe" \
    --protocol "Http" \
    --host-name-from-http-settings true \
    --path "/" \
    --interval 30 \
    --timeout 10 \
    --threshold 3 \
    --match-status-codes "200-399" \
    --output none 2>/dev/null || echo "Frontend health probe already exists or creation failed"

# Backend Health Probe (포트 4000)
az network application-gateway probe create \
    --resource-group "$RESOURCE_GROUP" \
    --gateway-name "$AGW_NAME" \
    --name "backend-health-probe" \
    --protocol "Http" \
    --host-name-from-http-settings true \
    --path "/health" \
    --interval 30 \
    --timeout 10 \
    --threshold 3 \
    --match-status-codes "200-399" \
    --output none 2>/dev/null || echo "Backend health probe already exists or creation failed"

echo "✅ Health Probes 생성 완료"

# HTTP Settings에 Health Probe 연결
echo "🔗 HTTP Settings에 Health Probe 연결 중..."

# Backend HTTP Settings 업데이트
if echo "$HTTP_SETTINGS" | grep -q "backend-http-settings"; then
    az network application-gateway http-settings update \
        --resource-group "$RESOURCE_GROUP" \
        --gateway-name "$AGW_NAME" \
        --name "backend-http-settings" \
        --probe "backend-health-probe" \
        --output none || echo "Backend HTTP settings update failed"
    echo "✅ Backend HTTP settings updated with health probe"
fi

# Frontend HTTP Settings 업데이트 (존재하는 경우)
if echo "$HTTP_SETTINGS" | grep -q "frontend-http-settings"; then
    az network application-gateway http-settings update \
        --resource-group "$RESOURCE_GROUP" \
        --gateway-name "$AGW_NAME" \
        --name "frontend-http-settings" \
        --probe "frontend-health-probe" \
        --output none || echo "Frontend HTTP settings update failed"
    echo "✅ Frontend HTTP settings updated with health probe"
fi

# 기본 HTTP Settings가 있는 경우 업데이트
DEFAULT_HTTP_SETTINGS=$(echo "$HTTP_SETTINGS" | head -1)
if [ -n "$DEFAULT_HTTP_SETTINGS" ]; then
    echo "기본 HTTP Settings '$DEFAULT_HTTP_SETTINGS'에 health probe 적용 시도..."
    az network application-gateway http-settings update \
        --resource-group "$RESOURCE_GROUP" \
        --gateway-name "$AGW_NAME" \
        --name "$DEFAULT_HTTP_SETTINGS" \
        --probe "backend-health-probe" \
        --output none || echo "Default HTTP settings update failed"
fi

# Application Gateway 상태 확인
echo "🔍 Application Gateway 상태 확인..."
az network application-gateway show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AGW_NAME" \
    --query "{name:name, provisioningState:provisioningState, operationalState:operationalState}" \
    -o table

# Health Probes 목록 출력
echo "🏥 설정된 Health Probes:"
az network application-gateway probe list \
    --resource-group "$RESOURCE_GROUP" \
    --gateway-name "$AGW_NAME" \
    --query "[].{Name:name, Protocol:protocol, Path:path, Interval:intervalInSeconds, Timeout:timeoutInSeconds}" \
    -o table

# Backend Pool Health 확인
echo "🏥 Backend Pool Health 상태:"
az network application-gateway show-backend-health \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AGW_NAME" \
    --query "backendAddressPools[].{Pool:name, Health:backendHttpSettingsCollection[0].servers[0].health}" \
    -o table 2>/dev/null || echo "Backend health 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요."

echo "✅ Application Gateway Health Probe 설정 완료!"
