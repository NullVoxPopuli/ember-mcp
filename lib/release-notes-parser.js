/**
 * ReleaseNotesParser
 *
 * Parses GitHub release notes to extract structured information about
 * features, bug fixes, breaking changes, and descriptions.
 */

/**
 * Extract items by tag from Ember CHANGELOG format
 * @private
 * @param {string} body - Release notes body
 * @param {RegExp} tagPattern - Regex to match tagged items
 * @param {number} [maxItems=10] - Maximum items to return
 * @param {number} [minLength=10] - Minimum item length
 * @param {number} [maxLength=200] - Maximum item length
 * @returns {Array<string>} Extracted items
 */
function extractByTag(body, tagPattern, maxItems = 10, minLength = 10, maxLength = 200) {
  const items = [];
  const lines = body.split('\n');

  for (const line of lines) {
    if (line.match(/^[-*]\s/) && tagPattern.test(line)) {
      // Remove the bullet point
      let item = line.replace(/^[-*]\s+/, '').trim();
      // Remove PR links at the start (e.g., [#20950](url) / [#20961](url))
      item = item.replace(/^(\[#\d+\]\([^)]+\)\s*\/?\s*)+/, '').trim();
      // Remove the tag itself (e.g., [FEATURE], [BUGFIX])
      item = item.replace(/\[(FEATURE|ENHANCEMENT|BUGFIX|BREAKING|CLEANUP|INTERNAL|DEPRECATION)\]\s*/i, '').trim();

      if (item.length >= minLength && item.length <= maxLength) {
        items.push(item);
      }
    }
  }

  return items.slice(0, maxItems);
}

export class ReleaseNotesParser {
  /**
   * Extract description from release notes
   * Gets the first paragraph before any headers or list items
   * @param {string} body - Release notes body
   * @returns {string} Description text (max 300 chars)
   */
  extractDescription(body) {
    const lines = body.split('\n');
    const descLines = [];

    for (const line of lines) {
      // Stop at headers or list items
      if (line.match(/^#+\s/) || line.match(/^[-*]\s/)) {
        break;
      }
      if (line.trim()) {
        descLines.push(line.trim());
      }
      if (descLines.length >= 3) break;
    }

    const description = descLines.join(' ').substring(0, 300);
    return description || 'No description available in release notes.';
  }

  /**
   * Extract features from Ember CHANGELOG
   * Looks for [FEATURE] and [ENHANCEMENT] tags
   * @param {string} body - Release notes body
   * @returns {Array<string>} List of features (max 10)
   */
  extractFeatures(body) {
    return extractByTag(body, /\[(FEATURE|ENHANCEMENT)\]/i);
  }

  /**
   * Extract bug fixes from Ember CHANGELOG
   * Looks for [BUGFIX] tags
   * @param {string} body - Release notes body
   * @returns {Array<string>} List of bug fixes (max 10)
   */
  extractBugFixes(body) {
    return extractByTag(body, /\[BUGFIX\]/i);
  }

  /**
   * Extract breaking changes from Ember CHANGELOG
   * Looks for [BREAKING] tags
   * @param {string} body - Release notes body
   * @returns {Array<string>} List of breaking changes (max 10)
   */
  extractBreakingChanges(body) {
    return extractByTag(body, /\[BREAKING\]/i);
  }

  /**
   * Parse complete release information from GitHub release data
   * @param {Object} release - GitHub release object
   * @param {string} version - Version string
   * @returns {Object} Parsed release information
   */
  parseRelease(release, version) {
    const body = release.body || '';

    return {
      version,
      releaseDate: release.published_at
        ? new Date(release.published_at).toISOString().split('T')[0]
        : null,
      description: this.extractDescription(body),
      features: this.extractFeatures(body),
      bugFixes: this.extractBugFixes(body),
      breakingChanges: this.extractBreakingChanges(body),
      url: release.html_url
    };
  }
}
