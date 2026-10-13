"""Composition validation service."""
import re
from dataclasses import dataclass
from typing import Any


@dataclass
class ValidationResult:
    """Result of composition validation."""
    valid: bool
    errors: list[str]
    warnings: list[str]


REQUIRED_ROOT_ATTRS = [
    "data-composition-id",
    "data-start",
    "data-duration",
    "data-width",
    "data-height",
    "data-fps",
]

COMPOSITION_MARKERS = [
    "data-composition-id",
    "data-composition-src",
    "data-composition-file",
]


def validate_composition_html(html: str) -> ValidationResult:
    """Validate composition HTML for required attributes and structure."""
    errors: list[str] = []
    warnings: list[str] = []

    # Check for root composition element
    root_match = re.search(
        r'<(\w+)([^>]*data-composition-id[^>]*)>', html, re.IGNORECASE
    )
    if not root_match:
        errors.append("Missing root element with data-composition-id attribute")
        return ValidationResult(valid=False, errors=errors, warnings=warnings)

    root_tag = root_match.group(1)
    root_attrs = root_match.group(2)

    # Check required attributes on root
    for attr in REQUIRED_ROOT_ATTRS:
        if f'{attr}=' not in root_attrs:
            errors.append(f"Root element missing required attribute: {attr}")

    # Check for timeline registration
    if "window.__timelines" not in html:
        warnings.append("No GSAP timeline registered (window.__timelines)")

    # Check for paused timeline
    if "paused: true" not in html and "paused:true" not in html:
        warnings.append("Timeline should be created with paused: true")

    # Check for media elements with data-track-index
    video_matches = re.findall(r'<video[^>]*>', html, re.IGNORECASE)
    for i, video in enumerate(video_matches):
        if "data-track-index" not in video:
            warnings.append(f"Video element #{i+1} missing data-track-index attribute")
        if "muted" not in video and "playsinline" not in video:
            warnings.append(f"Video element #{i+1} should have muted and playsinline")

    # Check for nested composition markers (startResolver fix validation)
    # Warn if composition markers appear on non-direct children without wrapper handling
    marker_elements = re.findall(
        r'<(\w+)([^>]*(?:data-composition-(?:id|src|file))[^>]*)>',
        html,
        re.IGNORECASE,
    )
    if len(marker_elements) > 1:
        # Multiple composition markers - check nesting
        for tag, attrs in marker_elements:
            if "data-composition-id" in attrs and "data-start" not in attrs:
                warnings.append(
                    f"Composition element <{tag}> has data-composition-id but no explicit data-start"
                )

    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )


def validate_render_config(config: dict[str, Any]) -> ValidationResult:
    """Validate render job configuration."""
    errors: list[str] = []
    warnings: list[str] = []

    valid_formats = {"mp4", "webm", "mov", "png-sequence"}
    valid_qualities = {"low", "medium", "high", "ultra"}

    fmt = config.get("format", "mp4")
    if fmt not in valid_formats:
        errors.append(f"Invalid format: {fmt}. Must be one of {valid_formats}")

    quality = config.get("quality", "high")
    if quality not in valid_qualities:
        errors.append(f"Invalid quality: {quality}. Must be one of {valid_qualities}")

    fps = config.get("fps")
    if fps is not None:
        if not isinstance(fps, (int, float)) or fps <= 0 or fps > 120:
            errors.append("FPS must be a number between 1 and 120")

    resolution = config.get("resolution")
    if resolution is not None:
        if not isinstance(resolution, str) or not re.match(
            r"^\d+x\d+$|^(landscape|portrait)-(4k|1080|720)$", resolution
        ):
            warnings.append(
                f"Unusual resolution format: {resolution}. Expected WxH or named preset."
            )

    return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=warnings)