"""Test configuration and fixtures."""
import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_session, set_session_factory
from app.main import create_app
from app.models.composition import Composition, RenderJob, CompositionTemplate


# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


pytestmark = pytest.mark.asyncio


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    # Override the session factory for background tasks
    set_session_factory(async_session)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(test_session) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with overridden database dependency."""
    app = create_app()

    async def override_get_session():
        yield test_session

    app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_composition_data() -> dict:
    """Sample composition data for testing."""
    return {
        "name": "Test Composition",
        "description": "A test composition",
        "html_content": '<div id="root" data-composition-id="root" data-start="0" data-duration="5" data-width="1920" data-height="1080" data-fps="30"><div class="box" data-animate="opacity: 0 1 0 5">Hello</div></div>',
        "css_content": ".box { width: 100px; height: 100px; background: red; }",
        "js_content": "function registerTimelines() { gsap.timeline({paused: true}).to('.box', {opacity: 1, duration: 5}); }",
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "duration": 5.0,
        "meta": {},
    }


@pytest.fixture
def invalid_composition_html() -> str:
    """Invalid composition HTML (missing required attributes)."""
    return '<div id="root"><div class="box">Hello</div></div>'


@pytest.fixture
def sample_template_data() -> dict:
    """Sample template data for testing."""
    return {
        "name": "Test Template",
        "description": "A test template",
        "category": "social",
        "html_template": '<div id="root" data-composition-id="root" data-start="0" data-duration="5" data-width="1920" data-height="1080" data-fps="30"><div class="placeholder" data-animate="opacity: 0 1 0 5">Template</div></div>',
        "css_template": ".placeholder { width: 100px; height: 100px; background: blue; }",
        "js_template": "function registerTimelines() { gsap.timeline({paused: true}).to('.placeholder', {opacity: 1, duration: 5}); }",
        "default_width": 1920,
        "default_height": 1080,
        "default_fps": 30,
        "default_duration": 5.0,
        "parameters_schema": {"title": {"type": "string", "default": "Default Title"}},
    }
