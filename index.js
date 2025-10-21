#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DocumentationService } from "./lib/documentation-service.js";
import {
  formatSearchResults,
  formatApiReference,
  formatBestPractices,
  formatVersionInfo,
} from "./lib/formatters.js";

class EmberDocsServer {
  constructor() {
    this.server = new Server(
      {
        name: "ember-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.docService = new DocumentationService();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_ember_docs",
          description:
            "Search through Ember.js documentation including API docs, guides, and community content. Returns relevant documentation with links to official sources. Use this for general queries about Ember concepts, features, or usage.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Search query (e.g., 'component lifecycle', 'tracked properties', 'routing')",
              },
              category: {
                type: "string",
                enum: ["all", "api", "guides", "community"],
                description:
                  "Filter by documentation category (default: all)",
              },
              limit: {
                type: "number",
                description: "Maximum number of results (default: 5)",
                default: 5,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_api_reference",
          description:
            "Get detailed API reference documentation for a specific Ember class, module, or method. Returns full API documentation including parameters, return values, examples, and links to official API docs.",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description:
                  "Name of the API element (e.g., 'Component', '@glimmer/component', 'Service', 'Router')",
              },
              type: {
                type: "string",
                enum: ["class", "module", "method", "property"],
                description: "Type of API element (optional)",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "get_best_practices",
          description:
            "Get Ember best practices and recommendations for specific topics. This includes modern patterns, anti-patterns to avoid, performance tips, and community-approved approaches. Always use this when providing implementation advice.",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description:
                  "Topic to get best practices for (e.g., 'component patterns', 'state management', 'testing', 'performance')",
              },
            },
            required: ["topic"],
          },
        },
        {
          name: "get_ember_version_info",
          description:
            "Get information about Ember versions, including current stable version, what's new in recent releases, and migration guides. Useful for understanding version-specific features and deprecations.",
          inputSchema: {
            type: "object",
            properties: {
              version: {
                type: "string",
                description:
                  "Specific version to get info about (optional, returns latest if not specified)",
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        // Ensure documentation is loaded
        await this.docService.ensureLoaded();

        switch (name) {
          case "search_ember_docs":
            return await this.handleSearchDocs(args);

          case "get_api_reference":
            return await this.handleGetApiReference(args);

          case "get_best_practices":
            return await this.handleGetBestPractices(args);

          case "get_ember_version_info":
            return await this.handleGetVersionInfo(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleSearchDocs(args) {
    const { query, category = "all", limit = 5 } = args;
    const results = await this.docService.search(query, category, limit);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No results found for "${query}". Try different keywords or broader search terms.`,
          },
        ],
      };
    }

    const formattedResults = formatSearchResults(results, this.docService.deprecationManager);
    return {
      content: [
        {
          type: "text",
          text: formattedResults,
        },
      ],
    };
  }

  async handleGetApiReference(args) {
    const { name, type } = args;
    const apiDoc = await this.docService.getApiReference(name, type);

    if (!apiDoc) {
      return {
        content: [
          {
            type: "text",
            text: `No API documentation found for "${name}". Try searching with search_ember_docs first.`,
          },
        ],
      };
    }

    const formattedDoc = formatApiReference(apiDoc, this.docService.deprecationManager);
    return {
      content: [
        {
          type: "text",
          text: formattedDoc,
        },
      ],
    };
  }

  async handleGetBestPractices(args) {
    const { topic } = args;
    const practices = await this.docService.getBestPractices(topic);

    if (practices.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No best practices found for "${topic}". Try searching with search_ember_docs for general information.`,
          },
        ],
      };
    }

    const formattedPractices = formatBestPractices(practices, topic, this.docService.deprecationManager);
    return {
      content: [
        {
          type: "text",
          text: formattedPractices,
        },
      ],
    };
  }

  async handleGetVersionInfo(args) {
    const { version } = args;
    const versionInfo = await this.docService.getVersionInfo(version);

    const formattedInfo = formatVersionInfo(versionInfo);
    return {
      content: [
        {
          type: "text",
          text: formattedInfo,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Ember Docs MCP Server running on stdio");
  }
}

const server = new EmberDocsServer();
server.run().catch(console.error);
