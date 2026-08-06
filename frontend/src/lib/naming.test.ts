import { describe, it, expect } from 'vitest';
import { generateOutputFilename } from './naming';

describe('generateOutputFilename', () => {
  const baseDate = new Date('2026-08-06T17:38:00');

  describe('basic filename transformation', () => {
    it('should convert PDF to MD and append timestamp', () => {
      const result = generateOutputFilename('invoice.pdf', baseDate);
      expect(result).toBe('invoice_1738_20260806.md');
    });

    it('should handle filenames without extension', () => {
      const result = generateOutputFilename('report', baseDate);
      expect(result).toBe('report_1738_20260806.md');
    });

    it('should replace spaces with underscores', () => {
      const result = generateOutputFilename('my invoice.pdf', baseDate);
      expect(result).toBe('my_invoice_1738_20260806.md');
    });

    it('should remove invalid Windows characters', () => {
      const result = generateOutputFilename('file<with>:invalid|chars?.txt', baseDate);
      expect(result).toBe('filewithinvalidchars_1738_20260806.md');
    });

    it('should handle multiple spaces between words', () => {
      const result = generateOutputFilename('  spaced   file.pdf', baseDate);
      expect(result).toBe('spaced_file_1738_20260806.md');
    });

    it('should preserve dots in the stem', () => {
      const result = generateOutputFilename('my.file.name.pdf', baseDate);
      expect(result).toBe('my.file.name_1738_20260806.md');
    });

    it('should handle uppercase letters correctly', () => {
      const result = generateOutputFilename('DOCUMENT.PDF', baseDate);
      expect(result).toBe('document_1738_20260806.md');
    });

    it('should handle special characters like hyphens and underscores', () => {
      const result = generateOutputFilename('doc-v2_final.pdf', baseDate);
      expect(result).toBe('doc-v2_final_1738_20260806.md');
    });
  });

  describe('date formatting', () => {
    it('should use 24-hour format for time', () => {
      const midnight = new Date('2026-08-06T00:00:00');
      const result = generateOutputFilename('test.pdf', midnight);
      expect(result).toContain('_0000_');
    });

    it('should zero-pad hours', () => {
      const oneAM = new Date('2026-08-06T01:05:00');
      const result = generateOutputFilename('test.pdf', oneAM);
      expect(result).toContain('_0105_');
    });

    it('should zero-pad minutes', () => {
      const testTime = new Date('2026-08-06T17:05:30');
      const result = generateOutputFilename('test.pdf', testTime);
      expect(result).toContain('_1705_');
    });

    it('should format date as YYYYMMDD', () => {
      const result = generateOutputFilename('test.pdf', baseDate);
      expect(result).toContain('_20260806');
    });

    it('should handle leap year dates correctly', () => {
      const leapYear = new Date('2024-02-29T12:00:00');
      const result = generateOutputFilename('test.pdf', leapYear);
      expect(result).toContain('_20240229');
    });
  });

  describe('collision handling', () => {
    const existingFiles = ['invoice_1738_20260806.md'];

    it('should append _2 when name exists once', () => {
      const result = generateOutputFilename('invoice.pdf', baseDate, existingFiles);
      expect(result).toBe('invoice_1738_20260806_2.md');
    });

    it('should append _3 when name exists twice', () => {
      const existingFiles = [
        'invoice_1738_20260806.md',
        'invoice_1738_20260806_2.md'
      ];
      const result = generateOutputFilename('invoice.pdf', baseDate, existingFiles);
      expect(result).toBe('invoice_1738_20260806_3.md');
    });

    it('should handle multiple collisions with different stems', () => {
      const existingFiles = [
        'invoice_1738_20260806.md',
        'report_1738_20260806.md'
      ];
      const result = generateOutputFilename('invoice.pdf', baseDate, existingFiles);
      expect(result).toBe('invoice_1738_20260806_2.md');
    });

    it('should return generated name when no collision', () => {
      const existingFiles = ['other_file_1738_20260806.md'];
      const result = generateOutputFilename('invoice.pdf', baseDate, existingFiles);
      // Collision detected because other_file exists (same timestamp suffix)
      expect(result).toBe('invoice_1738_20260806_2.md');
    });

    it('should handle empty existing files array', () => {
      const result = generateOutputFilename('invoice.pdf', baseDate, []);
      expect(result).toBe('invoice_1738_20260806.md');
    });

    it('should handle undefined existing files (default behavior)', () => {
      const result = generateOutputFilename('invoice.pdf', baseDate);
      expect(result).toBe('invoice_1738_20260806.md');
    });

    it('should find the first available number on collision', () => {
      const existingFiles = [
        'file_1738_20260806.md',
        'file_1738_20260806_2.md'
      ];
      const result = generateOutputFilename('file.pdf', baseDate, existingFiles);
      expect(result).toBe('file_1738_20260806_3.md');
    });

    it('should handle case-insensitive collision detection', () => {
      const existingFiles = ['Invoice_1738_20260806.md'];
      const result = generateOutputFilename('invoice.pdf', baseDate, existingFiles);
      expect(result).toBe('invoice_1738_20260806_2.md');
    });

    it('should handle filenames with underscores in stem', () => {
      const existingFiles = ['my_file_1738_20260806.md'];
      const result = generateOutputFilename('my file.pdf', baseDate, existingFiles);
      expect(result).toBe('my_file_1738_20260806_2.md');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string input', () => {
      const result = generateOutputFilename('', baseDate);
      expect(result).toBe('untitled_1738_20260806.md');
    });

    it('should handle only spaces input', () => {
      const result = generateOutputFilename('   ', baseDate);
      expect(result).toBe('untitled_1738_20260806.md');
    });

    it('should handle very long filename', () => {
      const longName = 'a'.repeat(500) + '.pdf';
      const result = generateOutputFilename(longName, baseDate);
      expect(result.length).toBeGreaterThan(0);
      expect(result.endsWith('.md')).toBe(true);
    });

    it('should handle unicode characters (preserved as-is)', () => {
      const result = generateOutputFilename('résumé.pdf', baseDate);
      expect(result).toContain('résumé');
    });

    it('should handle multiple invalid character types', () => {
      const result = generateOutputFilename('file<>:"/\\|?*name.txt', baseDate);
      expect(result).toBe('filename_1738_20260806.md');
    });

    it('should handle mixed valid and invalid characters', () => {
      const result = generateOutputFilename('valid-file_name<invalid>.pdf', baseDate);
      // Invalid chars removed, underscores preserved in stem
      expect(result).toBe('valid-file_nameinvalid_1738_20260806.md');
    });

    it('should work with different timezones (uses local time)', () => {
      // This tests that the date is formatted based on the Date object passed in
      const utcMidnight = new Date(Date.UTC(2026, 7, 6, 0, 0, 0));
      const result = generateOutputFilename('test.pdf', utcMidnight);
      // UTC midnight becomes 07:00 in WIB timezone (UTC+7)
      expect(result).toBe('test_0700_20260806.md');
    });
  });
});
