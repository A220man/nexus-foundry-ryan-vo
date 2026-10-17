# Nexus Foundry — Ryan Vo | AI & Machine Learning

> Work in progress. This checkpoint may be incomplete or fail tests. See PLAN.md and STATUS.md before use.

Write HTML. Render video. Built for agents.

Nexus Foundry is a video composition and rendering platform where developers and agents create video content by writing HTML compositions with GSAP timelines. It provides a FastAPI backend with SQLite persistence, a React frontend with Monaco editor and live preview, and a planned headless Chrome + ffmpeg rendering pipeline — all designed for reproducible, agent-friendly video generation.

## Problem & Approach

**Problem:** Creating video content programmatically requires brittle screen recording, complex video editing APIs, or manual timeline manipulation. Existing tools lack a clean HTML-to-video pipeline with deterministic rendering suitable for AI agents.

**Approach:** Nexus Foundry treats video compositions as HTML documents with GSAP timelines. Compositions are stored, versioned, and rendered through a headless Chrome instance that captures frames via CDP, then encoded with ffmpeg. The API is designed for programmatic access — agents can create, validate, and render compositions via REST endpoints.

**Intended Users:** AI agents generating video content, developers building video automation pipelines, content creators needing reproducible renders.

## Features

- **Composition CRUD**: Create, read, update, delete video compositions with full HTML/CSS/JS
- **Monaco Editor**: Syntax-highlighted editor for HTML, CSS, and JavaScript with tab switching
- **Live Preview**: Real-time iframe preview rendering composition HTML with GSAP from CDN
- **Validation**: Real-time composition validation for required data-attributes and GSAP timeline structure
- **Templates**: Reusable composition templates with parameter substitution
- **Agent-Friendly API**: REST endpoints with typed schemas for programmatic composition management
- **Modern Stack**: FastAPI + SQLAlchemy + React + TypeScript + Vite

> *Rendering Pipeline, Deterministic Rendering, and Webhook support are planned — see PLAN.md.*

## Architecture

```mermaid
graph TB
    subgraph Frontend[React + TypeScript + Vite]
        UI[Composition Manager]
        Editor[Monaco Editor]
        Preview[Live Preview]
    end

    subgraph Backend[FastAPI + Python 3.12]
        API[REST API]
        Val[Validation Service]
        Store[(SQLite)]
    end

    UI --> API
    Editor --> API
    Preview -->|preview only| API
    API --> Val
    API --> Store

    %% Planned: Rendering pipeline
    subgraph Rendering[Planned: Headless Chrome + ffmpeg]
        CDP[Chrome DevTools Protocol]
        Capture[Frame Capture]
        Encode[ffmpeg Encoder]
    end
    Store -.-> Rendering

### Quick Start

### Prerequisites
- Docker & Docker Compose
- Or: Python 3.12, Node 24

### With Docker (Recommended)

```bash
# Clone and enter directory
cd nexus-foundry-ryan-vo

# Start all services
compose up -d

# Frontend: http://127.0.0.1:5173
# Backend API: http://127.0.0.1:8000
# API Docs: http://127.0.0.1:8000/docs
```

### Local Development

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Frontend: http://127.0.0.1:5173
# Backend API: http://127.0.0.1:8000
```


## API Reference

### Compositions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compositions` | Create composition |
| GET | `/api/compositions` | List compositions (paginated, searchable) |
| GET | `/api/compositions/{id}` | Get composition |
| PATCH | `/api/compositions/{id}` | Update composition |
| DELETE | `/api/compositions/{id}` | Delete composition |
| POST | `/api/compositions/validate` | Validate HTML without saving |

### Render Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compositions/{id}/render` | Create render job |
| GET | `/api/compositions/{id}/renders` | List render jobs for composition |
| GET | `/api/compositions/renders/{id}` | Get render job status |

> Render job endpoints create and track jobs in the database. Actual video rendering (headless Chrome + ffmpeg) is planned — see PLAN.md.

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compositions/templates` | Create template |
| GET | `/api/compositions/templates` | List templates (filterable by category) |
| GET | `/api/compositions/templates/{id}` | Get template |

## Composition Format

Compositions are HTML documents with required data attributes on the root element:

```html
<div id="root" 
     data-composition-id="main" 
     data-start="0" 
     data-duration="10"
     data-width="1920" 
     data-height="1080" 
     data-fps="30">
  <!-- Your composition elements -->
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  // Add animations
  tl.to(".element", { x: 200, duration: 10 }, 0);
  window.__timelines = { main: tl };
</script>
```

**Required attributes:**
- `data-composition-id`: Unique identifier for the composition
- `data-start`: Start time in seconds
- `data-duration`: Duration in seconds
- `data-width`: Width in pixels
- `data-height`: Height in pixels
- `data-fps`: Frames per second

**Video elements** need:
- `data-track-index`: Track index for layering
- `muted` and `playsinline` attributes

## AI/ML Evaluation

Nexus Foundry enables AI agents to generate video content programmatically by authoring HTML compositions with GSAP timelines via REST API. The evaluation focus is on composition validation correctness — ensuring generated compositions conform to the required data-attribute schema before rendering.

```bash
# Run validation test suite
cd backend
PYTHONPATH=. python -m pytest tests/test_validation.py tests/test_api_compositions.py -v

# Run frontend tests (editor + preview + API client)
cd frontend
npm test
```

**Metrics tracked:**
- Composition validation pass rate (required attributes, timeline structure, video element checks)
- API workflow correctness (create, validate, list, paginate, search)
- Preview document generation correctness (HTML/CSS/JS combination)

**AI/ML purpose:** Agents author HTML video compositions and validate them through the API before a deterministic headless Chrome + ffmpeg rendering pipeline (planned). The validation service catches malformed compositions — missing data-attributes, unregistered timelines, videos without track indices — so agents can iterate without producing unrenderable output.

**Planned evaluation:** Frame-level PSNR/SSIM against reference renders, determinism score (byte-identical renders across runs), and render latency percentiles once the rendering pipeline is implemented.

**Known limitations:**
- No rendering pipeline implemented yet — compositions can only be created, validated, and previewed in-browser
- No actual video output or quality metrics measured
- Live preview depends on a CDN-hosted GSAP script (dev/preview only, not the render path)

## Security Limitations

- No authentication in current version (designed for local/trusted network use)
- Live preview loads GSAP from CDN — never render untrusted compositions
- File storage is local filesystem — no encryption at rest
- CORS configured for localhost only by default
- No rate limiting on API endpoints

Authentication with Keycloak OIDC + SAML brokering is planned. See PLAN.md.

## Provider Configuration

| Provider | LLM_PROVIDER | LLM_BASE_URL | Notes |
|----------|-------------|--------------|-------|
| OpenAI | openai-compatible | https://api.openai.com/v1 | Default |
| Anthropic | anthropic | https://api.anthropic.com | Messages API |
| Gemini | gemini | https://generativelanguage.googleapis.com | generateContent |
| Ollama | ollama | http://localhost:11434 | Local models |
| LiteLLM | openai-compatible | http://localhost:4000 | Proxy for multiple |
| OpenRouter | openai-compatible | https://openrouter.ai/api/v1 | Multi-model |

Set `LLM_API_KEY` to enable AI-assisted composition features (future).

## SSO/SAML Setup (Keycloak)

Keycloak integration is planned for multi-user deployments. The backend will support:
- OIDC authorization code flow with PKCE
- SAML 2.0 via Keycloak identity brokering
- Role-based access: `viewer`, `operator`, `admin`
- HttpOnly SameSite cookies with CSRF protection

## Deployment

### Production Checklist
- [ ] Set `DEBUG=false`
- [ ] Configure proper `CORS_ORIGINS`
- [ ] Use PostgreSQL instead of SQLite (`DATABASE_URL=postgresql+asyncpg://...`)
- [ ] Set up TLS reverse proxy (nginx/Traefik)
- [ ] Configure backup for `data/` volume
- [ ] Set `LLM_API_KEY` if using AI features
- [ ] Enable Keycloak for authentication

### Docker Run
```bash
compose up -d
```

### Backup/Restore
```bash
# Backup
docker run --rm -v nexus-foundry-data:/data -v $(pwd):/backup alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# Restore
docker run --rm -v nexus-foundry-data:/data -v $(pwd):/backup alpine tar xzf /backup/backup-20240101.tar.gz -C /
```

## Development

### Running Tests

```bash
# Backend tests
cd backend
PYTHONPATH=. .venv/bin/python -m pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Frontend
cd frontend
npm run lint
npm run build  # Includes TypeScript check
```

## Project Structure

```
nexus-foundry-ryan-vo/
├── backend/
│   ├── app/
│   │   ├── api/compositions.py    # REST endpoints
│   │   ├── models/composition.py  # SQLAlchemy models
│   │   ├── core/config.py         # Settings
│   │   ├── core/database.py       # DB session
│   │   ├── services/validation.py # Composition validation
│   │   └── main.py                # FastAPI app
│   ├── tests/                     # Pytest tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/client.ts          # Typed API client
│   │   ├── components/            # React components
│   │   ├── utils/                 # Utilities (preview builder)
│   │   ├── types/api.ts           # TypeScript types
│   │   ├── App.tsx                # Main app
│   │   ├── styles.css             # Global styles
│   │   └── main.tsx               # Entry point
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
├── compose.yaml
├── pyproject.toml
├── .env.example
├── .gitignore
├── LICENSE
├── CHANGELOG.md
├── PLAN.md
└── feature-plan.json
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

MIT License — Copyright (c) 2024 Ryan Vo <ryandtvo@gmail.com>

See [LICENSE](LICENSE) for details.