import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentationService } from '../lib/documentation-service.js';

describe('Best Practices with Inflection', () => {
  let service;

  beforeEach(() => {
    service = new DocumentationService();
  });

  describe('Custom pluralize rules', () => {
    it('should handle our custom "caches" rule', () => {
      expect(service.toSingular('caches')).toBe('cache');
    });

    it('should treat "data" as uncountable', () => {
      expect(service.toSingular('data')).toBe('data');
    });
  });

  describe('Best practices with inflection', () => {
    it('should match plural query to singular content', async () => {
      const mockDocs = `# community-bloggers

Best practice for component architecture.

Modern pattern: use Glimmer components.
`;

      service.parseDocumentation(mockDocs);

      // Search with plural, should match singular "component"
      const results = await service.getBestPractices('components');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should match singular query to plural content', async () => {
      const mockDocs = `# community-bloggers

Best practices for templates and components.

Recommended approach for modern apps.
`;

      service.parseDocumentation(mockDocs);

      // Search with singular, should match plural "templates"
      const results = await service.getBestPractices('template');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle irregular plurals', async () => {
      const mockDocs = `# community-bloggers

Best practice: handle child components properly.

Recommended: manage children lifecycle correctly.
`;

      service.parseDocumentation(mockDocs);

      // "children" query should match "child" content
      const results1 = await service.getBestPractices('children');
      expect(results1.length).toBeGreaterThan(0);

      // "child" query should match "children" content
      const results2 = await service.getBestPractices('child');
      expect(results2.length).toBeGreaterThan(0);
    });

    it('should work with multi-term queries', async () => {
      const mockDocs = `# community-bloggers

Best practice for template syntax.

Modern pattern: use gjs/gts for components.
`;

      service.parseDocumentation(mockDocs);

      // Both terms in different forms
      const results = await service.getBestPractices('templates component');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
