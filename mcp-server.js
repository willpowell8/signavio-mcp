#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { SignavioClient } from './signavio-client.js';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

const client = new SignavioClient();

/**
 * MCP Server for Signavio API
 */
class SignavioMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'signavio-api',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Validation helper methods
   */
  validateDirectoryPath(path, paramName = 'parent') {
    if (!path) return;
    if (!path.startsWith('/directory/')) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must be in format /directory/<id>, got: ${path}`
      );
    }
    const id = path.replace('/directory/', '');
    if (!id || id.trim().length === 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must include a valid directory ID after /directory/`
      );
    }
  }

  validateGlossaryCategoryPath(path, paramName = 'parentCategory') {
    if (!path) return;
    if (!path.startsWith('/glossarycategory/')) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must be in format /glossarycategory/<id>, got: ${path}`
      );
    }
    const id = path.replace('/glossarycategory/', '');
    if (!id || id.trim().length === 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must include a valid category ID after /glossarycategory/`
      );
    }
  }

  validateModelPath(path, paramName = 'modelId') {
    if (!path) return;
    if (path.startsWith('/model/')) {
      const id = path.replace('/model/', '');
      if (!id || id.trim().length === 0) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `${paramName} must include a valid model ID after /model/`
        );
      }
    }
    // If it's just an ID (not a full path), that's also acceptable
  }

  validateModelPaths(paths, paramName = 'modelIds') {
    if (!Array.isArray(paths)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must be an array`
      );
    }
    paths.forEach((path, index) => {
      if (!path.startsWith('/model/')) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `${paramName}[${index}] must be in format /model/<id>, got: ${path}`
        );
      }
      const id = path.replace('/model/', '');
      if (!id || id.trim().length === 0) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `${paramName}[${index}] must include a valid model ID after /model/`
        );
      }
    });
  }

  validateLimit(limit, maxLimit = 1000, paramName = 'limit') {
    if (limit === undefined || limit === null) return;
    if (typeof limit !== 'number' || limit < 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must be a non-negative number, got: ${limit}`
      );
    }
    if (limit > maxLimit) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must not exceed ${maxLimit}, got: ${limit}`
      );
    }
  }

  validateOffset(offset, paramName = 'offset') {
    if (offset === undefined || offset === null) return;
    if (typeof offset !== 'number' || offset < 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must be a non-negative number, got: ${offset}`
      );
    }
  }

  validateHexColor(color, paramName = 'color') {
    if (!color) return;
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must be a valid HEX color code (e.g., #800000), got: ${color}`
      );
    }
  }

  validateFormat(format, allowedFormats, paramName = 'format') {
    if (!format) return;
    if (!allowedFormats.includes(format)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} must be one of: ${allowedFormats.join(', ')}, got: ${format}`
      );
    }
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Authentication
        {
          name: 'signavio_authenticate',
          description: 'Authenticate with Signavio API and get a token',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },

        // Directory/Folder Operations
        {
          name: 'signavio_get_root_folders',
          description: 'Get workspace root folders (Shared Documents, My Documents, Trash, Dictionary)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'signavio_get_folder_contents',
          description: 'Get contents of a specific folder by ID',
          inputSchema: {
            type: 'object',
            properties: {
              folderId: {
                type: 'string',
                description: 'The folder ID (e.g., from directory endpoint)',
              },
            },
            required: ['folderId'],
          },
        },
        {
          name: 'signavio_create_folder',
          description: 'Create a new folder',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the new folder',
              },
              parentId: {
                type: 'string',
                description: 'Parent folder ID in format /directory/{id}',
              },
            },
            required: ['name', 'parentId'],
          },
        },
        {
          name: 'signavio_update_folder',
          description: 'Rename a folder or update its description',
          inputSchema: {
            type: 'object',
            properties: {
              folderId: {
                type: 'string',
                description: 'The folder ID',
              },
              name: {
                type: 'string',
                description: 'New folder name',
              },
              description: {
                type: 'string',
                description: 'New folder description',
              },
            },
            required: ['folderId'],
          },
        },
        {
          name: 'signavio_move_folder',
          description: 'Move a folder to a new parent or to trash',
          inputSchema: {
            type: 'object',
            properties: {
              folderId: {
                type: 'string',
                description: 'The folder ID to move',
              },
              parentId: {
                type: 'string',
                description: 'New parent folder ID in format /directory/{id}',
              },
            },
            required: ['folderId', 'parentId'],
          },
        },
        {
          name: 'signavio_delete_folder',
          description: 'Permanently delete a folder and all its contents',
          inputSchema: {
            type: 'object',
            properties: {
              folderId: {
                type: 'string',
                description: 'The folder ID to delete',
              },
            },
            required: ['folderId'],
          },
        },

        // Dictionary/Glossary Operations
        {
          name: 'signavio_search_dictionary',
          description: 'Search for dictionary entries',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query term',
              },
              category: {
                type: 'string',
                description: 'Filter by category ID or type (ORG_UNIT, DOCUMENT, ACTIVITY, STATE, IT_SYSTEM)',
              },
              letter: {
                type: 'string',
                description: 'Filter by initial letter',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (max 1000)',
                default: 100,
              },
              offset: {
                type: 'number',
                description: 'Offset for pagination',
                default: 0,
              },
            },
          },
        },
        {
          name: 'signavio_get_dictionary_entry',
          description: 'Get a specific dictionary entry by ID',
          inputSchema: {
            type: 'object',
            properties: {
              entryId: {
                type: 'string',
                description: 'The dictionary entry ID',
              },
            },
            required: ['entryId'],
          },
        },
        {
          name: 'signavio_create_dictionary_entry',
          description: 'Create a new dictionary entry',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Entry title',
              },
              category: {
                type: 'string',
                description: 'Category ID',
              },
              description: {
                type: 'string',
                description: 'Entry description',
              },
              attachments: {
                type: 'array',
                description: 'Array of attachment objects with url and label',
                items: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    label: { type: 'string' },
                  },
                },
              },
            },
            required: ['title', 'category'],
          },
        },
        {
          name: 'signavio_update_dictionary_entry',
          description: 'Update an existing dictionary entry',
          inputSchema: {
            type: 'object',
            properties: {
              entryId: {
                type: 'string',
                description: 'The dictionary entry ID',
              },
              title: {
                type: 'string',
                description: 'Entry title',
              },
              category: {
                type: 'string',
                description: 'Category ID',
              },
              description: {
                type: 'string',
                description: 'Entry description',
              },
            },
            required: ['entryId'],
          },
        },
        {
          name: 'signavio_delete_dictionary_entry',
          description: 'Delete a dictionary entry',
          inputSchema: {
            type: 'object',
            properties: {
              entryId: {
                type: 'string',
                description: 'The dictionary entry ID',
              },
            },
            required: ['entryId'],
          },
        },
        {
          name: 'signavio_get_dictionary_categories',
          description: 'Get all dictionary categories',
          inputSchema: {
            type: 'object',
            properties: {
              allCategories: {
                type: 'boolean',
                description: 'Include all sub-categories',
                default: false,
              },
              showHidden: {
                type: 'boolean',
                description: 'Include hidden categories',
                default: false,
              },
            },
          },
        },
        {
          name: 'signavio_get_dictionary_category',
          description: 'Get a specific dictionary category by ID',
          inputSchema: {
            type: 'object',
            properties: {
              categoryId: {
                type: 'string',
                description: 'The category ID',
              },
            },
            required: ['categoryId'],
          },
        },
        {
          name: 'signavio_create_dictionary_category',
          description: 'Create a new dictionary category',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Category name',
              },
              color: {
                type: 'string',
                description: 'HEX color code (e.g., #800000)',
              },
              order: {
                type: 'number',
                description: 'Display order',
              },
              parentCategory: {
                type: 'string',
                description: 'Parent category ID in format /glossarycategory/{id}',
              },
            },
            required: ['name', 'color', 'order'],
          },
        },

        // Model Operations
        {
          name: 'signavio_get_model',
          description: 'Get model metadata by ID',
          inputSchema: {
            type: 'object',
            properties: {
              modelId: {
                type: 'string',
                description: 'The model ID',
              },
            },
            required: ['modelId'],
          },
        },
        {
          name: 'signavio_get_model_revisions',
          description: 'Get all revisions of a model',
          inputSchema: {
            type: 'object',
            properties: {
              modelId: {
                type: 'string',
                description: 'The model ID',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of revisions',
              },
              offset: {
                type: 'number',
                description: 'Offset for pagination',
              },
            },
            required: ['modelId'],
          },
        },
        {
          name: 'signavio_export_model',
          description: 'Export a model in various formats (json, bpmn2_0_xml, png, svg)',
          inputSchema: {
            type: 'object',
            properties: {
              modelId: {
                type: 'string',
                description: 'The model ID',
              },
              format: {
                type: 'string',
                enum: ['json', 'bpmn2_0_xml', 'png', 'svg'],
                description: 'Export format',
                default: 'json',
              },
              saveAsFile: {
                type: 'boolean',
                description: 'If true, save the exported model to a file and return the filename. If false, return the file contents.',
                default: false,
              },
            },
            required: ['modelId'],
          },
        },
        {
          name: 'signavio_create_model',
          description: 'Create a new model/diagram',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Model name',
              },
              parentId: {
                type: 'string',
                description: 'Parent folder ID in format /directory/{id}',
              },
              namespace: {
                type: 'string',
                description: 'Stencil set namespace (e.g., http://b3mn.org/stencilset/bpmn2.0#)',
                default: 'http://b3mn.org/stencilset/bpmn2.0#',
              },
              json_xml: {
                type: 'string',
                description: 'JSON representation of the diagram (required if json_xml_file is not provided)',
              },
              json_xml_file: {
                type: 'string',
                description: 'Local file path to read JSON representation from (alternative to json_xml)',
              },
            },
            required: ['name', 'parentId'],
          },
        },
        {
          name: 'signavio_update_model',
          description: 'Update a model by creating a new revision',
          inputSchema: {
            type: 'object',
            properties: {
              modelId: {
                type: 'string',
                description: 'The model ID',
              },
              name: {
                type: 'string',
                description: 'The diagram name which must match the original name',
              },
              parent: {
                type: 'string',
                description: 'The parent folder, in the format /directory/<parent_folder_id>',
              },
              comment: {
                type: 'string',
                description: 'Revision comment',
              },
              json_xml: {
                type: 'string',
                description: 'JSON representation of the new revision (required if json_xml_file is not provided)',
              },
              json_xml_file: {
                type: 'string',
                description: 'Local file path to read JSON representation from (alternative to json_xml)',
              },
            },
            required: ['modelId'],
          },
        },
        {
          name: 'signavio_move_model',
          description: 'Move a model to a different folder',
          inputSchema: {
            type: 'object',
            properties: {
              modelId: {
                type: 'string',
                description: 'The model ID',
              },
              parentId: {
                type: 'string',
                description: 'New parent folder ID in format /directory/{id}',
              },
            },
            required: ['modelId', 'parentId'],
          },
        },
        {
          name: 'signavio_publish_model',
          description: 'Publish one or more models to Process Collaboration Hub',
          inputSchema: {
            type: 'object',
            properties: {
              modelIds: {
                type: 'array',
                description: 'Array of model IDs in format /model/{id}',
                items: {
                  type: 'string',
                },
              },
            },
            required: ['modelIds'],
          },
        },

        // Search Operations
        {
          name: 'signavio_search',
          description: 'Perform a full-text search across all content types',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query term',
              },
              types: {
                type: 'array',
                description: 'Content types to search (MODEL, MODEL_REVISION, SHAPE, FILE, FILE_REVISION, DIR, COMMENT)',
                items: {
                  type: 'string',
                  enum: ['MODEL', 'MODEL_REVISION', 'SHAPE', 'FILE', 'FILE_REVISION', 'DIR', 'COMMENT'],
                },
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (max 250)',
                default: 20,
              },
              offset: {
                type: 'number',
                description: 'Offset for pagination',
                default: 0,
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'signavio_authenticate':
            result = await client.authenticate();
            break;

          case 'signavio_get_root_folders':
            result = await client.request('/directory');
            break;

          case 'signavio_get_folder_contents':
            result = await client.request(`/directory/${args.folderId}`);
            break;

          case 'signavio_create_folder':
            this.validateDirectoryPath(args.parentId, 'parentId');
            result = await client.request('/directory', 'POST', {
              name: args.name,
              parent: args.parentId,
            });
            break;

          case 'signavio_update_folder':
            result = await client.request(`/directory/${args.folderId}/info`, 'PUT', {
              name: args.name,
              description: args.description,
            });
            break;

          case 'signavio_move_folder':
            this.validateDirectoryPath(args.parentId, 'parentId');
            result = await client.request(`/directory/${args.folderId}`, 'PUT', {
              parent: args.parentId,
            });
            break;

          case 'signavio_delete_folder':
            result = await client.request(`/directory/${args.folderId}`, 'DELETE');
            break;

          case 'signavio_search_dictionary':
            this.validateLimit(args.limit, 1000, 'limit');
            this.validateOffset(args.offset, 'offset');
            result = await client.request('/glossary', 'GET', null, {
              q: args.query,
              category: args.category,
              letter: args.letter,
              limit: args.limit || 100,
              offset: args.offset || 0,
            });
            break;

          case 'signavio_get_dictionary_entry':
            result = await client.request(`/glossary/${args.entryId}`);
            break;

          case 'signavio_create_dictionary_entry':
            result = await client.request('/glossary', 'POST', {
              title: args.title,
              category: args.category,
              description: args.description,
              attachments: args.attachments ? JSON.stringify(args.attachments) : undefined,
            });
            break;

          case 'signavio_update_dictionary_entry':
            result = await client.request(`/glossary/${args.entryId}/info`, 'PUT', {
              title: args.title,
              category: args.category,
              description: args.description,
            });
            break;

          case 'signavio_delete_dictionary_entry':
            result = await client.request(`/glossary/${args.entryId}`, 'DELETE');
            break;

          case 'signavio_get_dictionary_categories':
            result = await client.request('/glossarycategory', 'GET', null, {
              allCategories: args.allCategories,
              showHidden: args.showHidden,
            });
            break;

          case 'signavio_get_dictionary_category':
            result = await client.request(`/glossarycategory/${args.categoryId}`);
            break;

          case 'signavio_create_dictionary_category':
            this.validateHexColor(args.color, 'color');
            this.validateGlossaryCategoryPath(args.parentCategory, 'parentCategory');
            result = await client.request('/glossarycategory', 'POST', {
              name: args.name,
              color: args.color,
              order: args.order,
              parentCategory: args.parentCategory,
            });
            break;

          case 'signavio_get_model':
            result = await client.request(`/model/${args.modelId}`);
            break;

          case 'signavio_get_model_revisions':
            this.validateLimit(args.limit, 1000, 'limit');
            this.validateOffset(args.offset, 'offset');
            result = await client.request(`/model/${args.modelId}/revisions`, 'GET', null, {
              limit: args.limit,
              offset: args.offset,
            });
            break;

          case 'signavio_export_model':
            this.validateFormat(args.format, ['json', 'bpmn2_0_xml', 'png', 'svg'], 'format');
            const exportFormat = args.format || 'json';
            
            // Set appropriate Accept header and responseType based on format
            const acceptHeaders = {
              'json': 'application/json',
              'bpmn2_0_xml': 'application/xml',
              'png': 'image/png',
              'svg': 'image/svg+xml',
            };
            const responseType = exportFormat === 'png' ? 'arraybuffer' : null;
            const acceptHeader = acceptHeaders[exportFormat] || 'application/json';
            
            const exportData = await client.request(
              `/model/${args.modelId}/${exportFormat}`, 
              'GET', 
              null, 
              null, 
              responseType,
              acceptHeader
            );
            
            if (args.saveAsFile) {
              // Determine file extension based on format
              const extensionMap = {
                'json': '.json',
                'bpmn2_0_xml': '.bpmn',
                'png': '.png',
                'svg': '.svg',
              };
              const extension = extensionMap[exportFormat] || '.json';
              
              // Sanitize modelId for filename (remove invalid characters)
              const sanitizedModelId = args.modelId.replace(/[^a-zA-Z0-9-_]/g, '_');
              const filename = `${sanitizedModelId}${extension}`;
              
              // Determine if data is binary or text
              let fileContent;
              if (exportFormat === 'png') {
                // PNG is binary - exportData is already a Buffer/ArrayBuffer
                if (Buffer.isBuffer(exportData)) {
                  fileContent = exportData;
                } else if (exportData instanceof ArrayBuffer) {
                  fileContent = Buffer.from(exportData);
                } else {
                  fileContent = Buffer.from(exportData);
                }
              } else {
                // Text formats (json, bpmn2_0_xml, svg)
                if (typeof exportData === 'string') {
                  fileContent = exportData;
                } else {
                  fileContent = JSON.stringify(exportData, null, 2);
                }
              }
              
              // Write file to current working directory
              await writeFile(filename, fileContent);
              result = { filename, saved: true };
            } else {
              // For PNG (binary), convert to base64 for JSON response
              if (exportFormat === 'png') {
                let buffer;
                if (Buffer.isBuffer(exportData)) {
                  buffer = exportData;
                } else if (exportData instanceof ArrayBuffer) {
                  buffer = Buffer.from(exportData);
                } else {
                  buffer = Buffer.from(exportData);
                }
                result = {
                  format: 'png',
                  data: buffer.toString('base64'),
                  encoding: 'base64',
                };
              } else {
                result = exportData;
              }
            }
            break;

          case 'signavio_create_model':
            this.validateDirectoryPath(args.parentId, 'parentId');
            
            // Read json_xml from file if json_xml_file is provided, otherwise use json_xml directly
            let createJsonXml = args.json_xml;
            if (args.json_xml_file) {
              if (args.json_xml) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  'Cannot provide both json_xml and json_xml_file. Use one or the other.'
                );
              }
              try {
                createJsonXml = await readFile(args.json_xml_file, 'utf-8');
              } catch (error) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Failed to read file ${args.json_xml_file}: ${error.message}`
                );
              }
            }
            
            result = await client.request('/model', 'POST', {
              name: args.name,
              parent: args.parentId,
              namespace: args.namespace || 'http://b3mn.org/stencilset/bpmn2.0#',
              json_xml: createJsonXml,
            });
            break;

          case 'signavio_update_model':
            this.validateDirectoryPath(args.parent, 'parent');
            
            // Read json_xml from file if json_xml_file is provided, otherwise use json_xml directly
            let updateJsonXml = args.json_xml;
            if (args.json_xml_file) {
              if (args.json_xml) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  'Cannot provide both json_xml and json_xml_file. Use one or the other.'
                );
              }
              try {
                updateJsonXml = await readFile(args.json_xml_file, 'utf-8');
              } catch (error) {
                throw new McpError(
                  ErrorCode.InvalidParams,
                  `Failed to read file ${args.json_xml_file}: ${error.message}`
                );
              }
            }
            
            result = await client.request(`/model/${args.modelId}`, 'PUT', {
              name: args.name,
              parent: args.parent,
              comment: args.comment,
              json_xml: updateJsonXml,
            });
            break;

          case 'signavio_move_model':
            this.validateDirectoryPath(args.parentId, 'parentId');
            result = await client.request(`/model/${args.modelId}`, 'PUT', {
              parent: args.parentId,
            });
            break;

          case 'signavio_publish_model':
            // Publish endpoint requires multiple 'models' parameters
            // qs.stringify will handle array properly
            this.validateModelPaths(args.modelIds, 'modelIds');
            const publishData = {
              mode: 'publish',
              models: args.modelIds,
            };
            result = await client.request('/publish', 'POST', publishData);
            break;

          case 'signavio_search':
            this.validateLimit(args.limit, 250, 'limit');
            this.validateOffset(args.offset, 'offset');
            const searchParams = {
              q: args.query,
              limit: args.limit || 20,
              offset: args.offset || 0,
            };
            // Add types as array - axios will handle multiple query params
            if (args.types && Array.isArray(args.types)) {
              searchParams.types = args.types;
            }
            result = await client.request('/search', 'GET', null, searchParams);
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error.message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Signavio MCP server running on stdio');
  }
}

const server = new SignavioMCPServer();
server.run().catch(console.error);

