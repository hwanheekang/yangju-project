#!/bin/bash
echo "=== Testing ACR Authentication with Fixed Token Scope ==="

# Get ACR-specific access token
echo "Requesting ACR-specific access token..."
RESPONSE=$(curl -s -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://acrbcd00.azurecr.io")
echo "Response: $RESPONSE"

# Extract token using sed
ACR_ACCESS_TOKEN=$(echo "$RESPONSE" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ -n "$ACR_ACCESS_TOKEN" ] && [ "$ACR_ACCESS_TOKEN" != "" ]; then
    echo "✅ ACR access token obtained successfully"
    echo "Token length: ${#ACR_ACCESS_TOKEN}"
    
    # Test Docker login with the token
    echo "Testing Docker login with ACR token..."
    echo "$ACR_ACCESS_TOKEN" | docker login acrbcd00.azurecr.io --username 00000000-0000-0000-0000-000000000000 --password-stdin
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker login to ACR successful!"
        
        # Test pulling an image
        echo "Testing container image pull..."
        docker pull acrbcd00.azurecr.io/yangju-backend:latest
        
        if [ $? -eq 0 ]; then
            echo "✅ Container image pull successful!"
            docker images | grep yangju-backend
        else
            echo "❌ Container image pull failed - checking available tags..."
        fi
    else
        echo "❌ Docker login to ACR failed"
    fi
else
    echo "❌ Failed to get ACR access token"
    echo "Token: $ACR_ACCESS_TOKEN"
fi

echo "=== ACR Authentication Test Complete ==="
