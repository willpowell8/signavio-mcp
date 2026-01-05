# Signavio MCP Server

A comprehensive Model Context Protocol (MCP) server that provides seamless integration between SAP Signavio Process Manager and AI-powered development tools. This server exposes the complete Signavio API as a set of tools, enabling AI assistants like Claude, Cursor, and other MCP-compatible clients to interact with your Signavio workspace programmatically.

## Overview

The Signavio MCP Server bridges the gap between business process management and AI-assisted development workflows. Whether you're automating process documentation, managing business process models, maintaining process dictionaries, or integrating Signavio data into your development pipeline, this server provides a unified interface for all Signavio API operations.

### Key Features

- **Complete API Coverage**: Full access to Signavio Process Manager API endpoints including models, folders, dictionary entries, and search functionality
- **AI Assistant Integration**: Seamlessly works with Claude, Cursor, and other MCP-compatible AI development tools
- **Business Process Automation**: Automate process model creation, updates, exports, and management tasks
- **Dictionary Management**: Create, update, and search business process dictionaries and glossary entries
- **Multi-format Export**: Export process models in JSON, BPMN 2.0 XML, PNG, and SVG formats
- **Search Capabilities**: Full-text search across models, revisions, files, and dictionary entries
- **Zero Configuration**: Run directly with npx or install locally for development

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Signavio account with API access
- Your Signavio tenant ID (Workspace ID)

## Installation

### Option 1: Using npx (Recommended)

No installation required! You can run the MCP server directly using `npx`:

```bash
npx signavio-mcp
```

### Option 2: Local Installation

1. **Install the package:**
   ```bash
   npm install signavio-mcp
   ```

2. **Or clone the repository:**
   ```bash
   git clone https://github.com/willpowell8/signavio-mcp.git
   cd signavio-mcp
   npm install
   ```

## Configuration

**Configure environment variables:**
   
   Create a `.env` file in the project root with your credentials:
   ```env
   SIGNAVIO_BASE_URL=https://api.eu.signavio.cloud.sap
   SIGNAVIO_EMAIL=your-email@example.com
   SIGNAVIO_PASSWORD=your-password
   SIGNAVIO_TENANT=your-tenant-id
   ```
   
   **Note:** The base URL is region-specific. Use the appropriate URL for your region:
   - EU: `https://api.eu.signavio.cloud.sap`
   - USA: `https://api.us.signavio.cloud.sap`
   - Australia: `https://api.au.signavio.cloud.sap`
   - Canada: `https://api.ca.signavio.cloud.sap`
   - Japan: `https://api.jp.signavio.cloud.sap`
   - Singapore: `https://api.sgp.signavio.cloud.sap`
   - South Korea: `https://api.kr.signavio.cloud.sap`

## Finding Your Tenant ID

To find your tenant ID (Workspace ID):
1. Log in to SAP Signavio Process Manager
2. In the Explorer, go to **Help** menu
3. Select **Workspace information**
4. Copy the **Workspace ID** - this is your tenant ID

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file should be included in `.gitignore`
- Consider using environment variables or a secrets manager for production use

## MCP Server Configuration

The MCP server uses environment variables from your `.env` file. You can also:

- Set environment variables in your system
- Pass environment variables when starting the server

### MCP Client Configuration

For Cursor or other MCP-compatible clients, add this to your MCP configuration:

**Using npx (Recommended):**
```json
{
  "mcpServers": {
    "signavio-api": {
      "command": "npx",
      "args": ["-y", "signavio-mcp"],
      "env": {
        "SIGNAVIO_BASE_URL": "https://api.eu.signavio.cloud.sap",
        "SIGNAVIO_EMAIL": "your-email@example.com",
        "SIGNAVIO_PASSWORD": "your-password",
        "SIGNAVIO_TENANT": "your-tenant-id"
      }
    }
  }
}
```

**Using locally installed package:**
```json
{
  "mcpServers": {
    "signavio-api": {
      "command": "node",
      "args": ["/path/to/node_modules/signavio-mcp/mcp-server.js"],
      "env": {
        "SIGNAVIO_BASE_URL": "https://api.eu.signavio.cloud.sap",
        "SIGNAVIO_EMAIL": "your-email@example.com",
        "SIGNAVIO_PASSWORD": "your-password",
        "SIGNAVIO_TENANT": "your-tenant-id"
      }
    }
  }
}
```

### Available MCP Tools

The MCP server provides the following tools:

#### Authentication
- `signavio_authenticate` - Authenticate with Signavio API

#### Directory/Folder Operations
- `signavio_get_root_folders` - Get workspace root folders
- `signavio_get_folder_contents` - Get folder contents by ID
- `signavio_create_folder` - Create a new folder
- `signavio_update_folder` - Rename or update folder description
- `signavio_move_folder` - Move folder to new parent or trash
- `signavio_delete_folder` - Permanently delete a folder

#### Dictionary/Glossary Operations
- `signavio_search_dictionary` - Search dictionary entries
- `signavio_get_dictionary_entry` - Get specific dictionary entry
- `signavio_create_dictionary_entry` - Create new dictionary entry
- `signavio_update_dictionary_entry` - Update dictionary entry
- `signavio_delete_dictionary_entry` - Delete dictionary entry
- `signavio_get_dictionary_categories` - Get all dictionary categories
- `signavio_get_dictionary_category` - Get specific category
- `signavio_create_dictionary_category` - Create new category

#### Model Operations
- `signavio_get_model` - Get model metadata
- `signavio_get_model_revisions` - Get all model revisions
- `signavio_export_model` - Export model (json, bpmn2_0_xml, png, svg)
- `signavio_create_model` - Create new model/diagram
- `signavio_update_model` - Update model (creates new revision)
- `signavio_move_model` - Move model to different folder
- `signavio_publish_model` - Publish model(s) to Collaboration Hub

#### Search Operations
- `signavio_search` - Full-text search across all content types

### Running the MCP Server

**Using npx (Recommended):**
```bash
npx signavio-mcp
```

**Using locally installed package:**
```bash
npm start
```

**Or directly:**
```bash
node mcp-server.js
```

### Testing the MCP Server

A comprehensive test script is available to verify all MCP server functionality:

```bash
npm test
```

Or directly:
```bash
node test-mcp-server.js
```

The test script will:
- ✅ Test authentication
- ✅ Test directory/folder operations (get root folders, get folder contents)
- ✅ Test dictionary operations (categories, search, get entries)
- ✅ Test model operations (search, get model, get revisions, export)
- ✅ Test search functionality
- ✅ Provide a detailed summary of all tests

**Note:** The test script uses your `.env` configuration and will skip tests that require existing data (like getting a specific model) if no data is found. This is expected behavior for a clean workspace.

## API Documentation

For more information about the Signavio API, refer to the [SAP Signavio Process Manager API Guide](https://help.sap.com/doc/f453aaa41306444880035213c92c0144/SHIP/en-US/sap-signavio-process-modeler-api-guide-en.pdf).

