import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentationService } from '../lib/documentation-service.js';
import { ReleaseNotesParser } from '../lib/release-notes-parser.js';
import { formatVersionInfo } from '../lib/formatters.js';

describe('ReleaseNotesParser', () => {
  let parser;

  beforeEach(() => {
    parser = new ReleaseNotesParser();
  });

  describe('extractDescription', () => {
    it('should extract first paragraph from release notes', () => {
      const body = `This is the first paragraph with important information.
This is still part of the first paragraph.

# Features

- Feature 1
- Feature 2`;

      const description = parser.extractDescription(body);
      expect(description).toContain('first paragraph');
      expect(description).not.toContain('# Features');
    });

    it('should stop at headers', () => {
      const body = `Initial description here.

# More Content

Additional stuff`;

      const description = parser.extractDescription(body);
      expect(description).toBe('Initial description here.');
      expect(description).not.toContain('# More Content');
    });

    it('should stop at list items', () => {
      const body = `Description text.

- List item 1
- List item 2`;

      const description = parser.extractDescription(body);
      expect(description).toBe('Description text.');
      expect(description).not.toContain('List item');
    });

    it('should limit to 300 characters', () => {
      const longText = 'A'.repeat(500);
      const body = longText;

      const description = parser.extractDescription(body);
      expect(description.length).toBeLessThanOrEqual(300);
    });

    it('should return fallback for empty body', () => {
      const description = parser.extractDescription('');
      expect(description).toBe('No description available in release notes.');
    });
  });

  describe('extractFeatures', () => {
    it('should extract [FEATURE] and [ENHANCEMENT] tagged items from Ember CHANGELOG', () => {
      const body = `### CHANGELOG

- [#20950](https://github.com/emberjs/ember.js/pull/20950) [FEATURE] Add new @cached decorator
- [#20951](https://github.com/emberjs/ember.js/pull/20951) [ENHANCEMENT] Improve build times
- [#20952](https://github.com/emberjs/ember.js/pull/20952) [BUGFIX] Fix routing issue`;

      const features = parser.extractFeatures(body);
      expect(features).toHaveLength(2);
      expect(features[0]).toContain('@cached decorator');
      expect(features[1]).toContain('build times');
      expect(features).not.toContain('routing issue');
    });

    it('should filter out very short items', () => {
      const body = `### CHANGELOG

- [#1](https://github.com/emberjs/ember.js/pull/1) [FEATURE] Short
- [#2](https://github.com/emberjs/ember.js/pull/2) [FEATURE] This is a proper feature description`;

      const features = parser.extractFeatures(body);
      expect(features).toHaveLength(1);
      expect(features[0]).toContain('proper feature');
    });

    it('should filter out very long items', () => {
      const body = `### CHANGELOG

- [#1](https://github.com/emberjs/ember.js/pull/1) [FEATURE] ${'A'.repeat(250)}
- [#2](https://github.com/emberjs/ember.js/pull/2) [FEATURE] Normal feature`;

      const features = parser.extractFeatures(body);
      expect(features).toHaveLength(1);
      expect(features[0]).toBe('Normal feature');
    });

    it('should limit to 10 features', () => {
      const items = Array.from({ length: 15 }, (_, i) =>
        `- [#${i}](https://github.com/emberjs/ember.js/pull/${i}) [FEATURE] Feature number ${i + 1}`
      ).join('\n');
      const body = `### CHANGELOG\n\n${items}`;

      const features = parser.extractFeatures(body);
      expect(features).toHaveLength(10);
    });

    it('should return empty array when no features found', () => {
      const body = `### CHANGELOG

- [#1](https://github.com/emberjs/ember.js/pull/1) [BUGFIX] Fix something
- [#2](https://github.com/emberjs/ember.js/pull/2) [BUGFIX] Fix another thing`;

      const features = parser.extractFeatures(body);
      expect(features).toHaveLength(0);
    });

    it('should extract from Ember CHANGELOG format with PR links', () => {
      const body = `### CHANGELOG

- [#20950](https://github.com/emberjs/ember.js/pull/20950) / [#20961](https://github.com/emberjs/ember.js/pull/20961) / [#20963](https://github.com/emberjs/ember.js/pull/20963) [FEATURE] Upgrade glimmer-vm to build in Tracked Collections (previously provided by \`tracked-built-ins\`) per [RFC #1068](https://rfcs.emberjs.com/id/1068-tracked-collections).
- [#20962](https://github.com/emberjs/ember.js/pull/20962) / [#20966](https://github.com/emberjs/ember.js/pull/20966) / [#20974](https://github.com/emberjs/ember.js/pull/20974) [FEATURE] Add \`renderComponent\` per [RFC #1099](https://rfcs.emberjs.com/id/1099-renderComponent).
- [#20957](https://github.com/emberjs/ember.js/pull/20957) / [#20960](https://github.com/emberjs/ember.js/pull/20960) Add TS 5.8, 5.9 to the TS test matrix
- [#20988](https://github.com/emberjs/ember.js/pull/20988) [BUGFIX] Drop unnecessary package ember-cli-htmlbars-inline-precompile from component-test blueprint`;

      const features = parser.extractFeatures(body);
      expect(features).toHaveLength(2);
      expect(features[0]).toContain('Upgrade glimmer-vm');
      expect(features[0]).toContain('Tracked Collections');
      expect(features[1]).toContain('renderComponent');
      expect(features).not.toContain('BUGFIX');
    });
  });

  describe('extractBugFixes', () => {
    it('should extract [BUGFIX] tagged items from Ember CHANGELOG', () => {
      const body = `### CHANGELOG

- [#1](https://github.com/emberjs/ember.js/pull/1) [BUGFIX] Fix component rendering
- [#2](https://github.com/emberjs/ember.js/pull/2) [FEATURE] Add new feature
- [#3](https://github.com/emberjs/ember.js/pull/3) [BUGFIX] Resolve async issue`;

      const fixes = parser.extractBugFixes(body);
      expect(fixes).toHaveLength(2);
      expect(fixes[0]).toContain('component rendering');
      expect(fixes[1]).toContain('async issue');
    });

    it('should limit to 10 fixes', () => {
      const items = Array.from({ length: 15 }, (_, i) =>
        `- [#${i}](https://github.com/emberjs/ember.js/pull/${i}) [BUGFIX] Fix issue ${i + 1}`
      ).join('\n');
      const body = `### CHANGELOG\n\n${items}`;

      const fixes = parser.extractBugFixes(body);
      expect(fixes).toHaveLength(10);
    });

    it('should return empty array when no fixes found', () => {
      const body = `### CHANGELOG\n\n- [#1](https://github.com/emberjs/ember.js/pull/1) [FEATURE] New feature`;

      const fixes = parser.extractBugFixes(body);
      expect(fixes).toHaveLength(0);
    });

    it('should extract from Ember CHANGELOG format with PR links', () => {
      const body = `### CHANGELOG

- [#20950](https://github.com/emberjs/ember.js/pull/20950) [FEATURE] Upgrade glimmer-vm
- [#20988](https://github.com/emberjs/ember.js/pull/20988) [BUGFIX] Drop unnecessary package ember-cli-htmlbars-inline-precompile from component-test blueprint
- [#20989](https://github.com/emberjs/ember.js/pull/20989) / [#20990](https://github.com/emberjs/ember.js/pull/20990) [BUGFIX] Fix memory leak in router service`;

      const fixes = parser.extractBugFixes(body);
      expect(fixes).toHaveLength(2);
      expect(fixes[0]).toContain('Drop unnecessary package');
      expect(fixes[1]).toContain('Fix memory leak');
    });
  });

  describe('extractBreakingChanges', () => {
    it('should extract [BREAKING] tagged items from Ember CHANGELOG', () => {
      const body = `### CHANGELOG

- [#1](https://github.com/emberjs/ember.js/pull/1) [BREAKING] Change API interface
- [#2](https://github.com/emberjs/ember.js/pull/2) [FEATURE] Add new feature
- [#3](https://github.com/emberjs/ember.js/pull/3) [BREAKING] Remove old API`;

      const breaking = parser.extractBreakingChanges(body);
      expect(breaking).toHaveLength(2);
      expect(breaking[0]).toContain('API interface');
      expect(breaking[1]).toContain('Remove old API');
    });

    it('should limit to 10 breaking changes', () => {
      const items = Array.from({ length: 15 }, (_, i) =>
        `- [#${i}](https://github.com/emberjs/ember.js/pull/${i}) [BREAKING] Breaking change ${i + 1}`
      ).join('\n');
      const body = `### CHANGELOG\n\n${items}`;

      const breaking = parser.extractBreakingChanges(body);
      expect(breaking).toHaveLength(10);
    });

    it('should return empty array when no breaking changes found', () => {
      const body = `### CHANGELOG\n\n- [#1](https://github.com/emberjs/ember.js/pull/1) [FEATURE] New feature`;

      const breaking = parser.extractBreakingChanges(body);
      expect(breaking).toHaveLength(0);
    });
  });

});

describe('DocumentationService - Version Methods', () => {
  let service;

  beforeEach(() => {
    service = new DocumentationService();
    // Mock parseDocumentation to avoid needing full docs
    service.parseDocumentation('# api-docs\n\nSome content');
  });

  describe('formatReleaseInfo', () => {
    it('should format complete release information', () => {
      const release = {
        tag_name: 'v5.4.0',
        published_at: '2024-01-15T10:00:00Z',
        body: `### CHANGELOG

- [#1](https://github.com/emberjs/ember.js/pull/1) [FEATURE] Add new component API
- [#2](https://github.com/emberjs/ember.js/pull/2) [FEATURE] Improve TypeScript support
- [#3](https://github.com/emberjs/ember.js/pull/3) [BUGFIX] Fix memory leak
- [#4](https://github.com/emberjs/ember.js/pull/4) [BUGFIX] Resolve routing issue
- [#5](https://github.com/emberjs/ember.js/pull/5) [BREAKING] Remove deprecated methods`,
        html_url: 'https://github.com/emberjs/ember.js/releases/tag/v5.4.0'
      };

      const recentReleases = [
        {
          tag_name: 'v5.3.0',
          published_at: '2024-01-01T10:00:00Z',
          html_url: 'https://github.com/emberjs/ember.js/releases/tag/v5.3.0'
        }
      ];

      const info = service.formatReleaseInfo(release, '5.4.0', recentReleases);

      expect(info.current).toBe('5.4.0');
      expect(info.releaseDate).toBe('2024-01-15');
      expect(info.features).toHaveLength(2);
      expect(info.bugFixes).toHaveLength(2);
      expect(info.breakingChanges).toHaveLength(1);
      expect(info.releaseNotesUrl).toBe('https://github.com/emberjs/ember.js/releases/tag/v5.4.0');
      expect(info.recentReleases).toHaveLength(1);
      expect(info.recentReleases[0].version).toBe('5.3.0');
    });

    it('should handle empty release body', () => {
      const release = {
        tag_name: 'v5.4.0',
        published_at: '2024-01-15T10:00:00Z',
        body: '',
        html_url: 'https://github.com/emberjs/ember.js/releases/tag/v5.4.0'
      };

      const info = service.formatReleaseInfo(release, '5.4.0');

      expect(info.current).toBe('5.4.0');
      expect(info.features).toHaveLength(0);
      expect(info.bugFixes).toHaveLength(0);
      expect(info.breakingChanges).toHaveLength(0);
      expect(info.description).toBe('No description available in release notes.');
    });

    it('should not include recentReleases when not provided', () => {
      const release = {
        tag_name: 'v5.4.0',
        published_at: '2024-01-15T10:00:00Z',
        body: 'Release notes',
        html_url: 'https://github.com/emberjs/ember.js/releases/tag/v5.4.0'
      };

      const info = service.formatReleaseInfo(release, '5.4.0');

      expect(info.recentReleases).toBeUndefined();
    });
  });

  describe('getFallbackVersionInfo', () => {
    it('should return fallback info with empty data arrays', () => {
      const info = service.getFallbackVersionInfo();

      expect(info.current).toBeDefined();
      expect(info.description).toBe('Unable to fetch release information from GitHub.');
      expect(info.features).toEqual([]);
      expect(info.bugFixes).toEqual([]);
      expect(info.breakingChanges).toEqual([]);
      expect(info.note).toContain('currently unavailable');
      expect(info.links).toBeDefined();
    });

    it('should use provided version', () => {
      const info = service.getFallbackVersionInfo('5.4.0');

      expect(info.current).toBe('5.4.0');
      expect(info.releaseNotesUrl).toContain('5.4.0');
    });

    it('should extract version from API docs when available', () => {
      const mockDoc = `# api-docs

{
  "data": {
    "id": "ember-5.4.0-Component"
  }
}`;

      service.parseDocumentation(mockDoc);
      const info = service.getFallbackVersionInfo();

      expect(info.current).toBe('5.4.0');
    });
  });
});

describe('formatVersionInfo', () => {
  it('should format complete version info', () => {
    const versionInfo = {
      current: '5.4.0',
      releaseDate: '2024-01-15',
      description: 'Major release with new features',
      features: ['New component API', 'TypeScript improvements'],
      bugFixes: ['Fix memory leak', 'Resolve routing issue'],
      breakingChanges: ['Remove deprecated methods'],
      recentReleases: [
        { version: '5.3.0', date: '2024-01-01', url: 'https://github.com/emberjs/ember.js/releases/tag/v5.3.0' }
      ],
      migrationGuide: 'See migration guide at...',
      releaseNotesUrl: 'https://github.com/emberjs/ember.js/releases/tag/v5.4.0',
      blogPost: 'https://blog.emberjs.com/ember-5-4',
      links: ['https://guides.emberjs.com', 'https://api.emberjs.com']
    };

    const formatted = formatVersionInfo(versionInfo);

    expect(formatted).toContain('**Version:** 5.4.0');
    expect(formatted).toContain('(Released: 2024-01-15)');
    expect(formatted).toContain('Major release');
    expect(formatted).toContain('## Features & Enhancements');
    expect(formatted).toContain('New component API');
    expect(formatted).toContain('## Bug Fixes');
    expect(formatted).toContain('Fix memory leak');
    expect(formatted).toContain('## ⚠️ Breaking Changes');
    expect(formatted).toContain('Remove deprecated methods');
    expect(formatted).toContain('## Recent Releases');
    expect(formatted).toContain('5.3.0');
    expect(formatted).toContain('## Migration Guide');
    expect(formatted).toContain('**Release Notes:**');
    expect(formatted).toContain('**Blog Posts:**');
  });

  it('should handle minimal version info', () => {
    const versionInfo = {
      current: '5.4.0',
      description: 'Release description',
      features: [],
      bugFixes: [],
      breakingChanges: [],
      links: []
    };

    const formatted = formatVersionInfo(versionInfo);

    expect(formatted).toContain('**Version:** 5.4.0');
    expect(formatted).toContain('Release description');
    expect(formatted).not.toContain('## Features & Enhancements');
    expect(formatted).not.toContain('## Bug Fixes');
    expect(formatted).not.toContain('## Breaking Changes');
  });

  it('should display note when present', () => {
    const versionInfo = {
      current: 'unknown',
      description: 'Unable to fetch data',
      features: [],
      bugFixes: [],
      breakingChanges: [],
      note: 'Release information is currently unavailable',
      links: []
    };

    const formatted = formatVersionInfo(versionInfo);

    expect(formatted).toContain('> **Note:**');
    expect(formatted).toContain('currently unavailable');
  });

  it('should handle missing optional fields', () => {
    const versionInfo = {
      current: '5.4.0',
      description: 'Basic release',
      features: [],
      bugFixes: [],
      breakingChanges: [],
      links: []
    };

    const formatted = formatVersionInfo(versionInfo);

    expect(formatted).not.toContain('Released:');
    expect(formatted).not.toContain('**Release Notes:**');
    expect(formatted).not.toContain('**Blog Posts:**');
    expect(formatted).not.toContain('## Recent Releases');
  });

  it('should format recent releases list', () => {
    const versionInfo = {
      current: '5.4.0',
      description: 'Latest release',
      features: [],
      bugFixes: [],
      breakingChanges: [],
      recentReleases: [
        { version: '5.3.0', date: '2024-01-01', url: 'https://example.com/5.3.0' },
        { version: '5.2.0', date: null, url: 'https://example.com/5.2.0' }
      ],
      links: []
    };

    const formatted = formatVersionInfo(versionInfo);

    expect(formatted).toContain('## Recent Releases');
    expect(formatted).toContain('**5.3.0** (2024-01-01)');
    expect(formatted).toContain('**5.2.0** - https://example.com/5.2.0');
  });
});
