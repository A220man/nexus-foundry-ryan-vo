# Changelog

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-10-13

### Added
- FastAPI backend with SQLite persistence using SQLAlchemy 2.0
- Composition CRUD API with validation for required data-attributes
- Render job management (create, list, status polling)
- Template system with parameter substitution support
- React + TypeScript + Vite frontend with composition management UI
- Typed API client with error handling
- Composition list with pagination, search, and delete
- Composition form with HTML/CSS/JS tabs and live validation
- Composition detail view with render job management
- Templates page with built-in templates (lower third, center title, slide transition, social story)
- Dockerfiles for backend (Python 3.12 + Chromium + ffmpeg) and frontend (nginx)
- Docker Compose for local development and production
- Comprehensive test suite: 14 backend tests, 3 frontend tests
- Health check endpoint
- CORS configuration
- Input validation and sanitization

### Technical Details
- Backend: FastAPI 0.115, SQLAlchemy 2.0, Pydantic 2, pytest 8
- Frontend: React 18, TypeScript 5, Vite 5, Vitest 2, React Router 6
- Database: SQLite with async support (aiosqlite)
- Validation: Required attributes (data-composition-id, data-start, data-duration, data-width, data-height, data-fps), GSAP timeline checks, video element attributes
- Rendering: Designed for headless Chrome CDP + ffmpeg (implementation in next phase)

## [Unreleased]

### Planned
- Headless Chrome rendering service with CDP frame capture
- ffmpeg encoding pipeline (MP4, WebM, MOV/ProRes, PNG sequence)
- Render job queue with worker processes
- Webhook/callback on render completion
- Monaco editor integration for composition editing
- Live iframe preview
- Authentication with Keycloak OIDC + SAML broker
- LLM-assisted composition generation (opt-in)
- Deterministic rendering fixes (startResolver, async timeline registration)
- Desktop packaging with Tauri