# Product Spec: AI-Powered Product Health Scanner & Alternative Recommender

## Overview
Build a mobile application that allows users to:
- Scan product barcodes (food & beauty products)
- Analyze ingredients and nutrition
- Get a brief, trustworthy health summary
- View detailed insights for each ingredient
- Receive healthier alternative recommendations tailored to their health profile

The system must be **explainable, safe, and non-diagnostic**.
AI is used for **interpretation and personalization**, not medical decision-making.

---

## Core Principles
1. Health decisions are **rule-based**, not AI-generated
2. AI is used only to:
   - Normalize ingredient names
   - Explain facts in simple language
   - Rank and describe alternatives
3. Every warning must be **traceable to an ingredient or nutrient**
4. The app provides **guidance, not medical advice**

---

## User Flow

1. User scans a product barcode
2. App fetches product data (ingredients, nutrition)
3. System evaluates product against health rules
4. App displays:
   - Overall safety status
   - Brief summary (2–3 lines)
   - Clickable ingredient list
   - Healthier alternatives
5. User can tap any ingredient to see detailed insight

---

## Data Sources
- Open Food Facts (food products)
- Open Beauty Facts (cosmetics & hair products)
- USDA FoodData Central (nutrient enrichment)
- Internal ingredient knowledge base

---

## High-Level Architecture

Mobile App (Flutter)
→ API Gateway
→ Backend (Node.js / FastAPI)
→ Rules Engine
→ Ingredient Knowledge Base
→ AI Services (LLM API)
→ Recommendation Engine
→ Database (Postgres + Vector DB)

---

## Product Evaluation Pipeline

### 1. Product Lookup
Input: Barcode  
Output:
- Product name
- Category
- Ingredient list (raw)
- Nutrition facts (if available)

Fallback gracefully if data is incomplete.

---

### 2. Ingredient Normalization
Convert raw ingredient text into canonical ingredients.

Example:
