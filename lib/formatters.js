/**
 * Formatters for MCP tool responses
 *
 * Provides formatting functions for different types of Ember documentation
 * results including search results, API references, best practices, and version info.
 */

/**
 * Format search results as markdown
 * @param {Array} results - Search results to format
 * @param {Object} deprecationManager - DeprecationManager instance for deprecation warnings
 * @returns {string} Formatted markdown string
 */
export function formatSearchResults(results, deprecationManager) {
  let output = `# Ember Documentation Search Results\n\n`;
  output += `Found ${results.length} result(s):\n\n`;

  results.forEach((result, index) => {
    output += `## ${index + 1}. ${result.title}`;

    // Add deprecation indicator if applicable
    if (result.deprecationInfo && result.deprecationInfo.status !== 'possibly-deprecated') {
      output += ` ${deprecationManager.generateWarning(result.title, 'short')}`;
    }
    output += `\n\n`;

    output += `**Category:** ${result.category}`;

    // Show match quality
    if (result.matchedTerms !== undefined && result.totalTerms !== undefined) {
      output += ` | **Match:** ${result.matchedTerms}/${result.totalTerms} terms`;
    }
    if (result.score !== undefined) {
      output += ` (relevance: ${result.score})`;
    }
    output += `\n\n`;

    // Add inline deprecation warning if applicable
    if (result.deprecationInfo && result.deprecationInfo.status !== 'possibly-deprecated') {
      output += `${deprecationManager.generateWarning(result.title, 'inline')}\n\n`;
    }

    output += `${result.excerpt}\n\n`;

    if (result.url) {
      output += `**Link:** ${result.url}\n\n`;
    }

    if (result.apiLink) {
      output += `**API Reference:** ${result.apiLink}\n\n`;
    }

    output += `---\n\n`;
  });

  return output;
}

/**
 * Format API reference documentation as markdown
 * @param {Object} apiDoc - API documentation object
 * @param {Object} deprecationManager - DeprecationManager instance for deprecation warnings
 * @returns {string} Formatted markdown string
 */
export function formatApiReference(apiDoc, deprecationManager) {
  let output = `# ${apiDoc.name}\n\n`;

  // Add deprecation warning if applicable
  if (apiDoc.deprecationInfo) {
    output += deprecationManager.generateWarning(apiDoc.name, 'banner');
  }

  if (apiDoc.module) {
    output += `**Module:** \`${apiDoc.module}\`\n\n`;
  }

  if (apiDoc.type) {
    output += `**Type:** ${apiDoc.type}\n\n`;
  }

  if (apiDoc.description) {
    output += `## Description\n\n${apiDoc.description}\n\n`;
  }

  if (apiDoc.extends) {
    output += `**Extends:** ${apiDoc.extends}\n\n`;
  }

  if (apiDoc.file) {
    output += `**Source:** \`${apiDoc.file}\``;
    if (apiDoc.line) {
      output += `:${apiDoc.line}`;
    }
    output += `\n\n`;
  }

  if (apiDoc.methods && apiDoc.methods.length > 0) {
    output += `## Methods\n\n`;
    apiDoc.methods.slice(0, 10).forEach((method) => {
      output += `### ${method.name}\n\n`;
      if (method.description) {
        output += `${method.description}\n\n`;
      }
      if (method.params && method.params.length > 0) {
        output += `**Parameters:**\n`;
        method.params.forEach((param) => {
          output += `- \`${param.name}\``;
          if (param.type) output += ` (${param.type})`;
          if (param.description) output += `: ${param.description}`;
          output += `\n`;
        });
        output += `\n`;
      }
      if (method.return) {
        output += `**Returns:** ${method.return.type || "void"}`;
        if (method.return.description) {
          output += ` - ${method.return.description}`;
        }
        output += `\n\n`;
      }
    });
  }

  if (apiDoc.properties && apiDoc.properties.length > 0) {
    output += `## Properties\n\n`;
    apiDoc.properties.slice(0, 10).forEach((prop) => {
      output += `### ${prop.name}\n\n`;
      if (prop.description) {
        output += `${prop.description}\n\n`;
      }
      if (prop.type) {
        output += `**Type:** ${prop.type}\n\n`;
      }
    });
  }

  if (apiDoc.apiUrl) {
    output += `\n**Full API Documentation:** ${apiDoc.apiUrl}\n`;
  }

  return output;
}

/**
 * Format best practices as markdown
 * @param {Array} practices - Best practices to format
 * @param {string} topic - Topic being queried
 * @param {Object} deprecationManager - DeprecationManager instance for deprecation warnings
 * @returns {string} Formatted markdown string
 */
export function formatBestPractices(practices, topic, deprecationManager) {
  let output = `# Best Practices: ${topic}\n\n`;

  // Check if the topic itself is a deprecated API
  if (deprecationManager.isDeprecated(topic)) {
    output += deprecationManager.generateWarning(topic, 'banner');
  }

  practices.forEach((practice, index) => {
    output += `## ${index + 1}. ${practice.title}\n\n`;
    output += `${practice.content}\n\n`;

    if (practice.examples && practice.examples.length > 0) {
      output += `### Examples\n\n`;
      practice.examples.forEach((example) => {
        output += `${example}\n\n`;
      });
    }

    if (practice.antiPatterns && practice.antiPatterns.length > 0) {
      output += `### ❌ Anti-patterns to Avoid\n\n`;
      practice.antiPatterns.forEach((antiPattern) => {
        output += `- ${antiPattern}\n`;
      });
      output += `\n`;
    }

    if (practice.references && practice.references.length > 0) {
      output += `### References\n\n`;
      practice.references.forEach((ref) => {
        output += `- ${ref}\n`;
      });
      output += `\n`;
    }

    output += `---\n\n`;
  });

  return output;
}

/**
 * Format version information as markdown
 * @param {Object} versionInfo - Version information object
 * @returns {string} Formatted markdown string
 */
export function formatVersionInfo(versionInfo) {
  let output = `# Ember.js Version Information\n\n`;

  if (versionInfo.current) {
    output += `**Current Stable Version:** ${versionInfo.current}\n\n`;
  }

  if (versionInfo.description) {
    output += `${versionInfo.description}\n\n`;
  }

  if (versionInfo.features && versionInfo.features.length > 0) {
    output += `## Key Features\n\n`;
    versionInfo.features.forEach((feature) => {
      output += `- ${feature}\n`;
    });
    output += `\n`;
  }

  if (versionInfo.migrationGuide) {
    output += `## Migration Guide\n\n`;
    output += `${versionInfo.migrationGuide}\n\n`;
  }

  if (versionInfo.links && versionInfo.links.length > 0) {
    output += `## Useful Links\n\n`;
    versionInfo.links.forEach((link) => {
      output += `- ${link}\n`;
    });
    output += `\n`;
  }

  return output;
}
