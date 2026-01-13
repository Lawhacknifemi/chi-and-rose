# 🧠 Personalized Product Health Intelligence System
## Cursor AI Coding Assistant — System Specification

---

## 1. Purpose

Build a cross-platform application that allows users to:

- Scan product barcodes (food, beauty, household)
- Analyze ingredients and nutrition
- Personalize safety and suitability based on user health profiles
- Provide clear, non-medical explanations
- Recommend safer alternatives
- Improve recommendations over time through feedback

⚠️ This system must **not** provide medical diagnoses or treatment advice.

---

## 2. Core User Goals

The system must support users who want to:

- Manage symptoms (pain, fatigue, acne, bloating)
- Improve nutrition
- Reduce exposure to endocrine disruptors
- Support reproductive and hormonal health
- Explore clean food, beauty, and household products

---

## 3. User Health Profile Model

The AI must reason over a structured user profile.

```ts
UserHealthProfile {
  conditions: Condition[]            // e.g. PCOS, Fibroids, Endometriosis
  symptoms: Symptom[]                // Acne, Fatigue, Cramps, Mood swings
  goals: Goal[]                      // Improve nutrition, Reduce disruptors
  dietaryPreferences: Diet[]         // Vegan, Gluten-Free, Keto, None
  productFocus: ProductCategory[]    // Food, Beauty, Household
  sensitivities: Sensitivity[]       // Fragrance, Soy, Dairy, Gluten
}
---

## 4. Product Data Sources

The system must retrieve product information from the following external, read-only data sources:

### 4.1 Open Food Facts
- Barcode-based product lookup
- Ingredient lists
- Nutrition facts
- Additives and processing level
- Food categories and labels

### 4.2 Open Beauty Facts
- Cosmetic and personal care products
- Ingredient (INCI) lists
- Product categories (skin, hair, makeup)

### 4.3 USDA FoodData Central
- Verified nutrition data
- Macro and micronutrients
- Serving sizes
- Ingredient breakdowns (when available)

### 4.4 UPCitemdb
- Fallback product lookup
- Brand, name, and category data
- Limited nutrition or ingredient metadata

---

## 5. Ingredient Knowledge Base

The system must maintain a curated ingredient intelligence layer used by the AI reasoning engine.

### 5.1 Ingredient Rule Model

```ts
IngredientRule {
  ingredientName: string
  tags: Tag[]                        // endocrine_disruptor, inflammatory, allergen
  avoidFor: Condition[]              // PCOS, Fibroids, Endometriosis
  cautionFor: Symptom[]              // Acne, Fatigue, Bloating
  explanation: string                // Plain-language explanation
  confidence: number                 // 0.0 – 1.0
}
### 5.2 Rule Usage

- Ingredient rules must be applied **contextually**, not absolutely.
- Multiple rules may apply to a single ingredient.
- Ingredient impact must be weighted by:
  - Product category (food, beauty, household)
  - Ingredient concentration (if available)
  - User health profile and sensitivities
- AI must communicate uncertainty where evidence is limited.

---

## 6. AI Responsibilities

The AI assistant is responsible for reasoning, explanation, and personalization.

### 6.1 The AI Must

- Analyze:
  - Product ingredients
  - Nutrition facts
  - User health profile
  - Ingredient knowledge rules
- Generate:
  - Personalized safety summaries
  - Ingredient-level insights
  - Context-aware product alternatives
- Communicate:
  - Clear reasoning
  - Benefits, concerns, and trade-offs
  - Safety explanations in plain language

### 6.2 The AI Must Not

- Diagnose medical conditions
- Recommend medical treatments or cures
- Use fear-based, absolute, or alarmist language

---

## 7. AI Output Format

All AI-generated product evaluations must conform to the following structure.

### 7.1 Product Analysis Schema

```ts
ProductAnalysis {
  overallSafetyScore: number          // 0–100 (personalized)
  safetyLevel: "Good" | "Caution" | "Avoid"
  summary: string                     // Human-readable explanation
  concerns: IngredientConcern[]       // Flagged ingredients with reasons
  positives: string[]                 // Beneficial product attributes
  alternatives: AlternativeProduct[]  // Safer product recommendations
  disclaimer: string
}
## 8. Ingredient Tap Insights

When a user selects (taps) an ingredient in the product view, the AI must return a concise, educational explanation tailored to the user’s health profile.

### 8.1 Ingredient Insight Schema

```ts
IngredientInsight {
  name: string
  whatItIs: string
  whyItsUsed: string
  healthImpact: string
  whoShouldAvoid: Condition[]
  confidence: number
}
### 8.2 Language and Tone Requirements

- **Educational**: Explain in plain language what the ingredient is and its role.
- **Calm and Neutral**: Avoid fear-based or alarmist wording.
- **Clear and Understandable**: Suitable for non-technical users.
- **Transparent**: Include confidence levels and acknowledge uncertainty.

---

## 9. Safety Scoring Logic

The system calculates a **personalized safety score** for each product based on user profile and ingredient rules.

### 9.1 Scoring Rules

- **Base score**: 100
- **Deductions**:
  - Ingredients flagged for the user’s conditions (e.g., PCOS, Endometriosis)
  - Ingredients flagged for the user’s symptoms (e.g., acne, bloating)
  - Unhealthy nutrition elements (e.g., added sugar, high sodium)
- **Bonuses**:
  - Clean or minimally processed ingredients
  - Nutritional benefits aligned with user goals
- **Category adjustments**: Some deductions/bonuses vary by product type (food, beauty, household)

### 9.2 Score Interpretation

| Score Range | Safety Level | Description |
|------------|-------------|-------------|
| 80–100     | Good        | Suitable for this user |
| 50–79      | Caution     | Use with awareness of flagged ingredients |
| 0–49       | Avoid       | Not recommended for this user profile |

### 9.3 Explainability Requirements

- AI must clearly explain all deductions and bonuses.
- Indicate which ingredients influenced the score.
- Explain how the user profile affected the final rating.

---

## 10. Learning Over Time

The system must adapt and improve recommendations based on user behavior and feedback.

### 10.1 Feedback Signals

- **Explicit feedback**: Thumbs up / thumbs down
- **Symptom tracking**: Changes in reported symptoms over time
- **Product usage patterns**: Products frequently accepted or avoided
- **Optional notes**: User-added comments or observations

### 10.2 Learning Outcomes

- Re-rank alternative product recommendations
- Adjust ingredient confidence weights
- Improve relevance for users with similar profiles
- Refine clarity and usefulness of explanations

> ⚠️ Learning must **never** result in medical diagnoses or treatment claims.

---

## 11. AI Model Strategy

### 11.1 Phase 1 — MVP

- Use hosted LLM APIs (e.g., OpenAI, Anthropic)
- Apply rule-based scoring for ingredients
- Use prompt-driven reasoning for explanations

### 11.2 Phase 2 — Optimization

- Fine-tune recommendation ranking models
- Cache common explanations
- Introduce user similarity clustering for personalization

### 11.3 Phase 3 — Advanced Personalization

- Train lightweight internal models using anonymized feedback
- Expert-reviewed updates to ingredient rules
- Longitudinal pattern recognition for non-diagnostic personalization

---

## 12. Legal and Safety Constraints

- Always include a disclaimer:

> “This information is for educational purposes only and is not a substitute for professional medical advice.”

### 12.1 Safety Requirements

- Encourage consulting qualified healthcare professionals when appropriate
- Avoid definitive or absolute health claims
- Prioritize transparency, user safety, and uncertainty communication

---

## END OF SPECIFICATION
