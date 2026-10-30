"""Video rendering service using headless Chrome and ffmpeg."""
import asyncio
import subprocess
import tempfile
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.composition import Composition, RenderJob


class RenderingError(Exception):
    pass


async def render_composition(session, render_job, composition, output_dir):
    render_job.status = "running"
    render_job.started_at = await _utc_now()
    await session.flush()

    with tempfile.TemporaryDirectory(prefix=f"render_{render_job.id}_") as temp_dir:
        temp_path = Path(temp_dir)
        frames_dir = temp_path / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        html_file = await _generate_preview_html(composition, temp_path)
        total_frames = await _capture_frames(html_file, frames_dir, composition, render_job, session)

        render_job.total_frames = total_frames
        render_job.completed_frames = total_frames
        render_job.progress = 100
        await session.flush()

        output_file = await _encode_video(frames_dir, output_dir, composition, render_job)
        return output_file


async def _generate_preview_html(composition, temp_dir):
    css_part = f"<style>{composition.css_content}</style>" if composition.css_content else ""
    js_part = f"<script>{composition.js_content}</script>" if composition.js_content else ""

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{composition.name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ overflow: hidden; background: #000; }}
        #root {{ width: 100%; height: 100%; }}
    </style>
    {css_part}
</head>
<body>
    <div id="root-container" style="width: {composition.width}px; height: {composition.height}px;">
        {composition.html_content}
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
    {js_part}
    <script>
        window.__timelines = window.__timelines || [];
        function waitForGsap() {{
            return new Promise(resolve => {{
                const check = () => {{
                    if (typeof gsap !== "undefined") {{ resolve(); }}
                    else {{ setTimeout(check, 50); }}
                }};
                check();
            }});
        }}
        async function initTimelines() {{
            await waitForGsap();
            if (typeof registerTimelines === "function") {{ registerTimelines(); }}
        }}
        initTimelines();
    </script>
</body>
</html>"""

    html_file = temp_dir / "preview.html"
    html_file.write_text(html_content, encoding="utf-8")
    return html_file


async def _capture_frames(html_file, frames_dir, composition, render_job, session):
    total_frames = int(composition.duration * composition.fps)

    try:
        from playwright.async_api import async_playwright
        return await _capture_frames_playwright(html_file, frames_dir, composition, render_job, session)
    except ImportError:
        pass

    try:
        import pyppeteer
        return await _capture_frames_pyppeteer(html_file, frames_dir, composition, render_job, session)
    except ImportError:
        pass

    return await _create_placeholder_frames(frames_dir, total_frames, composition, render_job, session)


async def _capture_frames_playwright(html_file, frames_dir, composition, render_job, session):
    from playwright.async_api import async_playwright

    total_frames = int(composition.duration * composition.fps)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
        )
        page = await browser.new_page()
        await page.set_viewport_size({"width": composition.width, "height": composition.height})

        await page.goto(f"file://{html_file.absolute()}", wait_until="networkidle")
        await page.wait_for_function("typeof gsap !== 'undefined'")
        await page.wait_for_function("typeof window.__timelines !== 'undefined'")

        for i in range(total_frames):
            progress = i / max(total_frames - 1, 1)
            time = progress * composition.duration

            await page.evaluate(
                "(t) => { if (window.__timelines) { window.__timelines.forEach(tl => { if (tl && tl.seek) tl.seek(t); }); } }",
                time
            )

            await page.wait_for_timeout(50)

            frame_path = frames_dir / f"frame_{i:06d}.png"
            await page.screenshot(path=str(frame_path), clip={
                "x": 0, "y": 0, "width": composition.width, "height": composition.height
            })

            render_job.completed_frames = i + 1
            render_job.progress = int(((i + 1) / total_frames) * 100)
            await session.flush()

        await browser.close()

    return total_frames


async def _capture_frames_pyppeteer(html_file, frames_dir, composition, render_job, session):
    import pyppeteer

    total_frames = int(composition.duration * composition.fps)

    browser = await pyppeteer.launch(
        headless=True,
        args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
    )
    page = await browser.newPage()
    await page.setViewport({"width": composition.width, "height": composition.height})

    await page.goto(f"file://{html_file.absolute()}", {"waitUntil": "networkidle0"})
    await page.waitForFunction("typeof gsap !== 'undefined'")
    await page.waitForFunction("typeof window.__timelines !== 'undefined'")

    for i in range(total_frames):
        progress = i / max(total_frames - 1, 1)
        time = progress * composition.duration

        await page.evaluate(
            "(t) => { if (window.__timelines) { window.__timelines.forEach(tl => { if (tl && tl.seek) tl.seek(t); }); } }",
            time
        )

        await asyncio.sleep(0.05)

        frame_path = frames_dir / f"frame_{i:06d}.png"
        await page.screenshot({"path": str(frame_path), "clip": {
            "x": 0, "y": 0, "width": composition.width, "height": composition.height
        }})

        render_job.completed_frames = i + 1
        render_job.progress = int(((i + 1) / total_frames) * 100)
        await session.flush()

    await browser.close()

    return total_frames


async def _create_placeholder_frames(frames_dir, total_frames, composition, render_job, session):
    for i in range(total_frames):
        progress = i / max(total_frames - 1, 1)
        r = int(50 + progress * 100)
        g = int(100 + progress * 50)
        b = int(150 + progress * 50)

        frame_path = frames_dir / f"frame_{i:06d}.png"

        cmd = [
            "ffmpeg", "-y", "-f", "lavfi", "-i",
            f"color=c=0x{r:02x}{g:02x}{b:02x}:size={composition.width}x{composition.height}:rate=1",
            "-frames:v", "1", str(frame_path)
        ]
        subprocess.run(cmd, check=True, capture_output=True)

        render_job.completed_frames = i + 1
        render_job.progress = int(((i + 1) / total_frames) * 100)
        await session.flush()

    return total_frames


async def _encode_video(frames_dir, output_dir, composition, render_job):
    output_filename = f"{composition.name.replace(' ', '_')}_{render_job.id[:8]}.{render_job.format}"
    output_file = output_dir / output_filename

    quality_map = {"low": "28", "medium": "23", "high": "18", "ultra": "12"}
    crf = quality_map.get(render_job.quality, "23")

    if render_job.format == "mp4":
        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(composition.fps),
            "-i", str(frames_dir / "frame_%06d.png"),
            "-c:v", "libx264", "-preset", "medium", "-crf", crf,
            "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(output_file)
        ]
    elif render_job.format == "webm":
        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(composition.fps),
            "-i", str(frames_dir / "frame_%06d.png"),
            "-c:v", "libvpx-vp9", "-crf", crf, "-b:v", "0",
            str(output_file)
        ]
    elif render_job.format == "mov":
        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(composition.fps),
            "-i", str(frames_dir / "frame_%06d.png"),
            "-c:v", "prores_ks", "-profile:v", "3", "-vendor", "apl0",
            str(output_file)
        ]
    elif render_job.format == "png-sequence":
        import shutil
        for frame_file in sorted(frames_dir.glob("frame_*.png")):
            shutil.copy2(frame_file, output_dir / frame_file.name)
        manifest = output_dir / "frames.txt"
        with open(manifest, "w") as f:
            for frame_file in sorted(frames_dir.glob("frame_*.png")):
                f.write(f"file '{frame_file.name}'\n")
        return output_dir
    else:
        raise RenderingError(f"Unsupported format: {render_job.format}")

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RenderingError(f"ffmpeg failed: {result.stderr}")

    return output_file


async def _utc_now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)
