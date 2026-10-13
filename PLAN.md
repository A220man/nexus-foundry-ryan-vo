# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

html-composition-editor

## Roadmap

### core-skeleton — FastAPI + React skeleton with composition CRUD

Status: done

Acceptance:
- FastAPI backend runs with /api/compositions CRUD endpoints
- React frontend loads and can create/list compositions
- SQLite persistence with migrations
- Backend and frontend tests pass
- Dockerfiles build successfully

Implementation: `backend/app/main.py`, `backend/app/api/compositions.py`, `backend/app/models/composition.py`, `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/services/validation.py`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `frontend/src/components/CompositionList.tsx`, `frontend/src/components/CompositionForm.tsx`, `frontend/src/components/CompositionDetail.tsx`, `frontend/src/components/TemplatesPage.tsx`, `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`

Tests: `backend/tests/test_api_compositions.py`, `backend/tests/test_validation.py`, `frontend/src/api/client.test.ts`, `frontend/src/components/CompositionList.test.tsx`

### html-composition-editor — HTML composition editor with live preview

Status: in_progress

Acceptance:
- Monaco editor for HTML/JS/CSS editing
- Live iframe preview of composition
- Save composition to backend
- Composition validation (required data-attributes)

Implementation: `frontend/src/components/CompositionForm.tsx`

### video-rendering — Video rendering pipeline (headless Chrome + ffmpeg)

Status: planned

Acceptance:
- Render endpoint accepts composition ID and render config
- Headless Chrome captures frames via CDP
- ffmpeg encodes frames to MP4/WebM/MOV
- Render job status polling
- Download rendered video

### agent-api — Agent-friendly API for programmatic composition

Status: planned

Acceptance:
- REST API for creating compositions from JSON
- Template system for common video patterns
- Batch render API
- Webhook/callback on render completion

### deterministic-rendering — Deterministic rendering fixes (startResolver, async timeline)

Status: planned

Acceptance:
- Composition start time resolution works across wrapper elements
- Timeline registration is synchronous
- No runtime network fetches in compositions
- Reproducible renders in Docker

### desktop-packaging — Desktop installer (Tauri/Electron)

Status: planned

Acceptance:
- Tauri app packages backend + frontend
- Click-to-run installer for Windows/macOS/Linux
- Bundled Chrome/ffmpeg or system detection
- Offline-capable for local renders

