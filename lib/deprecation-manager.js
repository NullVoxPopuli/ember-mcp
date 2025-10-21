/**
 * DeprecationManager
 *
 * Manages deprecation detection and provides warnings for legacy Ember APIs.
 * This system:
 * - Detects deprecated APIs from documentation content
 * - Extracts modern alternatives and migration guidance
 * - Provides consistent deprecation warnings across all tools
 */

export class DeprecationManager {
  constructor() {
    // Map of API name (lowercase) -> deprecation info
    this.deprecations = new Map();

    // Known deprecated APIs with hardcoded info (fallback)
    this.knownDeprecations = new Map([
      ['arrayproxy', {
        name: 'ArrayProxy',
        status: 'deprecated',
        reason: 'Native Proxy is now available in all supported environments',
        modernAlternative: 'Use tracked properties and native arrays for reactive data',
        category: 'legacy-proxy',
        severity: 'warning'
      }],
      ['objectproxy', {
        name: 'ObjectProxy',
        status: 'deprecated',
        reason: 'Native Proxy is now available in all supported environments',
        modernAlternative: 'Use tracked properties with plain objects',
        category: 'legacy-proxy',
        severity: 'warning'
      }],
      ['promiseproxymixin', {
        name: 'PromiseProxyMixin',
        status: 'deprecated',
        reason: 'Native Proxy is now available in all supported environments',
        modernAlternative: 'Use ember-async-data or ember-concurrency with tracked properties',
        category: 'legacy-proxy',
        severity: 'warning'
      }],
      ['evented', {
        name: 'Evented',
        status: 'deprecated',
        reason: 'Legacy event system from pre-modern Ember',
        modernAlternative: 'Use native event system or ember-concurrency for complex flows',
        category: 'legacy-events',
        severity: 'info'
      }]
    ]);
  }

  /**
   * Analyze documentation content to detect deprecation information
   * @param {string} name - API name
   * @param {string} content - Documentation content to analyze
   * @returns {Object|null} Deprecation info if found
   */
  analyzeContent(name, content) {
    if (!content) return null;

    const lowerContent = content.toLowerCase();
    const lowerName = name.toLowerCase();

    // Check if content mentions deprecation
    const deprecationKeywords = [
      /\bdeprecated\b/i,
      /\blegacy\b/i,
      /\bno longer recommended\b/i,
      /\bnot preferred\b/i,
      /\bshould not be used\b/i,
      /\bavoid using\b/i
    ];

    const hasDeprecationKeyword = deprecationKeywords.some(pattern =>
      pattern.test(content)
    );

    if (!hasDeprecationKeyword) {
      return null;
    }

    // Extract version if present
    const versionMatch = content.match(/deprecated\s+(?:since|in)\s+(?:ember\s+)?v?(\d+\.\d+(?:\.\d+)?)/i);
    const since = versionMatch ? versionMatch[1] : null;

    // Extract reason
    let reason = null;
    const reasonMatch = content.match(/deprecated[^.]*?(?:because|since|as|reason:?)\s+([^.]+)/i);
    if (reasonMatch) {
      reason = reasonMatch[1].trim();
    }

    // Extract modern alternative
    let modernAlternative = null;
    const alternativePatterns = [
      /(?:use|try|prefer|instead,?\s+use)\s+([`'"]?[^`'".,\n]+[`'"]?)/i,
      /(?:replaced\s+by|superseded\s+by)\s+([`'"]?[^`'".,\n]+[`'"]?)/i,
      /(?:modern\s+alternative:?)\s+([`'"]?[^`'".,\n]+[`'"]?)/i
    ];

    for (const pattern of alternativePatterns) {
      const match = content.match(pattern);
      if (match) {
        modernAlternative = match[1].replace(/[`'"]/g, '').trim();
        break;
      }
    }

    return {
      name,
      status: 'deprecated',
      since,
      reason,
      modernAlternative,
      severity: 'warning'
    };
  }

  /**
   * Check if an API is deprecated
   * @param {string} name - API name to check
   * @returns {boolean}
   */
  isDeprecated(name) {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    return this.deprecations.has(lowerName) || this.knownDeprecations.has(lowerName);
  }

  /**
   * Get deprecation information for an API
   * @param {string} name - API name
   * @returns {Object|null} Deprecation info or null
   */
  getDeprecationInfo(name) {
    if (!name) return null;
    const lowerName = name.toLowerCase();
    return this.deprecations.get(lowerName) || this.knownDeprecations.get(lowerName) || null;
  }

  /**
   * Register deprecation information
   * @param {string} name - API name
   * @param {Object} info - Deprecation information
   */
  registerDeprecation(name, info) {
    if (!name || !info) return;
    this.deprecations.set(name.toLowerCase(), info);
  }

  /**
   * Analyze and register deprecations from documentation sections
   * @param {Object} sections - Documentation sections to analyze
   */
  analyzeDocumentation(sections) {
    if (!sections || typeof sections !== 'object') return;

    // Look for deprecation guide sections
    for (const [sectionName, items] of Object.entries(sections)) {
      if (sectionName.toLowerCase().includes('deprecation')) {
        for (const item of items) {
          // Extract API names mentioned in deprecation content
          const apiNameMatch = item.content.match(/`([A-Z][a-zA-Z]+)`/g);
          if (apiNameMatch) {
            apiNameMatch.forEach(match => {
              const apiName = match.replace(/`/g, '');
              const deprecationInfo = this.analyzeContent(apiName, item.content);
              if (deprecationInfo) {
                this.registerDeprecation(apiName, {
                  ...deprecationInfo,
                  deprecationGuideLink: item.link
                });
              }
            });
          }
        }
      }
    }
  }

  /**
   * Generate a formatted deprecation warning message
   * @param {string} name - API name
   * @param {string} format - Format type ('banner', 'inline', 'short')
   * @returns {string} Formatted warning message
   */
  generateWarning(name, format = 'banner') {
    const info = this.getDeprecationInfo(name);
    if (!info) return '';

    const icon = info.severity === 'warning' ? '⚠️' : 'ℹ️';

    if (format === 'short') {
      return `${icon} **Deprecated**${info.since ? ` (since v${info.since})` : ''}`;
    }

    if (format === 'inline') {
      let msg = `${icon} **Deprecated**`;
      if (info.since) msg += ` since v${info.since}`;
      if (info.modernAlternative) msg += ` - Use ${info.modernAlternative} instead`;
      return msg;
    }

    // Banner format (default)
    let warning = `\n> ${icon} **DEPRECATION WARNING**\n>\n`;
    warning += `> **\`${info.name}\` is deprecated**`;

    if (info.since) {
      warning += ` since Ember v${info.since}`;
    }
    warning += '\n>\n';

    if (info.reason) {
      warning += `> ${info.reason}\n>\n`;
    }

    if (info.modernAlternative) {
      warning += `> **Modern Alternative:** ${info.modernAlternative}\n>\n`;
    }

    if (info.deprecationGuideLink) {
      warning += `> [View Deprecation Guide](${info.deprecationGuideLink})\n`;
    }

    warning += '\n';

    return warning;
  }

  /**
   * Check if search result is for a deprecated API
   * @param {Object} result - Search result object
   * @returns {Object|null} Deprecation info if deprecated
   */
  checkSearchResult(result) {
    if (!result || !result.title) return null;

    // Extract potential API names from title
    const apiNameMatch = result.title.match(/`?([A-Z][a-zA-Z]+)`?/);
    if (apiNameMatch) {
      const apiName = apiNameMatch[1];
      if (this.isDeprecated(apiName)) {
        return this.getDeprecationInfo(apiName);
      }
    }

    // Check content for deprecation keywords
    if (result.content) {
      const hasDeprecation = /\b(deprecated|legacy|no longer recommended)\b/i.test(result.content);
      if (hasDeprecation) {
        return { status: 'possibly-deprecated' };
      }
    }

    return null;
  }
}
