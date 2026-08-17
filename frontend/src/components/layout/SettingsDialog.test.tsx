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
          max_pdf_pages: 20,
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
        max_pdf_pages: 20,
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
        max_pdf_pages: 20,
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

  it('blocks PUT when max_pdf_pages < 1', async () => {
    const putMock = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url: any, options: any) => {
      if (options?.method === 'PUT') {
        putMock();
        return new Response('{"status":"ok"}', { status: 200 });
      }
      return new Response(JSON.stringify({
        output_dir: 'C:\\test\\output',
        max_pdf_pages: 20,
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
});
