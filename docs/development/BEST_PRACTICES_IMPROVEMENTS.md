# Best Practices Improvements

## Summary

Enhanced the `get_best_practices` MCP tool with generic improvements that make it work better for all topics, addressing the issue where queries like "templates handlebars" weren't surfacing information about modern template formats (gjs/gts).

## Dependencies Added

- **`pluralize`** - Professional inflection library for handling singular/plural conversions, including irregular plurals (child/children, person/people, etc.)

## Changes Made

### 1. Proper Inflection with pluralize Library

**Added:** `pluralize` package for robust singular/plural matching

**Custom Rules:**
```javascript
pluralize.addSingularRule(/caches$/i, 'cache');
pluralize.addUncountableRule('data'); // Common in tech/programming
```

**Impact:** Handles all edge cases correctly:
- Regular plurals: templates ↔ template
- Irregular plurals: children ↔ child, people ↔ person
- Words ending in 'ies': queries ↔ query, factories ↔ factory
- Words ending in 'es': classes ↔ class, boxes ↔ box
- Custom rules: caches ↔ cache, data ↔ data (uncountable)

### 2. Improved Title Extraction (`extractTitle()`)

**Problem:** Titles were often generic and unhelpful (e.g., "For all projects" instead of "<template> quickstart").

**Solution:** Added generic filtering to skip unhelpful patterns:
- Skip generic phrase starters: "for all", "in this", "with these", etc.
- Skip list items, URLs, version numbers
- Parse YAML/TOML frontmatter for explicit titles
- Extract first meaningful sentence from content as fallback

**Impact:** Titles are now meaningful and help users identify relevant results.

**Example:**
- Before: "For all projects"
- After: "<template> quickstart"

### 2. Relevance-Based Scoring & Ranking

**Problem:** Best practices weren't sorted by relevance, so random results appeared first.

**Solution:** Implemented a scoring system:
- **Topic term matches** (required): 10 points per matched term
- **All terms present bonus**: +20 points
- **Strong keywords**: +5 points each ("best practice", "migration guide", "anti-pattern", etc.)
- **Weak keywords**: +2 points each, only if strong keywords exist ("tip", "performance", etc.)
- **Minimum threshold**: Score must be ≥15 to be considered

Results are now sorted by score (descending) before returning top 5.

**Impact:** Most relevant results appear first, not random content.

### 3. Better Term Matching

**Problem:** Single keyword "template" wouldn't match compound queries well.

**Solution:**
- Split topic into terms (filtering out short words <3 chars)
- Require at least one topic term to match
- Score based on how many terms match
- Give bonus when all terms are present

**Impact:** Multi-word queries like "templates handlebars" now work correctly.

### 4. Weighted Keywords

**Problem:** Weak keywords like "should" and "modern" appear in almost everything, causing too many false positives.

**Solution:**
- Categorized keywords into **strong** (high signal) and **weak** (only meaningful with strong)
- Weak keywords only contribute to score if strong keywords exist
- Prevents documents from matching just because they use common words

**Strong keywords:**
- "best practice"
- "recommended approach"
- "modern pattern"
- "idiomatic"
- "anti-pattern"
- "migration guide"
- etc.

**Weak keywords:**
- "tip"
- "performance"
- "recommended"
- "should"
- "modern"

**Impact:** Reduces false positives from 102 results to ~8-10 relevant ones.

### 5. Deduplication

**Problem:** Same content appearing multiple times in results.

**Solution:** Track seen titles (case-insensitive) and skip duplicates.

**Impact:** Users see 5 unique, relevant results instead of repeated content.

## Results

### Before
```
get_best_practices(topic: "templates handlebars")
→ No best practices found
```

### After
```
get_best_practices(topic: "templates handlebars")
→ Returns 5 relevant results including:
   1. "<template> quickstart" - Info about gjs/gts
   2. TypeScript union types in templates
   3. ember-template-lint configuration
   4. Prettier formatting for templates
   5. Template-only vs class components
```

### Other Topics Work Well Too

**Components:**
- Dependency injection patterns
- Template-only vs class components
- Component testing strategies

**Routing:**
- WarpDrive routing patterns
- Route pre-fetching
- SPA routing best practices

**Testing:**
- Dependency injection for testing
- Template-only component performance
- Testing strategies for WarpDrive

## Generic Design

All improvements are **generic** and work across any topic:
- ✅ No hardcoded topic-to-keyword mappings
- ✅ Pattern-based filtering (not specific to templates/components)
- ✅ Term splitting and matching works for any multi-word query
- ✅ Scoring system is topic-agnostic
- ✅ Deduplication by title works universally

## Code Changes

**File:** `lib/documentation-service.js`

**Lines modified:**
- `270-350`: Enhanced `extractTitle()` with generic filtering
- `547-651`: Rewrote `getBestPractices()` with scoring, ranking, and deduplication

**Test Results:**
```
✓ test/deprecation-manager.test.js (24 tests)
✓ test/integration.test.js (13 tests)
✓ test/documentation-service.test.js (24 tests)
✓ test/inflection.test.js (6 tests)

Test Files  4 passed (4)
Tests       67 passed (67)
```

All existing tests continue to pass, plus 6 new tests for inflection.

## Benefits

1. **Better User Experience:** Users now get relevant, well-titled results
2. **Generic Solution:** Works for any topic, not just templates
3. **Maintainable:** No topic-specific mappings to maintain
4. **Accurate:** Scoring ensures most relevant content surfaces first
5. **Clean Results:** Deduplication prevents repeated content

## Technical Approach

The solution follows these principles:
- **Pattern recognition** over hardcoding
- **Scoring heuristics** for relevance
- **Fail gracefully** with meaningful fallbacks
- **Preserve existing behavior** (all tests pass)
- **Generic algorithms** that work across domains

This approach ensures the system improves for all topics without requiring manual curation or topic-specific logic.
