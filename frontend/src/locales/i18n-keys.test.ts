import { describe, it, expect } from 'vitest';
import en from './en.json';
import id from './id.json';

describe('i18n keys', () => {
  describe('settings.enhanceImageQuality', () => {
    it('exists in en.json', () => {
      expect(en.settings.enhanceImageQuality).toBeDefined();
      expect(typeof en.settings.enhanceImageQuality).toBe('string');
      expect(en.settings.enhanceImageQuality.length).toBeGreaterThan(0);
    });

    it('exists in id.json', () => {
      expect(id.settings.enhanceImageQuality).toBeDefined();
      expect(typeof id.settings.enhanceImageQuality).toBe('string');
      expect(id.settings.enhanceImageQuality.length).toBeGreaterThan(0);
    });
  });

  describe('settings.enhanceImageQualityTooltip', () => {
    it('exists in en.json', () => {
      expect(en.settings.enhanceImageQualityTooltip).toBeDefined();
      expect(typeof en.settings.enhanceImageQualityTooltip).toBe('string');
      expect(en.settings.enhanceImageQualityTooltip.length).toBeGreaterThan(0);
    });

    it('exists in id.json', () => {
      expect(id.settings.enhanceImageQualityTooltip).toBeDefined();
      expect(typeof id.settings.enhanceImageQualityTooltip).toBe('string');
      expect(id.settings.enhanceImageQualityTooltip.length).toBeGreaterThan(0);
    });
  });
});
