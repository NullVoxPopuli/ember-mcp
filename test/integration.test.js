import { describe, it, expect, beforeAll } from 'vitest';
import { DocumentationService } from '../lib/documentation-service.js';

describe('Integration Tests', () => {
  let service;

  beforeAll(() => {
    service = new DocumentationService();
  });

  describe('End-to-End Search Flow', () => {
    beforeAll(() => {
      // Mock a realistic documentation structure
      const mockDoc = `# api-docs

## ArrayProxy

ArrayProxy is a legacy Ember class for wrapping arrays. It has been deprecated in favor of modern alternatives.

{
  "data": {
    "id": "ember-6.2.0-ArrayProxy",
    "type": "class",
    "attributes": {
      "name": "ArrayProxy",
      "shortname": "ArrayProxy",
      "module": "@ember/array/proxy",
      "description": "An ArrayProxy wraps any other object that implements Array and/or MutableArray, forwarding all requests. This makes it very useful for a number of binding use cases or other cases where being able to swap out the underlying array is useful. Note: ArrayProxy is deprecated. Use tracked properties with native arrays instead.",
      "file": "packages/@ember/array/proxy.ts",
      "line": 45,
      "extends": "EmberObject",
      "methods": [
        {
          "name": "objectAt",
          "description": "Returns the object at the given index",
          "params": [
            {
              "name": "idx",
              "type": "Number",
              "description": "The index of the item to return"
            }
          ],
          "return": {
            "type": "Any",
            "description": "The object at the specified index"
          }
        },
        {
          "name": "replace",
          "description": "Replaces objects in the array",
          "params": [
            {
              "name": "idx",
              "type": "Number",
              "description": "Starting index"
            },
            {
              "name": "amt",
              "type": "Number",
              "description": "Number of elements to remove"
            },
            {
              "name": "objects",
              "type": "Array",
              "description": "Objects to insert"
            }
          ]
        }
      ],
      "properties": [
        {
          "name": "content",
          "type": "Array",
          "description": "The content array being proxied"
        },
        {
          "name": "length",
          "type": "Number",
          "description": "The length of the content array"
        }
      ]
    }
  }
}

----------

## Component

{
  "data": {
    "id": "ember-6.2.0-Component",
    "type": "class",
    "attributes": {
      "name": "Component",
      "module": "@glimmer/component",
      "description": "A modern Glimmer Component with tracked state and simplified lifecycle",
      "file": "packages/@glimmer/component/index.ts",
      "line": 20,
      "methods": [
        {
          "name": "willDestroy",
          "description": "Called before the component is destroyed"
        }
      ],
      "properties": [
        {
          "name": "args",
          "type": "Object",
          "description": "The arguments passed to the component"
        }
      ]
    }
  }
}

----------

# community-bloggers

## Migrating from ArrayProxy to Tracked Properties

ArrayProxy was a cornerstone of Ember's reactivity system, but with the introduction of tracked properties in Ember Octane, there are better modern alternatives.

### Why ArrayProxy is Deprecated

ArrayProxy was useful when you needed reactive arrays, but it adds overhead and complexity. Modern Ember apps should use:

1. **Tracked properties** with native arrays
2. **@tracked** decorator for reactive state
3. Native array methods that work with autotracking

### Modern Replacement Pattern

Instead of:

\`\`\`javascript
import ArrayProxy from '@ember/array/proxy';

export default class MyComponent extends Component {
  items = ArrayProxy.create({
    content: []
  });
}
\`\`\`

Use tracked properties:

\`\`\`javascript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class MyComponent extends Component {
  @tracked items = [];
}
\`\`\`

### Performance Benefits

Tracked properties provide better performance because:
- No proxy overhead
- Direct array access
- Better TypeScript support
- Simpler mental model

This modern approach is recommended for all new Ember applications.

----------

# guides

## Reactivity in Modern Ember

Ember Octane introduced a new reactivity model based on tracked properties. This replaces older patterns like computed properties and ArrayProxy.

### Key Concepts

- Use @tracked for reactive state
- Native JavaScript data structures
- Autotracking eliminates manual dependency management

### Migration Guide

When migrating from classic Ember to Octane:

1. Replace ArrayProxy with native arrays and @tracked
2. Replace computed properties with getters
3. Use @action for event handlers
4. Embrace native class syntax`;

      service.parseDocumentation(mockDoc);
    });

    it('should handle complex multi-term search query', async () => {
      const results = await service.search('proxy deprecation modern replacement tracked', 'all', 5);

      expect(results.length).toBeGreaterThan(0);

      // Top result should have most terms matched
      const topResult = results[0];
      expect(topResult.matchedTerms).toBeGreaterThanOrEqual(3);
      expect(topResult.score).toBeGreaterThan(20);

      // Should have meaningful excerpt
      expect(topResult.excerpt).not.toBe('No preview available');
      expect(topResult.excerpt.length).toBeGreaterThan(50);
    });

    it('should find ArrayProxy API reference', async () => {
      const apiRef = await service.getApiReference('ArrayProxy');

      expect(apiRef).not.toBeNull();
      expect(apiRef.name).toBe('ArrayProxy');
      expect(apiRef.type).toBe('class');
      expect(apiRef.module).toBe('@ember/array/proxy');
      expect(apiRef.description).toContain('deprecated');
      expect(apiRef.methods).toHaveLength(2);
      expect(apiRef.properties).toHaveLength(2);
      expect(apiRef.extends).toBe('EmberObject');
    });

    it('should find ArrayProxy by module name', async () => {
      const apiRef = await service.getApiReference('@ember/array/proxy');

      expect(apiRef).not.toBeNull();
      expect(apiRef.name).toBe('ArrayProxy');
    });

    it('should prioritize API docs when searching for class names', async () => {
      const results = await service.search('Component', 'all', 5);

      expect(results.length).toBeGreaterThan(0);

      // Should find API documentation
      const hasApiResult = results.some(r => r.category === 'API Documentation');
      expect(hasApiResult).toBe(true);
    });

    it('should find migration guides in community content', async () => {
      const results = await service.search('migration ArrayProxy tracked', 'community', 5);

      expect(results.length).toBeGreaterThan(0);

      const communityResult = results.find(r => r.category === 'Community Articles');
      expect(communityResult).toBeDefined();
      expect(communityResult.excerpt.toLowerCase()).toContain('arrayproxy');
    });

    it('should return relevant excerpts with matched terms', async () => {
      const results = await service.search('tracked properties performance', 'all', 3);

      results.forEach(result => {
        const excerptLower = result.excerpt.toLowerCase();
        const hasRelevantTerm =
          excerptLower.includes('tracked') ||
          excerptLower.includes('properties') ||
          excerptLower.includes('performance');

        expect(hasRelevantTerm).toBe(true);
      });
    });

    it('should handle searches with no results gracefully', async () => {
      const results = await service.search('xyzabc123nonexistent', 'all', 5);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(0);
    });

    it('should respect category filters', async () => {
      const apiResults = await service.search('Component', 'api', 5);
      const guideResults = await service.search('reactivity', 'guides', 5);
      const communityResults = await service.search('migration', 'community', 5);

      apiResults.forEach(r => {
        expect(r.category).toBe('API Documentation');
      });

      guideResults.forEach(r => {
        expect(r.category).toBe('Guides & Tutorials');
      });

      communityResults.forEach(r => {
        expect(r.category).toBe('Community Articles');
      });
    });
  });

  describe('Real-World Use Cases', () => {
    beforeAll(() => {
      const mockDoc = `# api-docs

{
  "data": {
    "type": "class",
    "attributes": {
      "name": "Router",
      "module": "@ember/routing/router",
      "description": "The Router is responsible for managing application state and generating URLs",
      "methods": [
        {
          "name": "transitionTo",
          "description": "Transition to a route"
        }
      ]
    }
  }
}

----------

{
  "data": {
    "type": "class",
    "attributes": {
      "name": "Route",
      "module": "@ember/routing/route",
      "description": "A Route is an object that manages the model and state for a particular route",
      "methods": [
        {
          "name": "model",
          "description": "Hook for loading data"
        }
      ]
    }
  }
}

# community-bloggers

## Routing Best Practices

When building Ember applications, routing is a critical concern. Here are some best practices:

- Use route model hooks for data loading
- Keep route transitions simple
- Handle loading and error states
- Use query parameters wisely`;

      service.parseDocumentation(mockDoc);
    });

    it('should help users find routing information', async () => {
      const results = await service.search('routing transition model', 'all', 5);

      expect(results.length).toBeGreaterThan(0);
      // Should find routing-related content in title or excerpt
      const hasRoutingContent = results.some(r =>
        r.title.toLowerCase().includes('rout') || r.excerpt.toLowerCase().includes('rout')
      );
      expect(hasRoutingContent).toBe(true);
    });

    it('should find specific API by name', async () => {
      const router = await service.getApiReference('Router');
      const route = await service.getApiReference('Route');

      expect(router).not.toBeNull();
      expect(router.name).toBe('Router');

      expect(route).not.toBeNull();
      expect(route.name).toBe('Route');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty documentation', () => {
      const emptyService = new DocumentationService();
      emptyService.parseDocumentation('');

      expect(emptyService.sections).toBeDefined();
      expect(Object.keys(emptyService.sections).length).toBe(0);
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedService = new DocumentationService();
      const mockDoc = `# api-docs

{
  "data": {
    "attributes": {
      "name": "Test"
    }
  }
  // Missing closing brace

----------

{
  "data": {
    "attributes": {
      "name": "ValidClass"
    }
  }
}`;

      malformedService.parseDocumentation(mockDoc);

      // Should still index the valid entry
      expect(malformedService.apiIndex.has('validclass')).toBe(true);
    });

    it('should handle special characters in search', async () => {
      const service = new DocumentationService();
      const mockDoc = `# guides

@tracked and @action are decorators`;

      service.parseDocumentation(mockDoc);

      const results = await service.search('@tracked @action', 'all', 5);
      expect(results).toBeInstanceOf(Array);
    });
  });
});
