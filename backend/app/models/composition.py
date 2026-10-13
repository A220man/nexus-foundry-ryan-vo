"""Composition models."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Index,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    """Current UTC time."""
    return datetime.now(timezone.utc)


class Composition(Base):
    """Video composition model."""

    __tablename__ = "compositions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    html_content: Mapped[str] = mapped_column(Text, nullable=False)
    css_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    js_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    width: Mapped[int] = mapped_column(default=1920)
    height: Mapped[int] = mapped_column(default=1080)
    fps: Mapped[int] = mapped_column(default=30)
    duration: Mapped[float] = mapped_column(default=10.0)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    render_jobs: Mapped[list["RenderJob"]] = relationship(
        back_populates="composition", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_compositions_created_at", "created_at"),
        Index("ix_compositions_name", "name"),
    )


class RenderJob(Base):
    """Video render job model."""

    __tablename__ = "render_jobs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    composition_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("compositions.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), default="pending", nullable=False
    )  # pending, running, completed, failed
    format: Mapped[str] = mapped_column(String(16), default="mp4")
    quality: Mapped[str] = mapped_column(String(16), default="high")
    output_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    progress: Mapped[int] = mapped_column(default=0)  # 0-100
    total_frames: Mapped[int] = mapped_column(default=0)
    completed_frames: Mapped[int] = mapped_column(default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    composition: Mapped[Composition] = relationship(back_populates="render_jobs")

    __table_args__ = (
        Index("ix_render_jobs_composition_id", "composition_id"),
        Index("ix_render_jobs_status", "status"),
        Index("ix_render_jobs_created_at", "created_at"),
    )


class CompositionTemplate(Base):
    """Reusable composition templates."""

    __tablename__ = "composition_templates"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    html_template: Mapped[str] = mapped_column(Text, nullable=False)
    css_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    js_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_width: Mapped[int] = mapped_column(default=1920)
    default_height: Mapped[int] = mapped_column(default=1080)
    default_fps: Mapped[int] = mapped_column(default=30)
    default_duration: Mapped[float] = mapped_column(default=10.0)
    parameters_schema: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("name", name="uq_template_name"),
        Index("ix_templates_category", "category"),
    )