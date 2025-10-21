/**
 * Configuration constants for Ember Docs MCP Server
 */

// Documentation URLs
export const DOCS_URL =
  "https://nullvoxpopuli.github.io/ember-ai-information-aggregator/llms-full.txt";
export const API_DOCS_BASE = "https://api.emberjs.com/ember";
export const GUIDES_BASE = "https://guides.emberjs.com/release";

// Version information sources
export const VERSION_SOURCES = {
  GITHUB_RELEASES: "https://api.github.com/repos/emberjs/ember.js/releases",
};

// Search configuration
export const SEARCH_CONFIG = {
  // Default result limits
  DEFAULT_LIMIT: 5,
  MAX_METHODS_DISPLAYED: 10,
  MAX_PROPERTIES_DISPLAYED: 10,
  MAX_EXAMPLES: 3,
  MAX_ANTI_PATTERNS: 3,
  MAX_BEST_PRACTICES: 5,

  // Search scoring weights
  EXACT_PHRASE_BONUS: 50,
  TITLE_MATCH_BONUS: 15,
  TERM_MATCH_WEIGHT: 2,
  ALL_TERMS_BONUS: 20,
  PROXIMITY_THRESHOLD: 500,
  PROXIMITY_BONUS_DIVISOR: 50,

  // Minimum scores for inclusion
  MIN_SCORE: 10,
  MIN_SCORE_SINGLE_TERM: 20,

  // Best practices scoring
  BP_TERM_MATCH_WEIGHT: 15,
  BP_ALL_TERMS_BONUS: 20,
  BP_STRONG_KEYWORD_WEIGHT: 5,
  BP_WEAK_KEYWORD_WEIGHT: 2,
  BP_MIN_THRESHOLD: 10,

  // Excerpt configuration
  EXCERPT_BEFORE_CONTEXT: 150,
  EXCERPT_AFTER_CONTEXT: 400,
  EXCERPT_MAX_LENGTH: 350,
  EXCERPT_FALLBACK_LENGTH: 100,

  // Content limits
  MAX_RELEVANT_CONTENT_LINES: 50,
  MAX_RELEVANT_SECTION_LINES: 30,
};

// Best practices keywords
export const BEST_PRACTICES_KEYWORDS = {
  strong: [
    "best practice",
    "recommended approach",
    "modern pattern",
    "idiomatic",
    "anti-pattern",
    "avoid",
    "prefer",
    "migration guide",
  ],
  weak: [
    "tip",
    "performance",
    "recommended",
    "should",
    "modern",
  ],
};

// Pluralization configuration
export const PLURALIZATION_RULES = {
  // Custom singular rules
  singularRules: [
    { pattern: /caches$/i, replacement: 'cache' }
  ],
  // Uncountable words (treated as both singular and plural)
  uncountable: [
    'data',
    'metadata'
  ]
};
