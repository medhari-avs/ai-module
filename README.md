# Shnoor AI & Meeting Interface - Integration Guide

This folder contains all the custom AI and meeting components created for the Shnoor Meetings platform. Follow these steps to integrate them into your local environment.

## 📂 Folder Structure
- **frontend/**: Contains all React components, hooks, and services.
- **backend/**: Contains the Python FastAPI routers and core database logic.

## 🚀 How to Integrate

### 1. Frontend Setup
- **Pages**: Copy files from `frontend/pages/` into your `src/pages/` directory.
- **Components**: Copy files from `frontend/components/` into your `src/components/` directory.
- **Services**: Copy files from `frontend/services/` into your `src/services/` directory.
- **Hooks**: Copy files from `frontend/hooks/` into your `src/hooks/` directory.
- **Assets**: Copy `illustration.png` into `src/assets/`.

**Dependencies**: Ensure you have installed these packages:
```bash
npm install lucide-react tesseract.js-worker
```

### 2. Backend Setup
- **Routers**: Copy files from `backend/routers/` into your `routers/` directory.
- **Core**: Copy files from `backend/core/` into your `core/` directory.
- **main.py**: Update your main entry point to include these routers.
- **.env**: (CRITICAL) This file contains the API keys. Ensure it is placed in your backend root and that you have valid keys for:
  - `GEMINI_API_KEY`
  - `GROQ_API_KEY`
  - `OPENROUTER_API_KEY`
  - `DATABASE_URL`

### 3. Database
The logic assumes a PostgreSQL/Supabase database. Ensure the tables `meetings` and `meeting_participants` exist (see `core/database.py` for schema).

---
*Created by Antigravity AI for Arvind.*
