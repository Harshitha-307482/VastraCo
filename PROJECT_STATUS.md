# VastraCo — Project Status & Handoff Context

> Last updated: 2026-06-17  
> Active branch: `main` (merged from `eks-preparation`)  
> For: Antigravity AI — pick up from here on new machine

---

## 1. What This Project Is

**VastraCo** is a full-stack Indian fashion e-commerce platform built as a microservice architecture.

### Tech Stack
- **Frontend**: React + Vite, served via Nginx on port 3000
- **ai-service**: Node.js (Express), port 4000 — AI Outfit Planner using Gemini API
- **product-service**: Node.js (Express), port 3002 — Product catalog + PostgreSQL
- **user-service**: Node.js (Express), port 3001 — Auth + JWT
- **order-service**: Node.js (Express), port 3003 — Orders
- **DB**: PostgreSQL (separate instances per service)
- **Orchestration**: Docker Compose (`docker-compose.yml` in root)

---

## 2. Architecture

```
Browser
  └─→ Nginx (port 3000)
        ├─→ /api/products  → product-service:3002
        ├─→ /api/users     → user-service:3001
        ├─→ /api/orders    → order-service:3003
        ├─→ /api/ai        → ai-service:4000
        └─→ /*             → React SPA (static build)
```

---

## 3. Current Feature Status

### ✅ Working / Complete
- Product catalog: ~215 products across 36 categories (Men's + Women's + Footwear + Accessories)
- Product seeder: auto-seeds on startup if product count < 50
- User auth (register/login/JWT)
- Shopping cart + add to cart
- Order placement
- **AI Outfit Planner** (Priority: Fix quality issues below)

### ⚠️ AI Outfit Planner — Current Focus

The AI Outfit Planner is the main feature being fixed. Located at `/outfit-planner` in the frontend.

**What it does:**
1. Chat-based UI collects: gender, occasion, style, budget
2. AI generates 3 outfit bundles from the product catalog
3. User can swap individual items in a bundle
4. User can click "Generate Preview" for a try-on model image
5. User can add full bundle to cart

**Fix Status (as of this handoff):**

| Priority | Fix | Status |
|----------|-----|--------|
| P1 | Gender filter | ✅ Fixed |
| P1 | Style filter (Western/Casual/Formal/Traditional) | ✅ Fixed |
| P1 | Occasion filter (layered fallback) | ✅ Fixed |
| P2 | Budget enforcement (pick affordable items) | ✅ Fixed |
| P3 | Duplicate/broken product images | ✅ Fixed (Unsplash IDs updated) |
| P3 | Image fallback on broken URLs | ✅ Fixed (onError handlers) |
| P4 | Preview generation (curated model pool) | ✅ Fixed |
| P5 | **End-to-end testing** | ❌ NOT DONE — needs EC2 deploy |

---

## 4. Pending Work (What To Do Next)

### IMMEDIATE: Deploy and Test on EC2

```bash
# On EC2:
cd /home/ubuntu/VastraCo
git pull origin main
docker compose build --no-cache ai-service product-service frontend
docker compose up -d
docker compose logs ai-service -f | grep "AI Stylist"
```

### End-to-End Test Cases to Verify

Run these curl commands against EC2 (replace `localhost` with EC2 IP if needed):

```bash
# Test 1: Male Traditional ₹15000 → should get Kurta or Sherwani
curl -s -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Male traditional outfit for wedding, budget 15000","history":[],"excludeProductIds":[]}' \
  | python3 -m json.tool | grep -A2 '"category_name"'

# Test 2: Male Western ₹5000 → should get Shirt + Jeans/Trousers
curl -s -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Male western casual outing budget 5000","history":[],"excludeProductIds":[]}' \
  | python3 -m json.tool | grep -A2 '"category_name"'

# Test 3: Female Traditional ₹10000 → should get Saree + Blouse + accessories
curl -s -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Female traditional saree for wedding budget 10000","history":[],"excludeProductIds":[]}' \
  | python3 -m json.tool | grep -A2 '"category_name"'

# Test 4: Female Western ₹8000 → should get Dress/Gown + accessories
curl -s -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Female western dress for farewell budget 8000","history":[],"excludeProductIds":[]}' \
  | python3 -m json.tool | grep -A2 '"category_name"'
```

---

## 5. Key Files & Their Roles

| File | Purpose |
|------|---------|
| `docker-compose.yml` | All services definition, env vars, networking |
| `nginx.conf` | Nginx reverse proxy config for frontend container |
| `frontend/src/pages/OutfitPlanner.jsx` | Main AI Outfit Planner UI |
| `frontend/src/pages/Shop.jsx` | Product browsing page |
| `ai-service/src/controllers/aiController.js` | ALL AI logic: chat, filtering, bundle building, preview |
| `product-service/src/db/index.js` | Database init + product seeder (auto-seeds 215 products) |
| `product-service/src/models/productModel.js` | Product DB queries |

---

## 6. AI Controller Logic (Key Details)

File: `ai-service/src/controllers/aiController.js`

### Style Matching (critical — DB style values differ from user's words)

DB `style` column values: `Traditional`, `Formal`, `Casual`, `Western`, `Sporty`

| User says | Mapped to | Matches DB styles |
|-----------|-----------|-------------------|
| traditional / indian / saree / kurta | `Traditional` | `Traditional` only |
| formal / office / interview / blazer | `Formal` | `Formal`, `Western` |
| western / dress / gown / jeans | `Western` | `Western`, `Casual`, `Formal` |
| casual | `Casual` | `Casual`, `Western` |

### Filtering (3 layers)
1. gender + style + occasion (strict)
2. gender + style (if < 6 results)
3. gender only (if still < 6 results)

### Bundle Building
- **Traditional style** → ALWAYS uses Standalone items (Kurta/Sherwani/Saree/Lehenga etc.)
- **Western/Casual/Formal** → Top + Bottom combo (Shirt + Jeans etc.)
- **Budget**: `pickAffordable()` helper enforces budget. Core garment ≤ 60% of budget.
- **Sarees** automatically get a Blouse paired (from `categories.Blouses[]`)

### Category Segmentation
```
Top:       Shirts, T-Shirts, Polo T-Shirts, Kurtis, Crop Tops
Bottom:    Trousers, Jeans, Chinos, Skirts
Blouses:   Blouses (pairs with Sarees only)
Standalone: Sarees, Lehengas, Salwar Suits, Anarkalis, Dresses, Gowns,
            Blazers, Suits, Jackets, Sherwani, Kurta
Footwear:  Formal Shoes, Loafers, Sneakers, Heels, Flats, Sandals
Accessory: Watches, Belts, Wallets, Sunglasses, Earrings, Bangles,
           Necklaces, Rings, Handbags, Clutches
```

---

## 7. Product Catalog Details

Seeded in `product-service/src/db/index.js` → `initDb()` function.  
Auto-seeds on startup if product count < 50.

### Category counts
| Category | Count | Gender | Style |
|----------|-------|--------|-------|
| Shirts | 12 | Male | Formal/Casual |
| T-Shirts | 12 | Male | Casual/Sporty |
| Polo T-Shirts | 8 | Male | Casual/Sporty |
| Blazers | 8 | Male | Formal/Western |
| Suits | 8 | Male | Formal/Western |
| Trousers | 10 | Male | Formal |
| Jeans | 10 | Male | Casual |
| Chinos | 8 | Male | Casual/Formal |
| Kurta | 8 | Male | Traditional |
| Sherwani | 5 | Male | Traditional |
| Jackets | 8 | Male | Casual/Western |
| Sarees | 12 | Female | Traditional |
| Lehengas | 8 | Female | Traditional |
| Kurtis | 12 | Female | Traditional/Casual |
| Salwar Suits | 10 | Female | Traditional |
| Anarkalis | 8 | Female | Traditional |
| Dresses | 12 | Female | Casual/Western |
| Gowns | 8 | Female | Western |
| Skirts | 8 | Female | Casual/Western |
| Crop Tops | 8 | Female | Casual/Western |
| Blouses | 10 | Female | Traditional |
| Formal Shoes | 6 | Male | Formal |
| Loafers | 6 | Unisex | Casual/Formal |
| Sneakers | 8 | Unisex | Casual/Sporty |
| Heels | 6 | Female | Formal/Western |
| Flats | 6 | Female | Casual/Traditional |
| Sandals | 6 | Unisex | Casual/Traditional |
| Watches | 8 | Unisex | Formal/Western |
| Belts | 6 | Unisex | Formal/Casual |
| Wallets | 6 | Unisex | Casual/Formal |
| Sunglasses | 6 | Unisex | Casual/Western |
| Earrings | 10 | Female | Traditional |
| Bangles | 10 | Female | Traditional |
| Necklaces | 8 | Female | Traditional |
| Rings | 10 | Unisex | Casual/Formal |
| Handbags | 8 | Female | Western |
| Clutches | 6 | Female | Traditional/Western |

---

## 8. Environment Variables (needed in docker-compose.yml)

```env
GEMINI_API_KEY=<your-key>          # For AI chat (ai-service)
OPENAI_API_KEY=dummy               # Not used; fallback Unsplash images used
JWT_SECRET=vastrasecret
POSTGRES_USER=vastra
POSTGRES_PASSWORD=vastra123
```

---

## 9. Git Branch Info

- `main` — production-ready (this handoff)
- `eks-preparation` — same as main (merged)

---

## 10. Do NOT Work On

Per explicit user instruction:
- ❌ EKS / Helm / ArgoCD
- ❌ Terraform / CI-CD pipelines
- ❌ New features until all 4 test cases pass

**Only focus**: make the existing AI Outfit Planner pass all 4 test cases end-to-end.
