# Deprecation Detection System

This MCP server includes a generic deprecation detection and warning system that automatically surfaces when APIs, patterns, or features are deprecated or no longer recommended for modern Ember applications.

## Features

### 1. **Automatic Detection**
The system automatically detects deprecated APIs by:
- Analyzing documentation content for deprecation keywords (deprecated, legacy, not recommended, etc.)
- Parsing deprecation guide sections
- Extracting version information and modern alternatives
- Maintaining a hardcoded list of known deprecated APIs (ArrayProxy, ObjectProxy, PromiseProxyMixin, etc.)

### 2. **Multiple Warning Formats**
Deprecation warnings appear in three formats depending on context:

#### Banner Format (API References)
```markdown
> ⚠️ **DEPRECATION WARNING**
>
> **`ArrayProxy` is deprecated** since Ember v5.0
>
> Native Proxy is now available in all supported environments
>
> **Modern Alternative:** Use tracked properties and native arrays for reactive data
>
> [View Deprecation Guide](https://guides.emberjs.com/deprecations)
```

#### Inline Format (Search Results)
```markdown
⚠️ **Deprecated** since v5.0 - Use tracked properties instead
```

#### Short Format (Result Titles)
```markdown
⚠️ **Deprecated** (since v5.0)
```

### 3. **Tool Integration**
Deprecation warnings are integrated into all MCP tools:

#### `search_ember_docs`
- Deprecated APIs are flagged in search results
- Inline warnings appear below the result title
- Results are still returned but clearly marked

**Example:**
```markdown
## 1. ArrayProxy Documentation ⚠️ **Deprecated** (since v5.0)

**Category:** API Documentation | **Match:** 2/2 terms (relevance: 75)

⚠️ **Deprecated** since v5.0 - Use tracked properties and native arrays instead

ArrayProxy provides a way to wrap a native array in a proxy...
```

#### `get_api_reference`
- Banner-style deprecation warning appears immediately after the API name
- Includes full context: reason, modern alternative, migration guide links

**Example:**
```markdown
# ArrayProxy

> ⚠️ **DEPRECATION WARNING**
>
> **`ArrayProxy` is deprecated**
>
> Use tracked properties and native arrays for reactive data

**Module:** `@ember/array/proxy`
**Type:** class
...
```

#### `get_best_practices`
- If querying best practices for a deprecated API, warning appears at the top
- Anti-patterns section marked with ❌ emoji

**Example:**
```markdown
# Best Practices: ArrayProxy

> ⚠️ **DEPRECATION WARNING**
>
> **`ArrayProxy` is deprecated**
>
> **Modern Alternative:** Use tracked properties and native arrays

## 1. Migration Strategy
...

### ❌ Anti-patterns to Avoid
- Using ArrayProxy in new code
- Extending ArrayProxy for computed property dependencies
```

## Architecture

### Components

1. **`DeprecationManager`** (`lib/deprecation-manager.js`)
   - Core deprecation detection and warning generation
   - Maintains deprecation registry
   - Analyzes documentation content
   - Generates formatted warnings

2. **`DocumentationService` Integration** (`lib/documentation-service.js`)
   - Instantiates DeprecationManager
   - Runs deprecation analysis on parsed documentation
   - Attaches deprecation info to API entries and search results
   - Checks API descriptions during indexing

3. **Formatter Integration** (`index.js`)
   - `formatSearchResults()` - Adds deprecation flags to search result titles and inline warnings
   - `formatApiReference()` - Adds banner-style warnings for deprecated APIs
   - `formatBestPractices()` - Warns when querying deprecated topics

### Detection Strategy

The system uses multiple strategies to detect deprecations:

1. **Keyword Detection**
   ```javascript
   const deprecationKeywords = [
     /\bdeprecated\b/i,
     /\blegacy\b/i,
     /\bno longer recommended\b/i,
     /\bnot preferred\b/i,
     /\bshould not be used\b/i,
     /\bavoid using\b/i
   ];
   ```

2. **Version Extraction**
   ```javascript
   const versionMatch = content.match(/deprecated\s+(?:since|in)\s+(?:ember\s+)?v?(\d+\.\d+(?:\.\d+)?)/i);
   ```

3. **Alternative Extraction**
   ```javascript
   const alternativePatterns = [
     /(?:use|try|prefer|instead,?\s+use)\s+([`'"]?[^`'".,\n]+[`'"]?)/i,
     /(?:replaced\s+by|superseded\s+by)\s+([`'"]?[^`'".,\n]+[`'"]?)/i,
     /(?:modern\s+alternative:?)\s+([`'"]?[^`'".,\n]+[`'"]?)/i
   ];
   ```

4. **Known Deprecations**
   - Hardcoded map of well-known deprecated APIs
   - Includes ArrayProxy, ObjectProxy, PromiseProxyMixin, Evented
   - Serves as fallback when documentation parsing doesn't capture everything

### Data Flow

```
Documentation Loading
    ↓
Parse Documentation → Extract Sections
    ↓
Index API Docs
    ├─→ Check API descriptions for deprecation keywords
    └─→ Register detected deprecations
    ↓
Analyze Deprecation Guides
    ├─→ Extract API names from guides
    ├─→ Analyze content for version/alternatives
    └─→ Register with deprecation guide links
    ↓
Tool Invocation (search/getApiReference/getBestPractices)
    ↓
Add deprecation info to results
    ↓
Format Results
    ├─→ Generate appropriate warning format
    └─→ Include in output
    ↓
Return to Claude/User
```

## Extending the System

### Adding New Known Deprecations

Edit `lib/deprecation-manager.js` and add to the `knownDeprecations` Map:

```javascript
this.knownDeprecations = new Map([
  // ... existing entries
  ['yourapinamehere', {
    name: 'YourAPIName',
    status: 'deprecated',
    reason: 'Why it was deprecated',
    modernAlternative: 'What to use instead',
    category: 'category-name',
    severity: 'warning' // or 'info'
  }]
]);
```

### Improving Detection Patterns

Modify the detection patterns in `DeprecationManager.analyzeContent()`:

```javascript
const deprecationKeywords = [
  // Add new patterns here
  /\byour-new-pattern\b/i,
];
```

### Adding New Warning Formats

Add new format types to `DeprecationManager.generateWarning()`:

```javascript
if (format === 'custom-format') {
  // Your custom formatting logic
  return formattedString;
}
```

## Testing

The deprecation system includes comprehensive tests in `test/deprecation-manager.test.js`:

- Known deprecation detection
- Content analysis and keyword detection
- Modern alternative extraction
- Warning generation in all formats
- Search result checking
- Documentation analysis
- Registration and retrieval

Run tests with:
```bash
npm test
```

## Benefits

1. **Proactive Guidance** - Users are warned immediately when looking up deprecated APIs
2. **Context-Aware** - Warnings include version information, reasons, and modern alternatives
3. **Non-Intrusive** - Deprecated APIs are still returned, just with clear warnings
4. **Extensible** - Easy to add new deprecations or improve detection
5. **Maintainable** - Single source of truth for deprecation logic
6. **Testable** - Comprehensive test coverage ensures reliability

## Future Enhancements

Potential improvements:
- Version-aware recommendations (show different alternatives based on Ember version)
- Severity levels (warning vs. error vs. info)
- Migration code snippets (show before/after examples)
- Deprecation timeline tracking (when introduced, when removed)
- Integration with RFC tracking
- Automatic detection from API docs deprecation metadata
