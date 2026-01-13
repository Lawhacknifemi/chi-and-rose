#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
TOKEN=$1

if [ -z "$TOKEN" ]; then
    echo "Usage: ./verify-health.sh <SESSION_TOKEN>"
    exit 1
fi

echo "1. Updating Health Profile..."
curl -s -X POST "$BASE_URL/rpc/health/updateProfile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "json": {
        "conditions": ["PCOS"],
        "symptoms": ["Acne"],
        "goals": ["Reduce disruptors"],
        "dietaryPreferences": [],
        "sensitivities": ["parabens"]
    }
  }' | jq .

echo -e "\n2. Getting Health Profile..."
curl -s -X POST "$BASE_URL/rpc/health/getProfile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "json": {} }' | jq .

echo -e "\n3. Scanning Product (Nutella - 3017620422003)..."
curl -s -X POST "$BASE_URL/rpc/scanner/scanBarcode" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "json": {
        "barcode": "3017620422003"
    }
  }' | jq .

echo -e "\n4. Getting Ingredient Insight for 'parabens'..."
curl -s -X POST "$BASE_URL/rpc/scanner/getIngredientInsight" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "json": {
        "name": "parabens"
    }
  }' | jq .
