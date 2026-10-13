"""Composition API routes."""
from datetime import datetime, timezone
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session, create_tables
from app.models.composition import Composition, RenderJob, CompositionTemplate
from app.services.validation import validate_composition_html, validate_render_config

router = APIRouter(prefix="/api/compositions", tags=["compositions"])


# Pydantic models
class CompositionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    html_content: str = Field(..., min_length=1)
    css_content: str | None = None
    js_content: str | None = None
    width: int = Field(default=1920, ge=1, le=7680)
    height: int = Field(default=1080, ge=1, le=4320)
    fps: int = Field(default=30, ge=1, le=120)
    duration: float = Field(default=10.0, gt=0, le=3600)
    meta: dict = Field(default_factory=dict)


class CompositionCreate(CompositionBase):
    pass


class CompositionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    html_content: str | None = None
    css_content: str | None = None
    js_content: str | None = None
    width: int | None = Field(None, ge=1, le=7680)
    height: int | None = Field(None, ge=1, le=4320)
    fps: int | None = Field(None, ge=1, le=120)
    duration: float | None = Field(None, gt=0, le=3600)
    meta: dict | None = None


class CompositionResponse(CompositionBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompositionListResponse(BaseModel):
    items: list[CompositionResponse]
    total: int
    page: int
    page_size: int


class ValidationResponse(BaseModel):
    valid: bool
    errors: list[str]
    warnings: list[str]


class RenderJobCreate(BaseModel):
    format: str = Field(default="mp4", pattern="^(mp4|webm|mov|png-sequence)$")
    quality: str = Field(default="high", pattern="^(low|medium|high|ultra)$")
    fps: int | None = Field(None, ge=1, le=120)
    resolution: str | None = None


class RenderJobResponse(BaseModel):
    id: str
    composition_id: str
    status: str
    format: str
    quality: str
    output_path: str | None
    error_message: str | None
    progress: int
    total_frames: int
    completed_frames: int
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    category: str = Field(..., min_length=1, max_length=64)
    html_template: str = Field(..., min_length=1)
    css_template: str | None = None
    js_template: str | None = None
    default_width: int = Field(default=1920, ge=1, le=7680)
    default_height: int = Field(default=1080, ge=1, le=4320)
    default_fps: int = Field(default=30, ge=1, le=120)
    default_duration: float = Field(default=10.0, gt=0, le=3600)
    parameters_schema: dict = Field(default_factory=dict)


class TemplateCreate(TemplateBase):
    pass


class TemplateResponse(TemplateBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Dependency for DB session
SessionDep = Annotated[AsyncSession, Depends(get_session)]


# Startup: create tables
@router.on_event("startup")
async def startup():
    await create_tables()


# Composition CRUD
@router.post(
    "",
    response_model=CompositionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_composition(
    composition: CompositionCreate,
    session: SessionDep,
) -> Composition:
    """Create a new composition."""
    # Validate HTML
    validation = validate_composition_html(composition.html_content)
    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"errors": validation.errors, "warnings": validation.warnings},
        )

    db_composition = Composition(**composition.model_dump())
    session.add(db_composition)
    await session.flush()
    await session.refresh(db_composition)
    return db_composition


@router.get("", response_model=CompositionListResponse)
async def list_compositions(
    session: SessionDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
) -> CompositionListResponse:
    """List compositions with pagination and optional search."""
    query = select(Composition)
    count_query = select(func.count(Composition.id))

    if search:
        search_term = f"%{search}%"
        query = query.where(
            Composition.name.ilike(search_term) | Composition.description.ilike(search_term)
        )
        count_query = count_query.where(
            Composition.name.ilike(search_term) | Composition.description.ilike(search_term)
        )

    total = await session.scalar(count_query) or 0
    query = query.order_by(Composition.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size)

    result = await session.execute(query)
    items = result.scalars().all()

    return CompositionListResponse(
        items=[CompositionResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


# Templates (must come before /{composition_id} routes)
@router.post(
    "/templates",
    response_model=TemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    template: TemplateCreate,
    session: SessionDep,
) -> CompositionTemplate:
    """Create a composition template."""
    db_template = CompositionTemplate(**template.model_dump())
    session.add(db_template)
    try:
        await session.flush()
    except Exception as e:
        if "UNIQUE constraint failed" in str(e) and "composition_templates.name" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Template with this name already exists",
            )
        raise
    await session.refresh(db_template)
    return db_template


@router.get("/templates", response_model=list[TemplateResponse])
async def list_templates(
    session: SessionDep,
    category: str | None = Query(None),
) -> list[CompositionTemplate]:
    """List composition templates."""
    query = select(CompositionTemplate).order_by(CompositionTemplate.category, CompositionTemplate.name)
    if category:
        query = query.where(CompositionTemplate.category == category)
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    session: SessionDep,
) -> CompositionTemplate:
    """Get a template by ID."""
    result = await session.execute(
        select(CompositionTemplate).where(CompositionTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


# Composition detail routes (after templates to avoid path conflicts)
@router.get("/{composition_id}", response_model=CompositionResponse)
async def get_composition(
    composition_id: str,
    session: SessionDep,
) -> Composition:
    """Get a composition by ID."""
    result = await session.execute(
        select(Composition).where(Composition.id == composition_id)
    )
    composition = result.scalar_one_or_none()
    if not composition:
        raise HTTPException(status_code=404, detail="Composition not found")
    return composition


@router.patch("/{composition_id}", response_model=CompositionResponse)
async def update_composition(
    composition_id: str,
    update: CompositionUpdate,
    session: SessionDep,
) -> Composition:
    """Update a composition."""
    result = await session.execute(
        select(Composition).where(Composition.id == composition_id)
    )
    composition = result.scalar_one_or_none()
    if not composition:
        raise HTTPException(status_code=404, detail="Composition not found")

    update_data = update.model_dump(exclude_unset=True)

    # Validate HTML if provided
    if "html_content" in update_data:
        validation = validate_composition_html(update_data["html_content"])
        if not validation.valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"errors": validation.errors, "warnings": validation.warnings},
            )

    for field, value in update_data.items():
        setattr(composition, field, value)

    composition.updated_at = datetime.now(timezone.utc)
    await session.flush()
    await session.refresh(composition)
    return composition


@router.delete("/{composition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_composition(
    composition_id: str,
    session: SessionDep,
) -> None:
    """Delete a composition."""
    result = await session.execute(
        select(Composition).where(Composition.id == composition_id)
    )
    composition = result.scalar_one_or_none()
    if not composition:
        raise HTTPException(status_code=404, detail="Composition not found")

    await session.delete(composition)


# Validation endpoint
@router.post("/validate", response_model=ValidationResponse)
async def validate_composition(html_content: str) -> ValidationResponse:
    """Validate composition HTML without saving."""
    result = validate_composition_html(html_content)
    return ValidationResponse(
        valid=result.valid,
        errors=result.errors,
        warnings=result.warnings,
    )


# Render jobs
@router.post(
    "/{composition_id}/render",
    response_model=RenderJobResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_render_job(
    composition_id: str,
    render_config: RenderJobCreate,
    session: SessionDep,
) -> RenderJob:
    """Create a render job for a composition."""
    # Verify composition exists
    result = await session.execute(
        select(Composition).where(Composition.id == composition_id)
    )
    composition = result.scalar_one_or_none()
    if not composition:
        raise HTTPException(status_code=404, detail="Composition not found")

    # Validate render config
    config_dict = render_config.model_dump()
    validation = validate_render_config(config_dict)
    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"errors": validation.errors, "warnings": validation.warnings},
        )

    render_job = RenderJob(
        composition_id=composition_id,
        format=render_config.format,
        quality=render_config.quality,
        status="pending",
    )
    session.add(render_job)
    await session.flush()
    await session.refresh(render_job)
    return render_job


@router.get("/{composition_id}/renders", response_model=list[RenderJobResponse])
async def list_render_jobs(
    composition_id: str,
    session: SessionDep,
) -> list[RenderJob]:
    """List render jobs for a composition."""
    result = await session.execute(
        select(RenderJob)
        .where(RenderJob.composition_id == composition_id)
        .order_by(RenderJob.created_at.desc())
    )
    return result.scalars().all()


@router.get("/renders/{render_id}", response_model=RenderJobResponse)
async def get_render_job(
    render_id: str,
    session: SessionDep,
) -> RenderJob:
    """Get a render job by ID."""
    result = await session.execute(
        select(RenderJob).where(RenderJob.id == render_id)
    )
    render_job = result.scalar_one_or_none()
    if not render_job:
        raise HTTPException(status_code=404, detail="Render job not found")
    return render_job