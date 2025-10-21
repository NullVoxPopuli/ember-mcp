/**
 * URL Builder for Ember documentation links
 *
 * Centralizes URL generation for API docs, guides, and other Ember resources.
 */

import { API_DOCS_BASE, GUIDES_BASE } from './config.js';

/**
 * Generate a URL for a documentation section and title
 * @param {string} sectionName - Documentation section name
 * @param {string} title - Title of the documentation item
 * @returns {string} Generated URL
 */
export function generateUrl(sectionName, title) {
  if (sectionName === "api-docs") {
    // Try to extract class name from title
    const className = title.match(/^([A-Z][a-zA-Z0-9]*)/)?.[1];
    if (className) {
      return `${API_DOCS_BASE}/release/classes/${className}`;
    }
    return API_DOCS_BASE;
  }
  return GUIDES_BASE;
}

/**
 * Generate an API documentation link from content
 * @param {string} content - Documentation content to parse
 * @returns {string|null} Generated API link or null if not found
 */
export function generateApiLink(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*"data"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.data?.attributes?.name && parsed.data?.type) {
        const name = parsed.data.attributes.name;
        const type = parsed.data.type;
        if (type === "class") {
          return `${API_DOCS_BASE}/release/classes/${name}`;
        } else if (type === "module") {
          return `${API_DOCS_BASE}/release/modules/${name}`;
        }
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Generate API URL for a specific API element
 * @param {string} name - API element name
 * @param {string} type - API element type (class, module, etc.)
 * @returns {string} Generated API URL
 */
export function generateApiUrl(name, type) {
  if (type === "class") {
    return `${API_DOCS_BASE}/release/classes/${name}`;
  } else if (type === "module") {
    return `${API_DOCS_BASE}/release/modules/${name}`;
  }
  return API_DOCS_BASE;
}

/**
 * Generate links for version information
 * @returns {Array<string>} Array of useful version-related links
 */
export function generateVersionLinks() {
  return [
    `${GUIDES_BASE}`,
    `${API_DOCS_BASE}/release`,
    "https://emberjs.com/releases",
    "https://blog.emberjs.com",
  ];
}

/**
 * Generate upgrade guide URL
 * @returns {string} URL to upgrade guides
 */
export function generateUpgradeGuideUrl() {
  return `${GUIDES_BASE}/upgrading/`;
}
