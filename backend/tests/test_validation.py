"""Tests for composition validation service."""
import pytest

from app.services.validation import validate_composition_html, validate_render_config


class TestValidateCompositionHTML:
    """Tests for validate_composition_html function."""

    def test_valid_composition(self):
        """Test valid composition with all required attributes."""
        html = """
<div id="root" data-composition-id="main" data-start="0" data-duration="10"
     data-width="1920" data-height="1080" data-fps="30">
  <div class="box"></div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  tl.to(".box", { x: 200, duration: 10 }, 0);
  window.__timelines = { main: tl };
</script>
"""
        result = validate_composition_html(html)
        assert result.valid is True
        assert result.errors == []

    def test_missing_root_composition_id(self):
        """Test composition missing data-composition-id."""
        html = """
<div id="root" data-start="0" data-duration="10" data-width="1920" data-height="1080" data-fps="30">
  <div class="box"></div>
</div>
"""
        result = validate_composition_html(html)
        assert result.valid is False
        assert any("data-composition-id" in e for e in result.errors)

    def test_missing_required_attributes(self):
        """Test composition missing various required attributes."""
        html = """
<div id="root" data-composition-id="main">
  <div class="box"></div>
</div>
"""
        result = validate_composition_html(html)
        assert result.valid is False
        assert len(result.errors) >= 5  # Missing start, duration, width, height, fps

    def test_warning_no_timeline(self):
        """Test warning when no timeline registered."""
        html = """
<div id="root" data-composition-id="main" data-start="0" data-duration="10"
     data-width="1920" data-height="1080" data-fps="30">
  <div class="box"></div>
</div>
"""
        result = validate_composition_html(html)
        assert result.valid is True
        assert any("timeline" in w.lower() for w in result.warnings)

    def test_warning_timeline_not_paused(self):
        """Test warning when timeline not created with paused: true."""
        html = """
<div id="root" data-composition-id="main" data-start="0" data-duration="10"
     data-width="1920" data-height="1080" data-fps="30">
  <div class="box"></div>
</div>
<script>
  const tl = gsap.timeline({});
  tl.to(".box", { x: 200, duration: 10 }, 0);
  window.__timelines = { main: tl };
</script>
"""
        result = validate_composition_html(html)
        assert result.valid is True
        assert any("paused" in w.lower() for w in result.warnings)

    def test_warning_video_missing_track_index(self):
        """Test warning for video without data-track-index."""
        html = """
<div id="root" data-composition-id="main" data-start="0" data-duration="10"
     data-width="1920" data-height="1080" data-fps="30">
  <video src="clip.mp4" muted playsinline></video>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  window.__timelines = { main: tl };
</script>
"""
        result = validate_composition_html(html)
        assert result.valid is True
        assert any("data-track-index" in w for w in result.warnings)

    def test_warning_video_missing_muted_playsinline(self):
        """Test warning for video without muted/playsinline."""
        html = """
<div id="root" data-composition-id="main" data-start="0" data-duration="10"
     data-width="1920" data-height="1080" data-fps="30">
  <video src="clip.mp4" data-track-index="0"></video>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  window.__timelines = { main: tl };
</script>
"""
        result = validate_composition_html(html)
        assert result.valid is True
        assert any("muted" in w and "playsinline" in w for w in result.warnings)

    def test_nested_composition_markers_warning(self):
        """Test warning for nested composition markers without explicit start."""
        html = """
<div id="root" data-composition-id="main" data-start="0" data-duration="10"
     data-width="1920" data-height="1080" data-fps="30">
  <div data-composition-id="child">
    <div class="inner"></div>
  </div>
</div>
<script>
  const tl = gsap.timeline({ paused: true });
  window.__timelines = { main: tl };
</script>
"""
        result = validate_composition_html(html)
        assert result.valid is True
        assert any("data-composition-id" in w and "data-start" in w for w in result.warnings)


class TestValidateRenderConfig:
    """Tests for validate_render_config function."""

    def test_valid_defaults(self):
        """Test valid config with defaults."""
        config = {}
        result = validate_render_config(config)
        assert result.valid is True
        assert result.errors == []

    def test_valid_custom_config(self):
        """Test valid custom config."""
        config = {"format": "webm", "quality": "medium", "fps": 60, "resolution": "1920x1080"}
        result = validate_render_config(config)
        assert result.valid is True

    def test_invalid_format(self):
        """Test invalid format."""
        config = {"format": "avi"}
        result = validate_render_config(config)
        assert result.valid is False
        assert any("format" in e.lower() for e in result.errors)

    def test_invalid_quality(self):
        """Test invalid quality."""
        config = {"quality": "extreme"}
        result = validate_render_config(config)
        assert result.valid is False
        assert any("quality" in e.lower() for e in result.errors)

    def test_invalid_fps_zero(self):
        """Test invalid FPS (zero)."""
        config = {"fps": 0}
        result = validate_render_config(config)
        assert result.valid is False
        assert any("fps" in e.lower() for e in result.errors)

    def test_invalid_fps_negative(self):
        """Test invalid FPS (negative)."""
        config = {"fps": -30}
        result = validate_render_config(config)
        assert result.valid is False

    def test_invalid_fps_too_high(self):
        """Test invalid FPS (too high)."""
        config = {"fps": 200}
        result = validate_render_config(config)
        assert result.valid is False

    def test_warning_unusual_resolution(self):
        """Test warning for unusual resolution format."""
        config = {"resolution": "custom-weird-format"}
        result = validate_render_config(config)
        assert result.valid is True
        assert any("resolution" in w.lower() for w in result.warnings)

    def test_valid_named_resolution(self):
        """Test valid named resolution presets."""
        for preset in ["landscape-4k", "portrait-1080", "landscape-720", "portrait-4k"]:
            config = {"resolution": preset}
            result = validate_render_config(config)
            assert result.valid is True
            assert not any("resolution" in w.lower() for w in result.warnings)

    def test_valid_explicit_resolution(self):
        """Test valid explicit WxH resolution."""
        config = {"resolution": "3840x2160"}
        result = validate_render_config(config)
        assert result.valid is True
        assert not any("resolution" in w.lower() for w in result.warnings)