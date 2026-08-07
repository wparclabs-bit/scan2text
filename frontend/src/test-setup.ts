import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

void i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          app: { title: 'Scan2Text' },
          panels: { dropZone: 'Drop Zone', queue: 'Queue', preview: 'Preview' },
          status: { ready: 'Ready' },
          actions: { toggleTheme: 'Toggle theme', toggleLanguage: 'Toggle language' },
          errors: {
            unsupportedFileType: 'Unsupported file type. Allowed: PNG, JPG, JPEG, WEBP, PDF',
            fileTooLarge: 'File exceeds 50MB limit',
            uploadFailed: 'Upload failed',
            batchSkipped: '{{total}} files were skipped: {{unsupported}} unsupported type(s), {{tooLarge}} too large.',
            allInvalid: 'No files were added. All selected files were unsupported or too large.',
          },
          preview: {
            empty: 'Select a job to preview',
            loading: 'Processing your file...',
            error: 'Processing failed. Please try again.',
            retry: 'Retry',
          },
          queue: {
            empty: 'No files in queue',
            remove: 'Remove',
            retry: 'Retry',
            status: {
              pending: 'Pending',
              uploading: 'Uploading',
              processing: 'Processing',
              completed: 'Completed',
              failed: 'Failed',
            },
          },
          bottomBar: {
            workerIdle: 'Worker: Idle',
            ramUsage: 'RAM: 1.8 GB',
            version: 'v0.1.0-demo',
          },
          settings: {
            title: 'Settings',
            general: 'General',
            processing: 'Processing (Backend Required)',
            outputDir: '\ud83d\udd12 Output Directory',
            maxPdfPages: '\ud83d\udd12 Max PDF Pages',
            cpuThreads: '\ud83d\udd12 CPU Threads',
            demoModeSwitch: 'Demo mode',
            locked: 'Locked in demo mode',
          },
          topbar: {
            logoAlt: 'Scan2Text logo',
            wordmarkScan: 'scan',
            wordmarkTwo: '2',
            wordmarkText: 'text',
            demoBadge: 'DEMO',
          },
        },
      },
      id: {
        translation: {
          app: { title: 'Scan2Text' },
          panels: { dropZone: 'Zona Jatuh', queue: 'Antrian', preview: 'Pratinjau' },
          status: { ready: 'Siap' },
          actions: { toggleTheme: 'Ubah tema', toggleLanguage: 'Ubah bahasa' },
          errors: {
            unsupportedFileType: 'Tipe file tidak didukung. Yang didukung: PNG, JPG, JPEG, WEBP, PDF',
            fileTooLarge: 'Ukuran file melebihi batas 50MB',
            uploadFailed: 'Gagal mengunggah',
            batchSkipped: '{{total}} file dilewati: {{unsupported}} tipe tidak didukung, {{tooLarge}} terlalu besar.',
            allInvalid: 'Tidak ada file yang ditambahkan. Semua file yang dipilih tidak didukung atau terlalu besar.',
          },
          preview: {
            empty: 'Pilih pekerjaan untuk pratinjau',
            loading: 'Memproses file Anda...',
            error: 'Pemrosesan gagal. Silakan coba lagi.',
            retry: 'Coba Lagi',
          },
          queue: {
            empty: 'Tidak ada file dalam antrian',
            remove: 'Hapus',
            retry: 'Ulangi',
            status: {
              pending: 'Menunggu',
              uploading: 'Mengunggah',
              processing: 'Memproses',
              completed: 'Selesai',
              failed: 'Gagal',
            },
          },
          bottomBar: {
            workerIdle: 'Worker: Idle',
            ramUsage: 'RAM: 1.8 GB',
            version: 'v0.1.0-demo',
          },
          settings: {
            title: 'Pengaturan',
            general: 'Umum',
            processing: 'Pemrosesan (Butuh Backend)',
            outputDir: '\ud83d\udd12 Folder Output',
            maxPdfPages: '\ud83d\udd12 Maks Halaman PDF',
            cpuThreads: '\ud83d\udd12 Thread CPU',
            demoModeSwitch: 'Mode demo',
            locked: 'Terkunci dalam mode demo',
          },
          topbar: {
            logoAlt: 'Logo Scan2Text',
            wordmarkScan: 'scan',
            wordmarkTwo: '2',
            wordmarkText: 'text',
            demoBadge: 'DEMO',
          },
        },
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
