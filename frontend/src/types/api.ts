/** API types matching backend schemas. */
export interface CompositionBase {
  name: string;
  description?: string;
  html_content: string;
  css_content?: string;
  js_content?: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  meta: Record<string, unknown>;
}

export interface CompositionCreate extends CompositionBase {}

export interface CompositionUpdate {
  name?: string;
  description?: string;
  html_content?: string;
  css_content?: string;
  js_content?: string;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  meta?: Record<string, unknown>;
}

export interface CompositionResponse extends CompositionBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface CompositionListResponse {
  items: CompositionResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RenderJobCreate {
  format?: 'mp4' | 'webm' | 'mov' | 'png-sequence';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  fps?: number;
  resolution?: string;
}

export interface RenderJobResponse {
  id: string;
  composition_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  format: string;
  quality: string;
  output_path?: string;
  error_message?: string;
  progress: number;
  total_frames: number;
  completed_frames: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface TemplateBase {
  name: string;
  description?: string;
  category: string;
  html_template: string;
  css_template?: string;
  js_template?: string;
  default_width: number;
  default_height: number;
  default_fps: number;
  default_duration: number;
  parameters_schema: Record<string, unknown>;
}

export interface TemplateCreate extends TemplateBase {}

export interface TemplateResponse extends TemplateBase {
  id: string;
  created_at: string;
  updated_at: string;
}