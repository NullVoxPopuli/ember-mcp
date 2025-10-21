# Usage Examples

This document demonstrates how to use the Ember Docs MCP Server with Claude.

## Setup Verification

After adding the MCP server to your Claude Desktop configuration, you should see a small indicator that the server is connected. You can verify by asking Claude:

```
What MCP tools do you have available for Ember?
```

Claude should list the four Ember documentation tools.

## Example Conversations

### Example 1: Learning About a Concept

**User:** "I'm new to Ember. Can you explain what tracked properties are and how to use them?"

**What Claude will do:**
1. Use `search_ember_docs` to find information about tracked properties
2. Use `get_api_reference` to get details about the `@tracked` decorator
3. Use `get_best_practices` to show modern usage patterns
4. Provide a comprehensive answer with code examples and best practices

### Example 2: Building a Feature

**User:** "I need to create a service that manages user authentication state. How should I structure this in Ember?"

**What Claude will do:**
1. Use `search_ember_docs` with query "service authentication"
2. Use `get_api_reference` to show the Service class API
3. Use `get_best_practices` with topic "state management services"
4. Provide implementation guidance with:
   - Service boilerplate
   - Best practices for auth state
   - Modern patterns (tracked properties, getters)
   - Links to official documentation

### Example 3: Debugging and Problem Solving

**User:** "My component isn't re-rendering when data changes. What could be wrong?"

**What Claude will do:**
1. Use `search_ember_docs` to find reactivity documentation
2. Use `get_best_practices` for component reactivity patterns
3. Explain common issues:
   - Missing `@tracked` decorators
   - Plain POJOs vs tracked objects
   - Component lifecycle considerations
4. Provide debugging steps and solutions

### Example 4: API Reference Lookup

**User:** "Show me the API documentation for the Router class"

**What Claude will do:**
1. Use `get_api_reference` with name "Router"
2. Display:
   - Module information
   - Class description
   - Available methods with parameters
   - Return types and descriptions
   - Links to full API documentation

### Example 5: Migration and Version Questions

**User:** "I'm upgrading from Ember 3.28 to Ember 5. What are the major changes?"

**What Claude will do:**
1. Use `get_ember_version_info` for version details
2. Use `search_ember_docs` for migration guides
3. Use `get_best_practices` for modern patterns replacing deprecated ones
4. Provide:
   - Key breaking changes
   - Migration strategy
   - Links to official migration guides
   - Modern alternatives for deprecated features

### Example 6: Testing Help

**User:** "How do I test a component that uses services in Ember?"

**What Claude will do:**
1. Use `search_ember_docs` with query "testing components services"
2. Use `get_best_practices` with topic "testing"
3. Provide:
   - Test structure and setup
   - Service mocking patterns
   - Modern testing practices
   - Example test code

### Example 7: Performance Optimization

**User:** "My Ember app is slow when rendering large lists. How can I optimize it?"

**What Claude will do:**
1. Use `search_ember_docs` for performance documentation
2. Use `get_best_practices` with topic "performance"
3. Provide:
   - Modern virtualization approaches
   - Tracked property optimization
   - Component rendering strategies
   - Profiling tips

## Advanced Usage

### Combining Multiple Tools

For complex questions, Claude will intelligently use multiple tools:

**User:** "Build me a comment system component with best practices"

**Claude's tool usage:**
1. `search_ember_docs` - Find component patterns
2. `get_api_reference` - Get Component class details
3. `get_best_practices` - Learn modern component patterns
4. `get_best_practices` - Learn form handling best practices
5. Synthesize a complete solution with:
   - Component structure
   - State management
   - Event handling
   - Modern syntax
   - Testing recommendations

### Filtering by Category

You can guide Claude to search specific categories:

```
Search only the API documentation for information about Services
```

Claude will use: `search_ember_docs` with `category: "api"`

Categories available:
- `all` - Search everything (default)
- `api` - Only API documentation
- `guides` - Official guides and tutorials
- `community` - Community blog posts and articles

## Tips for Best Results

1. **Be Specific**: Instead of "How do components work?", ask "How do I pass data between parent and child components?"

2. **Mention Best Practices**: Ask "What's the modern way to..." or "What are the best practices for..." to ensure Claude uses the best practices tool

3. **Ask for Examples**: Request code examples to see practical implementations

4. **Version Context**: Mention your Ember version if relevant ("In Ember 5...")

5. **Multiple Questions**: Feel free to ask follow-up questions - Claude maintains context

## What This Server Excels At

- ✅ Modern Ember patterns (Octane and beyond)
- ✅ API reference lookups
- ✅ Best practices and anti-patterns
- ✅ Component patterns
- ✅ Service and state management
- ✅ Testing approaches
- ✅ Performance optimization
- ✅ Migration guidance

## What To Use Official Docs For

While this server is comprehensive, always refer to official docs for:
- Step-by-step tutorials for complete beginners
- Complete API coverage (this indexes major APIs)
- Official release announcements
- RFC discussions and proposals

The MCP server provides **links** to official docs as part of its responses!

## Troubleshooting

**Problem:** Claude says it doesn't have Ember documentation tools

**Solution:**
1. Verify the MCP server is in your `claude_desktop_config.json`
2. Restart Claude Desktop
3. Check the server path is absolute and correct

**Problem:** Results seem outdated

**Solution:** The documentation is fetched on server start. Restart Claude Desktop to fetch the latest docs.

**Problem:** Can't find information on a very specific API

**Solution:** Try searching first with `search_ember_docs` to discover what's available, then ask for specifics.
