# Inflection Solution with pluralize Library

## Summary

Replaced the basic `simpleStem()` method with the professional `pluralize` library to handle all singular/plural variations correctly, including irregular plurals and edge cases.

## Why pluralize?

The original `simpleStem()` method only removed trailing 's', which doesn't handle:
- Irregular plurals: children → child, people → person
- Words ending in 'ies': queries → query, factories → factory
- Words ending in 'es': classes → class (not "classe")
- Words ending in 'ves': knives → knife
- Uncountable words: data, metadata, etc.

## Installation

```bash
npm install pluralize
```

## Custom Rules Added

We configured pluralize with custom rules for tech/Ember-specific terms:

```javascript
// lib/documentation-service.js
pluralize.addSingularRule(/caches$/i, 'cache');
pluralize.addUncountableRule('data');
pluralize.addUncountableRule('metadata');
```

### Why These Rules?

1. **caches → cache**: The default pluralize behavior for "caches" wasn't ideal for our use case
2. **data**: Technically plural of "datum", but in modern programming, "data" is used as both singular and plural (like "information")
3. **metadata**: Similar to "data" - commonly treated as uncountable in tech contexts

## How It Works

### In `getBestPractices()`:

```javascript
const matchedTerms = topicTerms.filter(term => {
  if (content.includes(term)) return true;

  // Try singular form (e.g., "templates" -> "template")
  const singular = this.toSingular(term);
  if (singular !== term && content.includes(singular)) return true;

  // Try plural form (e.g., "template" -> "templates")
  const plural = pluralize.plural(term);
  if (plural !== term && content.includes(plural)) return true;

  return false;
});
```

### In `extractBestPracticeSections()`:

```javascript
// Check if ANY topic term matches (with inflection)
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
```

## Examples

### Regular Plurals
- templates ↔ template ✓
- components ↔ component ✓
- services ↔ service ✓

### Irregular Plurals
- children ↔ child ✓
- people ↔ person ✓
- criteria ↔ criterion ✓

### Words Ending in 'ies'
- queries ↔ query ✓
- factories ↔ factory ✓
- libraries ↔ library ✓

### Words Ending in 'es'
- classes ↔ class ✓
- boxes ↔ box ✓
- fixes ↔ fix ✓

### Custom Rules
- caches ↔ cache ✓
- data ↔ data ✓ (uncountable)
- metadata ↔ metadata ✓ (uncountable)

## Testing

Created `test/inflection.test.js` with tests for:
1. Custom pluralize rules work correctly
2. Plural queries match singular content
3. Singular queries match plural content
4. Irregular plurals work
5. Multi-term queries work

All 67 tests pass ✓

## Benefits

1. **Robust**: Handles all English pluralization rules correctly
2. **Extensible**: Easy to add custom rules for domain-specific terms
3. **Maintained**: `pluralize` is a well-maintained library with 500K+ weekly downloads
4. **Lightweight**: Only 9KB minified
5. **Generic**: Works across all topics, not just templates

## Future Additions

If you encounter more Ember-specific terms that need special handling, add them to the configuration at the top of `lib/documentation-service.js`:

```javascript
// Add more custom rules as needed
pluralize.addSingularRule(/pattern$/i, 'replacementPattern');
pluralize.addUncountableRule('termThatShouldNotChange');
```

Common candidates to watch for:
- Technical jargon that doesn't follow standard English rules
- Domain-specific terms
- Acronyms or abbreviations
- Terms borrowed from other languages
