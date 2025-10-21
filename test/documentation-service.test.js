import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentationService } from '../lib/documentation-service.js';

describe('DocumentationService', () => {
  let service;

  beforeEach(() => {
    service = new DocumentationService();
  });

  describe('parseDocumentation', () => {
    it('should parse sections correctly', () => {
      const mockDoc = `# api-docs

Some API content here

----------

More API content

# community-bloggers

Community content here`;

      service.parseDocumentation(mockDoc);

      expect(service.sections['api-docs']).toBeDefined();
      expect(service.sections['api-docs'].length).toBe(2);
      expect(service.sections['community-bloggers']).toBeDefined();
      expect(service.sections['community-bloggers'].length).toBe(1);
    });

    it('should handle multiple items in same section', () => {
      const mockDoc = `# api-docs

First item

----------

Second item

----------

Third item`;

      service.parseDocumentation(mockDoc);

      expect(service.sections['api-docs'].length).toBe(3);
    });
  });

  describe('indexApiDocs', () => {
    it('should correctly parse and index API JSON with ArrayProxy format', () => {
      const mockDoc = `# api-docs

Some content

{
  "data": {
    "id": "ember-6.2.0-ArrayProxy",
    "type": "class",
    "attributes": {
      "name": "ArrayProxy",
      "shortname": "ArrayProxy",
      "module": "@ember/array/proxy",
      "description": "An ArrayProxy wraps any other object that implements Array",
      "file": "packages/@ember/array/proxy.ts",
      "line": 50,
      "extends": "EmberObject",
      "methods": [
        {
          "name": "objectAt",
          "description": "Returns the object at the given index"
        }
      ],
      "properties": [
        {
          "name": "content",
          "type": "Array",
          "description": "The content array"
        }
      ]
    }
  }
}

# other-section

End`;

      service.parseDocumentation(mockDoc);

      expect(service.apiIndex.size).toBeGreaterThan(0);
      expect(service.apiIndex.has('arrayproxy')).toBe(true);

      const entry = service.apiIndex.get('arrayproxy');
      expect(entry.name).toBe('ArrayProxy');
      expect(entry.type).toBe('class');
      expect(entry.module).toBe('@ember/array/proxy');
      expect(entry.description).toContain('ArrayProxy wraps');
      expect(entry.methods).toHaveLength(1);
      expect(entry.properties).toHaveLength(1);
    });

    it('should handle JSON with preceding text', () => {
      const mockDoc = `# api-docs

Some description text here.

More text here.

{
  "data": {
    "id": "ember-6.2.0-Component",
    "type": "class",
    "attributes": {
      "name": "Component",
      "shortname": "Component",
      "module": "@glimmer/component",
      "description": "A component base class"
    }
  }
}

# end

Done`;

      service.parseDocumentation(mockDoc);

      expect(service.apiIndex.has('component')).toBe(true);
      const entry = service.apiIndex.get('component');
      expect(entry.name).toBe('Component');
    });

    it('should index by module name', () => {
      const mockDoc = `# api-docs

{
  "data": {
    "id": "ember-6.2.0-Service",
    "type": "class",
    "attributes": {
      "name": "Service",
      "module": "@ember/service",
      "description": "A service base class"
    }
  }
}

# end
`;

      service.parseDocumentation(mockDoc);

      expect(service.apiIndex.has('service')).toBe(true);
      expect(service.apiIndex.has('@ember/service')).toBe(true);
    });

    it('should handle dotted names', () => {
      const mockDoc = `# api-docs

{
  "data": {
    "id": "ember-6.2.0-Ember.Component",
    "type": "class",
    "attributes": {
      "name": "Ember.Component",
      "description": "Legacy component"
    }
  }
}

# end
`;

      service.parseDocumentation(mockDoc);

      expect(service.apiIndex.has('ember.component')).toBe(true);
      expect(service.apiIndex.has('component')).toBe(true);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      const mockDoc = `# api-docs

## ArrayProxy

{
  "data": {
    "type": "class",
    "attributes": {
      "name": "ArrayProxy",
      "description": "ArrayProxy is deprecated. Use tracked properties for modern reactive arrays."
    }
  }
}

----------

## Component

{
  "data": {
    "type": "class",
    "attributes": {
      "name": "Component",
      "description": "Modern Glimmer Component with tracked state"
    }
  }
}

# community-bloggers

## Modern Ember Patterns

This article discusses modern replacement patterns for deprecated features like ArrayProxy.
Use tracked properties and native arrays instead of proxy objects for better performance.`;

      service.parseDocumentation(mockDoc);
    });

    it('should find results matching all terms', async () => {
      const results = await service.search('ArrayProxy deprecated modern replacement tracked', 'all', 5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchedTerms).toBeGreaterThanOrEqual(3);
    });

    it('should prioritize results with terms in title', async () => {
      const results = await service.search('ArrayProxy', 'all', 5);

      expect(results.length).toBeGreaterThan(0);
      // Should find a result with ArrayProxy mentioned
      const hasArrayProxyResult = results.some(r =>
        r.title.includes('ArrayProxy') || r.excerpt.toLowerCase().includes('arrayproxy')
      );
      expect(hasArrayProxyResult).toBe(true);
      expect(results[0].score).toBeGreaterThan(10);
    });

    it('should apply proximity scoring', async () => {
      const results = await service.search('modern tracked', 'all', 5);

      const result = results.find(r => r.excerpt.toLowerCase().includes('modern') && r.excerpt.toLowerCase().includes('tracked'));
      if (result) {
        expect(result.score).toBeGreaterThan(10);
      }
    });

    it('should filter out low-quality results', async () => {
      const results = await service.search('xyz', 'all', 5);

      // Should return no results or only high-quality matches
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(10);
      });
    });

    it('should require minimum term matches', async () => {
      const results = await service.search('word1 word2 word3 word4 word5', 'all', 5);

      results.forEach(result => {
        expect(result.matchedTerms).toBeGreaterThanOrEqual(2);
      });
    });

    it('should filter by category', async () => {
      const apiResults = await service.search('Component', 'api', 5);
      const communityResults = await service.search('patterns', 'community', 5);

      apiResults.forEach(result => {
        expect(result.category).toBe('API Documentation');
      });

      communityResults.forEach(result => {
        expect(result.category).toBe('Community Articles');
      });
    });
  });

  describe('extractExcerpt', () => {
    it('should extract context around matched terms', () => {
      const content = 'This is some introductory text. ArrayProxy is deprecated and should be replaced with tracked properties. Modern Ember uses reactive state.';
      const searchTerms = ['arrayproxy', 'deprecated', 'tracked'];
      const termPositions = [
        { term: 'arrayproxy', pos: 35 },
        { term: 'deprecated', pos: 49 },
        { term: 'tracked', pos: 88 }
      ];

      const excerpt = service.extractExcerpt(content, searchTerms, termPositions);

      expect(excerpt).toContain('ArrayProxy');
      expect(excerpt).toContain('deprecated');
      expect(excerpt).toContain('tracked');
    });

    it('should find best cluster of terms', () => {
      const content = 'ArrayProxy here. ' + 'X'.repeat(1000) + ' Modern and tracked are close together in this section.';
      const searchTerms = ['arrayproxy', 'modern', 'tracked'];
      const termPositions = [
        { term: 'arrayproxy', pos: 0 },
        { term: 'modern', pos: 1020 },
        { term: 'tracked', pos: 1032 }
      ];

      const excerpt = service.extractExcerpt(content, searchTerms, termPositions);

      // Should prefer the cluster of "modern" and "tracked" over lone "arrayproxy"
      expect(excerpt).toContain('Modern');
      expect(excerpt).toContain('tracked');
    });

    it('should clean up JSON and code blocks from excerpts', () => {
      const content = 'Description here { "data": { "foo": "bar" } } more text';
      const searchTerms = ['description'];
      const termPositions = [{ term: 'description', pos: 0 }];

      const excerpt = service.extractExcerpt(content, searchTerms, termPositions);

      expect(excerpt).toContain('Description');
      expect(excerpt).not.toContain('"data"');
    });

    it('should handle missing term positions', () => {
      const content = 'Some content without specific positions';
      const searchTerms = ['content'];
      const termPositions = [];

      const excerpt = service.extractExcerpt(content, searchTerms, termPositions);

      expect(excerpt).toBeTruthy();
      expect(excerpt.length).toBeGreaterThan(0);
    });
  });

  describe('getApiReference', () => {
    beforeEach(() => {
      const mockDoc = `# api-docs

{
  "data": {
    "id": "ember-6.2.0-ArrayProxy",
    "type": "class",
    "attributes": {
      "name": "ArrayProxy",
      "module": "@ember/array/proxy",
      "description": "An ArrayProxy wraps any other object",
      "extends": "EmberObject"
    }
  }
}

# end
`;

      service.parseDocumentation(mockDoc);
    });

    it('should find API reference by name', async () => {
      const result = await service.getApiReference('ArrayProxy');

      expect(result).toBeDefined();
      expect(result.name).toBe('ArrayProxy');
      expect(result.type).toBe('class');
      expect(result.module).toBe('@ember/array/proxy');
    });

    it('should be case insensitive', async () => {
      const result = await service.getApiReference('arrayproxy');

      expect(result).toBeDefined();
      expect(result.name).toBe('ArrayProxy');
    });

    it('should find by module name', async () => {
      const result = await service.getApiReference('@ember/array/proxy');

      expect(result).toBeDefined();
      expect(result.name).toBe('ArrayProxy');
    });

    it('should return null for non-existent API', async () => {
      const result = await service.getApiReference('NonExistentClass');

      expect(result).toBeNull();
    });

    it('should include API URL', async () => {
      const result = await service.getApiReference('ArrayProxy');

      expect(result.apiUrl).toBeDefined();
      expect(result.apiUrl).toContain('ArrayProxy');
    });
  });

  describe('extractTitle', () => {
    it('should extract markdown headers', () => {
      const content = '# Main Title\n\nSome content';
      const title = service.extractTitle(content);

      expect(title).toBe('Main Title');
    });

    it('should extract name from JSON', () => {
      const content = `{
  "data": {
    "attributes": {
      "name": "Component"
    }
  }
}`;
      const title = service.extractTitle(content);

      expect(title).toBe('Component');
    });

    it('should fallback to first line', () => {
      const content = 'First meaningful line\nSecond line';
      const title = service.extractTitle(content);

      expect(title).toBe('First meaningful line');
    });
  });
});
