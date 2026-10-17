"""Tests for composition API endpoints."""
import pytest
from httpx import AsyncClient


class TestCompositionCRUD:
    """Tests for composition CRUD operations."""

    async def test_create_composition(self, client: AsyncClient, sample_composition_data: dict):
        """Test creating a valid composition."""
        response = await client.post("/api/compositions", json=sample_composition_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_composition_data["name"]
        assert data["html_content"] == sample_composition_data["html_content"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_composition_invalid_html(self, client: AsyncClient, invalid_composition_html: str):
        """Test creating composition with invalid HTML fails."""
        data = {
            "name": "Invalid Composition",
            "html_content": invalid_composition_html,
        }
        response = await client.post("/api/compositions", json=data)
        assert response.status_code == 400
        error = response.json()
        assert "errors" in error["detail"]
        assert any("data-composition-id" in e for e in error["detail"]["errors"])

    async def test_create_composition_missing_name(self, client: AsyncClient, sample_composition_data: dict):
        """Test creating composition without name fails."""
        data = {**sample_composition_data}
        del data["name"]
        response = await client.post("/api/compositions", json=data)
        assert response.status_code == 422  # Validation error

    async def test_list_compositions_empty(self, client: AsyncClient):
        """Test listing compositions when empty."""
        response = await client.get("/api/compositions")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["page_size"] == 20

    async def test_list_compositions_with_data(self, client: AsyncClient, sample_composition_data: dict):
        """Test listing compositions with data."""
        # Create a few compositions
        for i in range(3):
            data = {**sample_composition_data, "name": f"Composition {i}"}
            await client.post("/api/compositions", json=data)

        response = await client.get("/api/compositions")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total"] == 3

    async def test_list_compositions_pagination(self, client: AsyncClient, sample_composition_data: dict):
        """Test pagination of compositions list."""
        for i in range(5):
            data = {**sample_composition_data, "name": f"Comp {i}"}
            await client.post("/api/compositions", json=data)

        response = await client.get("/api/compositions?page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["total"] == 5

    async def test_list_compositions_search(self, client: AsyncClient, sample_composition_data: dict):
        """Test search filtering of compositions."""
        await client.post("/api/compositions", json={**sample_composition_data, "name": "Alpha Test"})
        await client.post("/api/compositions", json={**sample_composition_data, "name": "Beta Test"})
        await client.post("/api/compositions", json={**sample_composition_data, "name": "Gamma Other"})

        response = await client.get("/api/compositions?search=Alpha")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Alpha Test"

    async def test_get_composition(self, client: AsyncClient, sample_composition_data: dict):
        """Test getting a single composition."""
        create_resp = await client.post("/api/compositions", json=sample_composition_data)
        comp_id = create_resp.json()["id"]

        response = await client.get(f"/api/compositions/{comp_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == comp_id
        assert data["name"] == sample_composition_data["name"]

    async def test_get_composition_not_found(self, client: AsyncClient):
        """Test getting non-existent composition returns 404."""
        response = await client.get("/api/compositions/non-existent-id")
        assert response.status_code == 404

    async def test_update_composition(self, client: AsyncClient, sample_composition_data: dict):
        """Test updating a composition."""
        create_resp = await client.post("/api/compositions", json=sample_composition_data)
        comp_id = create_resp.json()["id"]

        update_data = {"name": "Updated Name", "description": "Updated description"}
        response = await client.patch(f"/api/compositions/{comp_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["description"] == "Updated description"
        assert data["html_content"] == sample_composition_data["html_content"]  # Unchanged

    async def test_update_composition_invalid_html(self, client: AsyncClient, sample_composition_data: dict, invalid_composition_html: str):
        """Test updating with invalid HTML fails."""
        create_resp = await client.post("/api/compositions", json=sample_composition_data)
        comp_id = create_resp.json()["id"]

        response = await client.patch(f"/api/compositions/{comp_id}", json={"html_content": invalid_composition_html})
        assert response.status_code == 400
        error = response.json()
        assert "errors" in error["detail"]

    async def test_update_composition_not_found(self, client: AsyncClient):
        """Test updating non-existent composition returns 404."""
        response = await client.patch("/api/compositions/non-existent", json={"name": "New Name"})
        assert response.status_code == 404

    async def test_delete_composition(self, client: AsyncClient, sample_composition_data: dict):
        """Test deleting a composition."""
        create_resp = await client.post("/api/compositions", json=sample_composition_data)
        comp_id = create_resp.json()["id"]

        response = await client.delete(f"/api/compositions/{comp_id}")
        assert response.status_code == 204

        # Verify deleted
        get_resp = await client.get(f"/api/compositions/{comp_id}")
        assert get_resp.status_code == 404

    async def test_delete_composition_not_found(self, client: AsyncClient):
        """Test deleting non-existent composition returns 404."""
        response = await client.delete("/api/compositions/non-existent")
        assert response.status_code == 404


class TestCompositionValidation:
    """Tests for composition validation endpoint."""

    async def test_validate_valid_composition(self, client: AsyncClient, sample_composition_data: dict):
        """Test validating valid composition HTML."""
        response = await client.post(
            "/api/compositions/validate",
            json={"html_content": sample_composition_data["html_content"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["errors"] == []

    async def test_validate_invalid_composition(self, client: AsyncClient, invalid_composition_html: str):
        """Test validating invalid composition HTML returns errors."""
        response = await client.post(
            "/api/compositions/validate",
            json={"html_content": invalid_composition_html},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert len(data["errors"]) > 0
        assert any("data-composition-id" in e for e in data["errors"])


class TestRenderJobs:
    """Tests for render job endpoints."""

    async def test_create_render_job(self, client: AsyncClient, sample_composition_data: dict):
        """Test creating a render job."""
        create_resp = await client.post("/api/compositions", json=sample_composition_data)
        comp_id = create_resp.json()["id"]

        render_config = {"format": "mp4", "quality": "high"}
        response = await client.post(f"/api/compositions/{comp_id}/render", json=render_config)
        assert response.status_code == 201
        data = response.json()
        assert data["composition_id"] == comp_id
        assert data["status"] == "pending"
        assert data["format"] == "mp4"
        assert data["quality"] == "high"
        assert "id" in data

    async def test_create_render_job_invalid_format(self, client: AsyncClient, sample_composition_data: dict):
        """Test creating render job with invalid format."""
        create_resp = await client.post("/api/compositions", json=sample_composition_data)
        comp_id = create_resp.json()["id"]

        render_config = {"format": "avi", "quality": "high"}
        response = await client.post(f"/api/compositions/{comp_id}/render", json=render_config)
        assert response.status_code == 422
    async def test_create_render_job_composition_not_found(self, client: AsyncClient):
        """Test creating render job for non-existent composition."""
        render_config = {"format": "mp4", "quality": "high"}
        response = await client.post("/api/compositions/non-existent/render", json=render_config)
        assert response.status_code == 404

    async def test_list_render_jobs(self, client: AsyncClient, sample_composition_data: dict):
        """Test listing render jobs for a composition."""
        create_resp = await client.post("/api/compositions", json=sample_composition_data)
        comp_id = create_resp.json()["id"]

        await client.post(f"/api/compositions/{comp_id}/render", json={"format": "mp4"})
        await client.post(f"/api/compositions/{comp_id}/render", json={"format": "webm"})

        response = await client.get(f"/api/compositions/{comp_id}/renders")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    async def test_get_render_job(self, client: AsyncClient, sample_composition_data: dict):
        """Test getting a specific render job."""
        create_resp = await client.post("/api/compositions", json=sample_composition_data)
        comp_id = create_resp.json()["id"]

        render_resp = await client.post(f"/api/compositions/{comp_id}/render", json={"format": "mp4"})
        render_id = render_resp.json()["id"]

        response = await client.get(f"/api/compositions/renders/{render_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == render_id


class TestTemplates:
    """Tests for composition template endpoints."""

    async def test_create_template(self, client: AsyncClient, sample_template_data: dict):
        """Test creating a template."""
        response = await client.post("/api/compositions/templates", json=sample_template_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_template_data["name"]
        assert data["category"] == sample_template_data["category"]
        assert "id" in data

    async def test_create_template_duplicate_name(self, client: AsyncClient, sample_template_data: dict):
        """Test creating template with duplicate name fails."""
        await client.post("/api/compositions/templates", json=sample_template_data)
        response = await client.post("/api/compositions/templates", json=sample_template_data)
        assert response.status_code == 400  # Unique constraint violation

    async def test_list_templates(self, client: AsyncClient, sample_template_data: dict):
        """Test listing templates."""
        await client.post("/api/compositions/templates", json={**sample_template_data, "name": "Template 1"})
        await client.post("/api/compositions/templates", json={**sample_template_data, "name": "Template 2", "category": "transitions"})

        response = await client.get("/api/compositions/templates")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    async def test_list_templates_by_category(self, client: AsyncClient, sample_template_data: dict):
        """Test listing templates filtered by category."""
        await client.post("/api/compositions/templates", json={**sample_template_data, "name": "Template 1", "category": "titles"})
        await client.post("/api/compositions/templates", json={**sample_template_data, "name": "Template 2", "category": "transitions"})

        response = await client.get("/api/compositions/templates?category=titles")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["category"] == "titles"

    async def test_get_template(self, client: AsyncClient, sample_template_data: dict):
        """Test getting a template by ID."""
        create_resp = await client.post("/api/compositions/templates", json=sample_template_data)
        template_id = create_resp.json()["id"]

        response = await client.get(f"/api/compositions/templates/{template_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == template_id

    async def test_get_template_not_found(self, client: AsyncClient):
        """Test getting non-existent template returns 404."""
        response = await client.get("/api/compositions/templates/non-existent")
        assert response.status_code == 404