import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsDialog from './SettingsDialog';
import { initI18n } from '../../i18n';
import en from '../../locales/en.json';

describe('SettingsDialog', () => {
  beforeEach(() => {
    initI18n({ en: { translation: en } });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
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
});
