import fetch from "node-fetch";
import pluralize from "pluralize";
import { DeprecationManager } from "./deprecation-manager.js";
import {
  DOCS_URL,
  SEARCH_CONFIG,
  BEST_PRACTICES_KEYWORDS,
  PLURALIZATION_RULES,
} from "./config.js";
import {
  generateUrl,
  generateApiLink,
  generateApiUrl,
  generateVersionLinks,
  generateUpgradeGuideUrl,
} from "./url-builder.js";

// Configure pluralize with custom rules for tech/Ember-specific terms
PLURALIZATION_RULES.singularRules.forEach(rule => {
  pluralize.addSingularRule(rule.pattern, rule.replacement);
});
PLURALIZATION_RULES.uncountable.forEach(word => {
  pluralize.addUncountableRule(word);
});

/**
 * DocumentationService
 *
 * Manages loading, parsing, indexing, and searching Ember.js documentation.
 * Provides methods to search docs, retrieve API references, get best practices,
 * and access version information.
 */
export class DocumentationService {
  constructor() {
    this.documentation = null;
    this.sections = {};
    this.apiIndex = new Map();
    this.loaded = false;
    this.deprecationManager = new DeprecationManager();
  }

  /**
   * Ensure documentation is loaded before use
   * @returns {Promise<void>}
   */
  async ensureLoaded() {
    if (!this.loaded) {
      await this.loadDocumentation();
    }
  }

  /**
   * Load and parse Ember documentation from remote source
   * @private
   * @returns {Promise<void>}
   * @throws {Error} If documentation fetch fails
   */
  async loadDocumentation() {
    console.error("Loading Ember documentation...");
    try {
      const response = await fetch(DOCS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: ${response.status}`);
      }
      const text = await response.text();
      this.documentation = text;
      this.parseDocumentation(text);
      this.loaded = true;
      console.error("Documentation loaded successfully");
    } catch (error) {
      console.error("Error loading documentation:", error);
      throw error;
    }
  }

  parseDocumentation(text) {
    const lines = text.split("\n");
    let currentSection = null;
    let currentContent = [];
    let sectionName = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Section headers are like: # api-docs or # community-bloggers
      if (line.match(/^# [a-z-]+$/)) {
        // Save previous section
        if (currentSection !== null && currentContent.length > 0) {
          this.sections[sectionName] = this.sections[sectionName] || [];
          this.sections[sectionName].push({
            content: currentContent.join("\n"),
            startLine: currentSection,
          });
        }

        // Start new section
        sectionName = line.substring(2).trim();
        currentSection = i;
        currentContent = [line];
      } else if (
        line.match(/^-{3,}$/) &&
        currentContent.length > 1 &&
        currentSection !== null
      ) {
        // Separator between items in same section
        if (currentContent.length > 0) {
          this.sections[sectionName] = this.sections[sectionName] || [];
          this.sections[sectionName].push({
            content: currentContent.join("\n"),
            startLine: currentSection,
          });
        }
        currentSection = i + 1;
        currentContent = [];
      } else if (currentSection !== null) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection !== null && currentContent.length > 0) {
      this.sections[sectionName] = this.sections[sectionName] || [];
      this.sections[sectionName].push({
        content: currentContent.join("\n"),
        startLine: currentSection,
      });
    }

    // Parse API docs for indexing
    this.indexApiDocs();

    // Analyze documentation for deprecations
    this.deprecationManager.analyzeDocumentation(this.sections);
  }

  indexApiDocs() {
    const apiDocs = this.sections["api-docs"] || [];

    apiDocs.forEach((doc) => {
      try {
        // The doc.content should be a complete JSON object (or have minimal header text)
        // Try to extract just the JSON portion
        const content = doc.content.trim();

        // Find the first { that starts the JSON
        const jsonStart = content.indexOf('{');
        if (jsonStart === -1) return;

        // Find the last } that ends the JSON
        const jsonEnd = content.lastIndexOf('}');
        if (jsonEnd === -1 || jsonEnd <= jsonStart) return;

        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);

        if (parsed.data && parsed.data.attributes) {
          const attrs = parsed.data.attributes;
          const name = attrs.name || attrs.shortname;
          if (name) {
            const apiEntry = {
              name: name,
              type: parsed.data.type,
              module: attrs.module,
              description: attrs.description,
              file: attrs.file,
              line: attrs.line,
              extends: attrs.extends,
              methods: attrs.methods || [],
              properties: attrs.properties || [],
              rawData: parsed.data,
            };

            // Check for deprecation in the API description
            const deprecationInfo = this.deprecationManager.analyzeContent(name, attrs.description || '');
            if (deprecationInfo) {
              this.deprecationManager.registerDeprecation(name, deprecationInfo);
            }

            this.apiIndex.set(name.toLowerCase(), apiEntry);

            // Also index by module name
            if (attrs.module) {
              this.apiIndex.set(attrs.module.toLowerCase(), apiEntry);
            }

            // Index common variations
            if (name.includes('.')) {
              const parts = name.split('.');
              this.apiIndex.set(parts[parts.length - 1].toLowerCase(), apiEntry);
            }
          }
        }
      } catch (e) {
        // Log errors to help debug but don't crash
        console.error(`Error parsing API doc: ${e.message}`);
      }
    });

    console.error(`Indexed ${this.apiIndex.size} API entries`);
  }

  /**
   * Search documentation with relevance scoring
   * @param {string} query - Search query string
   * @param {string} [category="all"] - Category filter: "all", "api", "guides", or "community"
   * @param {number} [limit=5] - Maximum number of results to return
   * @returns {Promise<Array<Object>>} Array of search results with title, excerpt, score, url, etc.
   */
  async search(query, category = "all", limit = 5) {
    const results = [];
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(/\s+/).filter(term => term.length > 0);

    const sectionsToSearch =
      category === "all"
        ? Object.keys(this.sections)
        : category === "api"
        ? ["api-docs"]
        : category === "guides"
        ? Object.keys(this.sections).filter(
            (s) => !["api-docs", "community-bloggers"].includes(s)
          )
        : category === "community"
        ? ["community-bloggers"]
        : [];

    for (const sectionName of sectionsToSearch) {
      const sectionItems = this.sections[sectionName] || [];

      for (const item of sectionItems) {
        const content = item.content.toLowerCase();
        const title = this.extractTitle(item.content);
        const titleLower = title.toLowerCase();

        // Calculate relevance score with better weighting
        let score = 0;
        let matchedTerms = [];
        let termPositions = [];

        // Exact phrase match - highest value
        if (content.includes(queryLower)) {
          score += SEARCH_CONFIG.EXACT_PHRASE_BONUS;
          matchedTerms.push(queryLower);
        }

        // Check each term
        searchTerms.forEach((term) => {
          const matches = (content.match(new RegExp(term, "gi")) || []).length;
          if (matches > 0) {
            matchedTerms.push(term);

            // Title matches are highly relevant
            if (titleLower.includes(term)) {
              score += SEARCH_CONFIG.TITLE_MATCH_BONUS;
            }

            // Base score for term presence
            score += matches * SEARCH_CONFIG.TERM_MATCH_WEIGHT;

            // Find first position of this term for proximity scoring
            const pos = content.indexOf(term);
            if (pos !== -1) {
              termPositions.push({ term, pos });
            }
          }
        });

        // All terms present - significant bonus
        if (matchedTerms.length === searchTerms.length) {
          score += SEARCH_CONFIG.ALL_TERMS_BONUS;

          // Proximity bonus: terms close together are more relevant
          if (termPositions.length > 1) {
            termPositions.sort((a, b) => a.pos - b.pos);
            const spread = termPositions[termPositions.length - 1].pos - termPositions[0].pos;
            // If all terms within proximity threshold, add proximity bonus
            if (spread < SEARCH_CONFIG.PROXIMITY_THRESHOLD) {
              score += Math.floor((SEARCH_CONFIG.PROXIMITY_THRESHOLD - spread) / SEARCH_CONFIG.PROXIMITY_BONUS_DIVISOR);
            }
          }
        }

        // Only include results with meaningful matches
        // Require at least 2 terms or a high-value single match
        if (score >= SEARCH_CONFIG.MIN_SCORE && (matchedTerms.length >= 2 || score >= SEARCH_CONFIG.MIN_SCORE_SINGLE_TERM)) {
          const excerpt = this.extractExcerpt(item.content, searchTerms, termPositions);

          // Check if this result is for a deprecated API
          const deprecationInfo = this.deprecationManager.checkSearchResult({ title, content: item.content });

          results.push({
            title,
            category: this.categorizeSectionName(sectionName),
            excerpt,
            score,
            url: generateUrl(sectionName, title),
            apiLink: generateApiLink(item.content),
            matchedTerms: matchedTerms.length,
            totalTerms: searchTerms.length,
            deprecationInfo: deprecationInfo,
          });
        }
      }
    }

    // Sort by score and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  extractTitle(content) {
    const lines = content.split("\n");

    // Generic patterns to skip (these are rarely meaningful titles)
    const genericPatterns = [
      /^for (all|any|most|some)/i,
      /^in (this|these|all|any)/i,
      /^with (this|these|all|any)/i,
      /^using (this|these|all|any)/i,
      /^(note|warning|tip|important):/i,
      /^(here|there|this|that) (is|are)/i,
      /^https?:\/\//i, // URLs
      /^[0-9.]+$/, // Version numbers
      /^[-*+]\s/, // List items
    ];

    // Look for frontmatter title (YAML/TOML at start of document)
    const frontmatterMatch = content.match(/^---\s*\n(?:.*\n)*?title:\s*["']?([^"'\n]+)["']?\s*\n(?:.*\n)*?---/i);
    if (frontmatterMatch) {
      return frontmatterMatch[1].trim();
    }

    // Look for markdown headers, but skip generic ones
    for (const line of lines) {
      const headerMatch = line.match(/^#+\s+(.+)$/);
      if (headerMatch) {
        const title = headerMatch[1].trim();
        // Skip if it matches generic patterns
        const isGeneric = genericPatterns.some(pattern => pattern.test(title));
        if (!isGeneric && title.length > 3) {
          return title;
        }
      }
    }

    // Try to extract from JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*"data"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.data?.attributes?.name) {
          return parsed.data.attributes.name;
        }
      }
    } catch (e) {
      // Ignore
    }

    // Improved fallback: find first meaningful sentence or phrase
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip various non-title patterns
      if (!trimmed ||
          trimmed.match(/^[-=]+$/) ||
          trimmed.startsWith('{') ||
          trimmed.startsWith('[') ||
          trimmed.startsWith('```') ||
          trimmed.match(/^https?:\/\//)) {
        continue;
      }

      // Skip generic patterns
      const isGeneric = genericPatterns.some(pattern => pattern.test(trimmed));
      if (isGeneric) {
        continue;
      }

      // Return first meaningful content
      if (trimmed.length > 10) {
        // If it's a long line, try to extract a sentence
        const sentenceMatch = trimmed.match(/^([^.!?]+[.!?])/);
        if (sentenceMatch) {
          return sentenceMatch[1].trim().substring(0, 100);
        }
        return trimmed.substring(0, 100);
      }
    }

    return "Untitled";
  }

  extractExcerpt(content, searchTerms, termPositions) {
    const contentLower = content.toLowerCase();

    // If we have term positions, extract context around the best cluster of matches
    if (termPositions && termPositions.length > 0) {
      // Find the region with the most term density
      termPositions.sort((a, b) => a.pos - b.pos);

      let bestStart = termPositions[0].pos;
      let bestDensity = 1;

      // Look for clusters of terms
      for (let i = 0; i < termPositions.length; i++) {
        let clusterSize = 1;
        for (let j = i + 1; j < termPositions.length; j++) {
          if (termPositions[j].pos - termPositions[i].pos < 500) {
            clusterSize++;
          } else {
            break;
          }
        }
        if (clusterSize > bestDensity) {
          bestDensity = clusterSize;
          bestStart = termPositions[i].pos;
        }
      }

      // Extract context around the best cluster
      const contextStart = Math.max(0, bestStart - 150);
      const contextEnd = Math.min(content.length, bestStart + 400);

      let excerpt = content.substring(contextStart, contextEnd);

      // Clean up: try to start and end at sentence/word boundaries
      if (contextStart > 0) {
        const spaceIndex = excerpt.indexOf(' ');
        if (spaceIndex > 0 && spaceIndex < 50) {
          excerpt = excerpt.substring(spaceIndex + 1);
        }
        excerpt = "..." + excerpt;
      }

      if (contextEnd < content.length) {
        const lastSpace = excerpt.lastIndexOf(' ');
        if (lastSpace > excerpt.length - 50) {
          excerpt = excerpt.substring(0, lastSpace);
        }
        excerpt = excerpt + "...";
      }

      // Remove JSON blocks and excessive whitespace from excerpt
      excerpt = excerpt
        .replace(/\{[\s\S]*?"data"[\s\S]*?\}/g, '[API Data]')
        .replace(/```[\s\S]*?```/g, '[Code Example]')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return excerpt;
    }

    // Fallback: try each search term individually
    if (Array.isArray(searchTerms)) {
      for (const term of searchTerms) {
        const termIndex = contentLower.indexOf(term);
        if (termIndex !== -1) {
          const start = Math.max(0, termIndex - 100);
          const end = Math.min(content.length, termIndex + 300);
          let excerpt = content.substring(start, end);

          if (start > 0) excerpt = "..." + excerpt;
          if (end < content.length) excerpt = excerpt + "...";

          // Clean up
          excerpt = excerpt
            .replace(/\{[\s\S]*?"data"[\s\S]*?\}/g, '[API Data]')
            .replace(/```[\s\S]*?```/g, '[Code Example]')
            .trim();

          return excerpt;
        }
      }
    }

    // Final fallback: get first meaningful paragraph
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.match(/^[#\-=]+/) &&
        !trimmed.startsWith("{") &&
        trimmed.length > 30
      ) {
        return trimmed.substring(0, 350);
      }
    }

    return "No preview available";
  }

  categorizeSectionName(sectionName) {
    if (sectionName === "api-docs") return "API Documentation";
    if (sectionName === "community-bloggers") return "Community Articles";
    return "Guides & Tutorials";
  }

  /**
   * Get detailed API reference documentation for a specific API element
   * @param {string} name - Name of the API element (e.g., "Component", "Router")
   * @param {string} [type] - Optional type filter ("class", "module", "method", "property")
   * @returns {Promise<Object|null>} API documentation object or null if not found
   */
  async getApiReference(name, type) {
    const key = name.toLowerCase();
    const apiDoc = this.apiIndex.get(key);

    if (!apiDoc) {
      // Try to search for it
      const results = await this.search(name, "api", 1);
      if (results.length > 0 && results[0].apiLink) {
        // Try to extract from the content
        const apiDocs = this.sections["api-docs"] || [];
        for (const doc of apiDocs) {
          if (doc.content.toLowerCase().includes(key)) {
            try {
              const jsonMatch = doc.content.match(/\{[\s\S]*"data"[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.data?.attributes) {
                  const attrs = parsed.data.attributes;
                  return {
                    name: attrs.name || attrs.shortname,
                    type: parsed.data.type,
                    module: attrs.module,
                    description: attrs.description,
                    file: attrs.file,
                    line: attrs.line,
                    extends: attrs.extends,
                    methods: attrs.methods || [],
                    properties: attrs.properties || [],
                    apiUrl: results[0].apiLink,
                  };
                }
              }
            } catch (e) {
              // Continue searching
            }
          }
        }
      }
      return null;
    }

    // Check if API is deprecated
    const deprecationInfo = this.deprecationManager.getDeprecationInfo(apiDoc.name);

    return {
      ...apiDoc,
      apiUrl: generateApiUrl(apiDoc.name, apiDoc.type),
      deprecationInfo: deprecationInfo,
    };
  }

  /**
   * Convert word to singular form for matching (handles irregular plurals)
   * Uses pluralize library for proper inflection
   * @private
   * @param {string} word - Word to convert to singular
   * @returns {string} Singular form of the word
   */
  toSingular(word) {
    return pluralize.singular(word);
  }

  /**
   * Get best practices and recommendations for a specific topic
   * @param {string} topic - Topic to search for (e.g., "components", "testing", "routing")
   * @returns {Promise<Array<Object>>} Array of best practice objects with title, content, examples, etc.
   */
  async getBestPractices(topic) {
    const practices = [];
    const topicLower = topic.toLowerCase();
    const topicTerms = topicLower.split(/\s+/).filter(term => term.length > 2);

    // Search in community articles and guides
    const communityDocs = this.sections["community-bloggers"] || [];
    const allSections = [
      ...communityDocs,
      ...Object.entries(this.sections)
        .filter(([name]) => !["api-docs", "community-bloggers"].includes(name))
        .flatMap(([_, items]) => items),
    ];

    // Best practice keywords (weighted by relevance)
    const strongKeywords = BEST_PRACTICES_KEYWORDS.strong;
    const weakKeywords = BEST_PRACTICES_KEYWORDS.weak;

    // Track seen content to avoid duplicates
    const seenTitles = new Set();

    for (const doc of allSections) {
      const content = doc.content.toLowerCase();

      // Calculate relevance score
      let score = 0;

      // Topic term matching with inflection
      // Try exact match, singular form, and plural form
      const matchedTerms = topicTerms.filter(term => {
        if (content.includes(term)) return true;

        // Try singular form (e.g., "templates" -> "template", "classes" -> "class")
        const singular = this.toSingular(term);
        if (singular !== term && content.includes(singular)) return true;

        // Try plural form (e.g., "template" -> "templates")
        const plural = pluralize.plural(term);
        if (plural !== term && content.includes(plural)) return true;

        return false;
      });

      // Require at least one term to match
      if (matchedTerms.length === 0) {
        continue;
      }

      // Score based on topic term matches
      // Give more weight to each matched term to reward relevance
      score += matchedTerms.length * SEARCH_CONFIG.BP_TERM_MATCH_WEIGHT;

      // Bonus for all terms present
      if (matchedTerms.length === topicTerms.length) {
        score += SEARCH_CONFIG.BP_ALL_TERMS_BONUS;
      }

      // Strong keyword matches
      const strongMatches = strongKeywords.filter(keyword => content.includes(keyword));
      score += strongMatches.length * SEARCH_CONFIG.BP_STRONG_KEYWORD_WEIGHT;

      // Weak keyword matches (only if strong matches exist)
      if (strongMatches.length > 0) {
        const weakMatches = weakKeywords.filter(keyword => content.includes(keyword));
        score += weakMatches.length * SEARCH_CONFIG.BP_WEAK_KEYWORD_WEIGHT;
      }

      // Simpler threshold: just require at least one term match + some best-practice signal
      // The scoring already rewards multiple term matches and keyword presence
      const minThreshold = SEARCH_CONFIG.BP_MIN_THRESHOLD;

      // Skip if score is too low (not a best practice document)
      if (score < minThreshold) {
        continue;
      }

      const title = this.extractTitle(doc.content);

      // Skip duplicates
      if (seenTitles.has(title.toLowerCase())) {
        continue;
      }
      seenTitles.add(title.toLowerCase());

      const relevantSections = this.extractBestPracticeSections(
        doc.content,
        topicLower
      );

      if (relevantSections.content) {
        practices.push({
          title,
          content: relevantSections.content,
          examples: relevantSections.examples,
          antiPatterns: relevantSections.antiPatterns,
          references: [generateUrl("community-bloggers", title)],
          score: score, // Store for sorting
        });
      }
    }

    // Sort by relevance score (descending) and return top results
    practices.sort((a, b) => b.score - a.score);
    return practices.slice(0, SEARCH_CONFIG.MAX_BEST_PRACTICES).map(practice => {
      // Remove score before returning (internal only)
      const { score, ...practiceWithoutScore } = practice;
      return practiceWithoutScore;
    });
  }

  extractBestPracticeSections(content, topic) {
    const lines = content.split("\n");
    let relevantContent = [];
    let examples = [];
    let antiPatterns = [];
    let inCodeBlock = false;
    let currentExample = [];
    let foundRelevant = false;

    // Split topic into terms for flexible matching
    const topicTerms = topic.split(/\s+/).filter(term => term.length > 2);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();

      // Track code blocks
      if (line.trim().startsWith("```")) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          currentExample = [line];
        } else {
          inCodeBlock = false;
          currentExample.push(line);
          if (foundRelevant && currentExample.length > 2) {
            examples.push(currentExample.join("\n"));
          }
          currentExample = [];
        }
        continue;
      }

      if (inCodeBlock) {
        currentExample.push(line);
        continue;
      }

      // Look for relevant sections - check if ANY topic term matches (with inflection)
      if (!foundRelevant) {
        for (const term of topicTerms) {
          if (lineLower.includes(term)) {
            foundRelevant = true;
            break;
          }

          // Try singular form
          const singular = this.toSingular(term);
          if (singular !== term && lineLower.includes(singular)) {
            foundRelevant = true;
            break;
          }

          // Try plural form
          const plural = pluralize.plural(term);
          if (plural !== term && lineLower.includes(plural)) {
            foundRelevant = true;
            break;
          }
        }
      }

      if (foundRelevant && relevantContent.length < 50) {
        // Look for anti-patterns
        if (
          lineLower.includes("avoid") ||
          lineLower.includes("don't") ||
          lineLower.includes("anti-pattern") ||
          lineLower.includes("bad practice")
        ) {
          const nextLines = lines
            .slice(i, i + 3)
            .join(" ")
            .trim();
          if (nextLines.length > 10 && nextLines.length < 200) {
            antiPatterns.push(nextLines);
          }
        }

        // Collect relevant content
        if (
          line.trim() &&
          !line.match(/^[#\-=]+$/) &&
          !line.trim().startsWith("{")
        ) {
          relevantContent.push(line);
        }
      }

      // Stop if we've moved to a completely different section
      if (foundRelevant && line.match(/^# [^#]/)) {
        break;
      }
    }

    return {
      content: relevantContent.slice(0, 30).join("\n").trim(),
      examples: examples.slice(0, 3),
      antiPatterns: [...new Set(antiPatterns)].slice(0, 3),
    };
  }

  /**
   * Get Ember.js version information, features, and migration guides
   * @param {string} [version] - Optional specific version to query
   * @returns {Promise<Object>} Version information object with current version, features, migration guide, and links
   */
  async getVersionInfo(version) {
    // Extract version information from documentation
    const versionPattern = version
      ? new RegExp(`\\b${version}\\b`, "i")
      : /\b\d+\.\d+\.\d+\b/;

    const allContent = Object.values(this.sections)
      .flat()
      .map((s) => s.content)
      .join("\n");

    // Try to find version info in API docs
    const apiDocs = this.sections["api-docs"] || [];
    let currentVersion = "unknown";

    for (const doc of apiDocs) {
      const versionMatch = doc.content.match(/ember-(\d+\.\d+\.\d+)/i);
      if (versionMatch) {
        currentVersion = versionMatch[1];
        break;
      }
    }

    // Collect version-related information
    const features = [];
    const links = generateVersionLinks();

    return {
      current: currentVersion,
      description: version
        ? `Information about Ember.js version ${version}`
        : `Latest indexed version: ${currentVersion}`,
      features: features.length > 0 ? features : ["Modern component model", "Octane edition features", "TypeScript support", "Glimmer rendering engine"],
      migrationGuide: `For migration guides, see ${generateUpgradeGuideUrl()}`,
      links,
    };
  }
}
