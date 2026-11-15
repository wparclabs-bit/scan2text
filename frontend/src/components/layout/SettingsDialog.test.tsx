import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsDialog from './SettingsDialog';
import { initI18n } from '../../i18n';
import en from '../../locales/en.json';
import id from '../../locales/id.json';

describe('SettingsDialog', () => {
  beforeEach(() => {
    initI18n({ en: { translation: en } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/api/cloud/profile')) {
        return new Response(JSON.stringify({
          name: 'Cloud Profile',
          beta: true,
          enabled: false,
          base_url: 'https://provider.example/v1',
          model_id: 'vision-model',
          recipe: {
            version: 'cloud-v1-test',
            prompt: 'Transcribe exactly.',
            temperature: 0.6,
            top_p: 0.95,
            thinking_enabled: false,
          },
          cost_estimate: {
            prompt_tokens_per_page: 2167,
            completion_tokens_per_page: 381,
            pages_per_document: 30,
            input_usd_per_million_tokens: 0.2,
            output_usd_per_million_tokens: 0.5,
            estimated_cost_usd: 0.0187,
            measured_on: '2026-11-15',
            basis: 'T01 measured band',
          },
          credential: null,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.toString().includes('/api/settings')) {
        return new Response(JSON.stringify({
          output_dir: 'C:\\test\\output',
          max_pdf_pages: 50,
          cpu_threads: 0,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 404 });
    });
  });

  it('populates inputs from GET /api/settings', async () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-output-dir')).toHaveValue('C:\\test\\output');
    });
  });

  it('fires PUT with merged payload when save button clicked', async () => {
    const putMock = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      if (options?.method === 'PUT') {
        putMock(JSON.parse(options.body));
        return new Response('{"status":"ok"}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => screen.getByTestId('settings-save-btn'));
    fireEvent.change(screen.getByTestId('settings-max-pdf-pages'), { target: { value: '30' } });
    fireEvent.click(screen.getByTestId('settings-save-btn'));
    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith(expect.objectContaining({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 30,
        cpu_threads: 0,
      }));
    });
  });

  it('shows translated success toast on save', async () => {
    const { toast } = await import('sonner');
    const successSpy = vi.spyOn(toast, 'success');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      if (options?.method === 'PUT') {
        return new Response('{"status":"ok"}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => screen.getByTestId('settings-save-btn'));
    fireEvent.click(screen.getByTestId('settings-save-btn'));
    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith('Settings saved');
    });
    successSpy.mockRestore();
  });

  it('does NOT render language or theme selects', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.queryByLabelText(/language/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/theme/i)).not.toBeInTheDocument();
  });

  it('renders the enhance image quality toggle checked from GET /api/settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any) => {
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
        enhance_image_quality: true,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-enhance-toggle')).toBeChecked();
    });
  });

  it('renders the enhance image quality toggle unchecked by default', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any) => {
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    const toggle = screen.getByTestId('settings-enhance-toggle');
    expect(toggle).not.toBeChecked();
  });

  it('includes enhance_image_quality in the PUT payload when saving', async () => {
    let savedBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      if (options?.method === 'PUT') {
        savedBody = JSON.parse(options.body);
        return new Response('{"status":"ok"}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await screen.findByTestId('settings-save-btn');
    fireEvent.click(screen.getByTestId('settings-save-btn'));
    await waitFor(() => {
      expect(savedBody).toEqual(expect.objectContaining({ enhance_image_quality: false }));
    });
  });

  it('blocks PUT when max_pdf_pages < 1', async () => {
    const putMock = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      if (options?.method === 'PUT') {
        putMock();
        return new Response('{"status":"ok"}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await waitFor(() => screen.getByTestId('settings-save-btn'));
    fireEvent.change(screen.getByTestId('settings-max-pdf-pages'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('settings-save-btn'));
    await waitFor(() => {
      expect(putMock).not.toHaveBeenCalled();
    });
  });

  it('clicking the enhance toggle updates the value sent in PUT payload', async () => {
    let savedBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      if (options?.method === 'PUT') {
        savedBody = JSON.parse(options.body);
        return new Response('{"status":"ok"}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
        enhance_image_quality: false,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await screen.findByTestId('settings-save-btn');
    const toggle = screen.getByTestId('settings-enhance-toggle');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    fireEvent.click(screen.getByTestId('settings-save-btn'));
    await waitFor(() => {
      expect(savedBody).toEqual(expect.objectContaining({ enhance_image_quality: true }));
    });
  });

  it('sends enhance_image_quality=false when toggle is unchecked', async () => {
    let savedBody: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      if (options?.method === 'PUT') {
        savedBody = JSON.parse(options.body);
        return new Response('{"status":"ok"}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
        enhance_image_quality: true,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await screen.findByTestId('settings-save-btn');
    const toggle = screen.getByTestId('settings-enhance-toggle');
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    fireEvent.click(screen.getByTestId('settings-save-btn'));
    await waitFor(() => {
      expect(savedBody).toEqual(expect.objectContaining({ enhance_image_quality: false }));
    });
  });

  it('persists enhance toggle immediately on change without clicking Save', async () => {
    const putMock = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      if (options?.method === 'PUT') {
        putMock(JSON.parse(options.body));
        return new Response('{"status":"ok"}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
        enhance_image_quality: false,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await screen.findByTestId('settings-save-btn');
    const toggle = screen.getByTestId('settings-enhance-toggle');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(putMock).toHaveBeenCalledTimes(1);
      expect(putMock).toHaveBeenCalledWith(expect.objectContaining({ enhance_image_quality: true }));
    });
  });

  it('test_cloud_section_is_beta_and_disabled_by_default', async () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);

    expect(await screen.findByTestId('settings-cloud-section')).toBeInTheDocument();
    expect(screen.getByTestId('settings-cloud-beta')).toHaveTextContent('Beta');
    expect(screen.getByTestId('settings-cloud-toggle')).not.toBeChecked();
  });

  it('test_cloud_profile_loads_without_exposing_key', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (url.toString().includes('/api/cloud/profile')) {
        return new Response(JSON.stringify({
          beta: true,
          enabled: false,
          base_url: 'https://provider.example/v1',
          model_id: 'vision-model',
          recipe: { version: 'v1', prompt: 'Transcribe.', temperature: 0.6, top_p: 0.95, thinking_enabled: false },
          cost_estimate: {
            prompt_tokens_per_page: 2167,
            completion_tokens_per_page: 381,
            pages_per_document: 30,
            input_usd_per_million_tokens: 0.2,
            output_usd_per_million_tokens: 0.5,
            estimated_cost_usd: 0.0187,
            measured_on: '2026-11-15',
            basis: 'T01 measured band',
          },
          credential: { key_id: 'Scan2Text:CloudProvider', last_four: 'abcd' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    render(<SettingsDialog open={true} onOpenChange={() => {}} />);

    expect(await screen.findByTestId('settings-cloud-base-url')).toHaveValue('https://provider.example/v1');
    expect(screen.getByTestId('settings-cloud-model-id')).toHaveValue('vision-model');
    expect(screen.getByTestId('settings-cloud-key-status')).toHaveTextContent('abcd');
    expect(document.body.textContent).not.toContain('credential-fixture');
  });

  it('test_test_connection_saves_profile_then_reports_capability', async () => {
    const calls: Array<{ url: string; method?: string; body?: unknown }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, options: any) => {
      const target = url.toString();
      calls.push({ url: target, method: options?.method, body: options?.body ? JSON.parse(options.body) : undefined });
      if (target.includes('/api/cloud/profile') && options?.method === 'PUT') {
        return new Response(JSON.stringify({
          beta: true,
          enabled: false,
          base_url: 'https://provider.example/v1',
          model_id: 'vision-model',
          recipe: { version: 'v1', prompt: 'Transcribe.', temperature: 0.6, top_p: 0.95, thinking_enabled: false },
          cost_estimate: {
            prompt_tokens_per_page: 2167,
            completion_tokens_per_page: 381,
            pages_per_document: 30,
            input_usd_per_million_tokens: 0.2,
            output_usd_per_million_tokens: 0.5,
            estimated_cost_usd: 0.0187,
            measured_on: '2026-11-15',
            basis: 'T01 measured band',
          },
          credential: { key_id: 'Scan2Text:CloudProvider', last_four: 'ture' },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (target.includes('/api/cloud/test-connection')) {
        return new Response(JSON.stringify({
          model_id: 'vision-model',
          can_read_images: true,
          latency_ms: 125,
          estimated_cost_usd: 0.0187,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (target.includes('/api/cloud/profile')) {
        return new Response(JSON.stringify({
          beta: true,
          enabled: false,
          base_url: 'https://provider.example/v1',
          model_id: 'vision-model',
          recipe: { version: 'v1', prompt: 'Transcribe.', temperature: 0.6, top_p: 0.95, thinking_enabled: false },
          cost_estimate: {
            prompt_tokens_per_page: 2167,
            completion_tokens_per_page: 381,
            pages_per_document: 30,
            input_usd_per_million_tokens: 0.2,
            output_usd_per_million_tokens: 0.5,
            estimated_cost_usd: 0.0187,
            measured_on: '2026-11-15',
            basis: 'T01 measured band',
          },
          credential: null,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await screen.findByTestId('settings-cloud-test-connection');
    fireEvent.change(screen.getByTestId('settings-cloud-api-key'), { target: { value: 'credential-fixture' } });
    fireEvent.click(screen.getByTestId('settings-cloud-test-connection'));

    await waitFor(() => {
      expect(calls.some((call) => call.url.includes('/api/cloud/profile') && call.method === 'PUT')).toBe(true);
      expect(calls.some((call) => call.url.includes('/api/cloud/test-connection'))).toBe(true);
    });
    const saveCall = calls.find((call) => call.url.includes('/api/cloud/profile') && call.method === 'PUT');
    expect(saveCall?.body).toEqual(expect.objectContaining({ api_key: 'credential-fixture' }));
    expect(await screen.findByTestId('settings-cloud-result')).toHaveTextContent('vision-model');
    expect(screen.getByTestId('settings-cloud-result')).toHaveTextContent('125');
    expect(screen.getByTestId('settings-cloud-result')).toHaveTextContent('$0.0187');
    expect(screen.getByTestId('settings-cloud-api-key')).toHaveValue('');
  });

  it('test_text_only_result_is_reported', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, options: any) => {
      if (url.toString().includes('/api/cloud/test-connection')) {
        return new Response(JSON.stringify({
          model_id: 'text-model',
          can_read_images: false,
          latency_ms: 80,
          estimated_cost_usd: 0.0187,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.toString().includes('/api/cloud/profile') && options?.method === 'PUT') {
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    await screen.findByTestId('settings-cloud-test-connection');
    fireEvent.click(screen.getByTestId('settings-cloud-test-connection'));

    expect(await screen.findByTestId('settings-cloud-result')).toHaveTextContent('No');
  });

  it('test_toggle_off_does_not_delete_key', async () => {
    const deleteMock = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, options: any) => {
      if (options?.method === 'DELETE') {
        deleteMock();
        return new Response('{}', { status: 200 });
      }
      if (url.toString().includes('/api/cloud/profile') && options?.method === 'PUT') {
        return new Response('{}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 50,
        cpu_threads: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    const toggle = await screen.findByTestId('settings-cloud-toggle');
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(deleteMock).not.toHaveBeenCalled();
    });
  });

  it('test_cloud_strings_exist_in_english_and_indonesian', () => {
    expect(en.settings.cloud).toBeDefined();
    expect(id.settings.cloud).toBeDefined();
    expect(Object.keys(en.settings.cloud).sort()).toEqual(Object.keys(id.settings.cloud).sort());
    Object.values(en.settings.cloud).forEach((value) => expect(value).toBeTruthy());
  });
});
