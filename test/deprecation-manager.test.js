import { describe, it, expect, beforeEach } from 'vitest';
import { DeprecationManager } from '../lib/deprecation-manager.js';

describe('DeprecationManager', () => {
  let manager;

  beforeEach(() => {
    manager = new DeprecationManager();
  });

  describe('Known deprecations', () => {
    it('should recognize ArrayProxy as deprecated', () => {
      expect(manager.isDeprecated('ArrayProxy')).toBe(true);
      expect(manager.isDeprecated('arrayproxy')).toBe(true);
    });

    it('should recognize ObjectProxy as deprecated', () => {
      expect(manager.isDeprecated('ObjectProxy')).toBe(true);
    });

    it('should recognize PromiseProxyMixin as deprecated', () => {
      expect(manager.isDeprecated('PromiseProxyMixin')).toBe(true);
    });

    it('should not recognize valid APIs as deprecated', () => {
      expect(manager.isDeprecated('Component')).toBe(false);
      expect(manager.isDeprecated('Service')).toBe(false);
    });
  });

  describe('analyzeContent', () => {
    it('should detect deprecation from content with deprecated keyword', () => {
      const content = 'ArrayProxy is deprecated since Ember 5.0. Use tracked properties instead.';
      const result = manager.analyzeContent('ArrayProxy', content);

      expect(result).toBeDefined();
      expect(result.status).toBe('deprecated');
      expect(result.since).toBe('5.0');
    });

    it('should detect legacy keyword', () => {
      const content = 'This is a legacy API that should not be used in modern apps.';
      const result = manager.analyzeContent('OldAPI', content);

      expect(result).toBeDefined();
      expect(result.status).toBe('deprecated');
    });

    it('should extract modern alternative', () => {
      const content = 'ArrayProxy is deprecated. Use tracked properties instead.';
      const result = manager.analyzeContent('ArrayProxy', content);

      expect(result).toBeDefined();
      expect(result.modernAlternative).toContain('tracked properties');
    });

    it('should extract alternative with "replaced by" pattern', () => {
      const content = 'ObjectProxy is deprecated and replaced by plain objects with tracked properties.';
      const result = manager.analyzeContent('ObjectProxy', content);

      expect(result).toBeDefined();
      expect(result.modernAlternative).toContain('plain objects');
    });

    it('should return null for non-deprecated content', () => {
      const content = 'Component is a core primitive in Ember applications.';
      const result = manager.analyzeContent('Component', content);

      expect(result).toBeNull();
    });
  });

  describe('getDeprecationInfo', () => {
    it('should return info for known deprecations', () => {
      const info = manager.getDeprecationInfo('ArrayProxy');

      expect(info).toBeDefined();
      expect(info.name).toBe('ArrayProxy');
      expect(info.status).toBe('deprecated');
      expect(info.modernAlternative).toBeDefined();
    });

    it('should return null for unknown APIs', () => {
      const info = manager.getDeprecationInfo('UnknownAPI');
      expect(info).toBeNull();
    });

    it('should be case insensitive', () => {
      const info1 = manager.getDeprecationInfo('ArrayProxy');
      const info2 = manager.getDeprecationInfo('arrayproxy');
      const info3 = manager.getDeprecationInfo('ARRAYPROXY');

      expect(info1).toEqual(info2);
      expect(info2).toEqual(info3);
    });
  });

  describe('registerDeprecation', () => {
    it('should register new deprecation', () => {
      const deprecationInfo = {
        name: 'CustomAPI',
        status: 'deprecated',
        since: '4.0',
        modernAlternative: 'NewAPI'
      };

      manager.registerDeprecation('CustomAPI', deprecationInfo);

      expect(manager.isDeprecated('CustomAPI')).toBe(true);
      expect(manager.getDeprecationInfo('CustomAPI')).toEqual(deprecationInfo);
    });

    it('should overwrite existing deprecation', () => {
      const originalInfo = manager.getDeprecationInfo('ArrayProxy');
      const newInfo = {
        name: 'ArrayProxy',
        status: 'deprecated',
        since: '6.0',
        modernAlternative: 'Different alternative'
      };

      manager.registerDeprecation('ArrayProxy', newInfo);

      const updatedInfo = manager.getDeprecationInfo('ArrayProxy');
      expect(updatedInfo).toEqual(newInfo);
      expect(updatedInfo).not.toEqual(originalInfo);
    });
  });

  describe('generateWarning', () => {
    it('should generate banner format warning', () => {
      const warning = manager.generateWarning('ArrayProxy', 'banner');

      expect(warning).toContain('DEPRECATION WARNING');
      expect(warning).toContain('ArrayProxy');
      expect(warning).toContain('Modern Alternative');
    });

    it('should generate inline format warning', () => {
      const warning = manager.generateWarning('ArrayProxy', 'inline');

      expect(warning).toContain('Deprecated');
      expect(warning).toContain('Use');
    });

    it('should generate short format warning', () => {
      const warning = manager.generateWarning('ArrayProxy', 'short');

      expect(warning).toContain('Deprecated');
      expect(warning.length).toBeLessThan(100);
    });

    it('should return empty string for non-deprecated API', () => {
      const warning = manager.generateWarning('Component', 'banner');
      expect(warning).toBe('');
    });
  });

  describe('checkSearchResult', () => {
    it('should detect deprecated API in search result title', () => {
      const result = {
        title: 'ArrayProxy Documentation',
        content: 'Some content about ArrayProxy'
      };

      const deprecationInfo = manager.checkSearchResult(result);
      expect(deprecationInfo).toBeDefined();
      expect(deprecationInfo.status).toBe('deprecated');
    });

    it('should detect possible deprecation from content keywords', () => {
      const result = {
        title: 'Some API',
        content: 'This API is deprecated and should not be used.'
      };

      const deprecationInfo = manager.checkSearchResult(result);
      expect(deprecationInfo).toBeDefined();
      expect(deprecationInfo.status).toBe('possibly-deprecated');
    });

    it('should return null for non-deprecated results', () => {
      const result = {
        title: 'Component Guide',
        content: 'Components are the core building blocks.'
      };

      const deprecationInfo = manager.checkSearchResult(result);
      expect(deprecationInfo).toBeNull();
    });
  });

  describe('analyzeDocumentation', () => {
    it('should extract deprecations from deprecation guide sections', () => {
      const sections = {
        'deprecation-guide': [
          {
            content: '`ArrayProxy` is deprecated since Ember 5.0. Use tracked properties instead.',
            link: 'https://guides.emberjs.com/deprecations'
          },
          {
            content: '`ObjectProxy` is deprecated. Use plain objects with tracked state.',
            link: 'https://guides.emberjs.com/deprecations'
          }
        ],
        'api-docs': [
          {
            content: 'Component API documentation'
          }
        ]
      };

      manager.analyzeDocumentation(sections);

      expect(manager.isDeprecated('ArrayProxy')).toBe(true);
      expect(manager.isDeprecated('ObjectProxy')).toBe(true);

      const arrayProxyInfo = manager.getDeprecationInfo('ArrayProxy');
      expect(arrayProxyInfo.deprecationGuideLink).toBe('https://guides.emberjs.com/deprecations');
    });

    it('should handle sections without deprecations', () => {
      const sections = {
        'guides': [
          {
            content: 'Guide content without deprecations'
          }
        ]
      };

      manager.analyzeDocumentation(sections);
      // Should not crash and should keep existing known deprecations
      expect(manager.isDeprecated('ArrayProxy')).toBe(true);
    });

    it('should handle empty or invalid sections', () => {
      expect(() => {
        manager.analyzeDocumentation(null);
      }).not.toThrow();

      expect(() => {
        manager.analyzeDocumentation({});
      }).not.toThrow();
    });
  });
});
