# Signavio API Test Script

A Node.js script to test the Signavio API using username and password authentication.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Signavio account with API access
- Your Signavio tenant ID (Workspace ID)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file with your credentials:**
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

## Usage

Run the test script:
```bash
npm start
```

Or directly:
```bash
node test-signavio-api.js
```

## What It Does

The script will:
1. Authenticate with the Signavio API using your credentials
2. Obtain a JWT token and session cookie (JSESSIONID)
3. Test several API endpoints from the official SAP Signavio Process Manager API:
   - Get Root Folders (`/spm/v1/directory`)
   - Search (`/spm/v1/search`)
   - Get Dictionary Categories (`/spm/v1/glossarycategory`)
   - Get Dictionary Entries (`/spm/v1/glossary`)
4. Display results and a summary

All endpoints follow the official API structure: `https://{baseUrl}/spm/v1/{resource}`

## Customization

You can modify the `runTests()` function in `test-signavio-api.js` to test different endpoints or add your own tests.

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already included in `.gitignore`
- Consider using environment variables or a secrets manager for production use

## MCP Server

This project includes an MCP (Model Context Protocol) server that exposes all Signavio API operations as tools for AI assistants.

### Setup MCP Server

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure MCP server:**
   
   The MCP server uses environment variables. You can either:
   
   - Set environment variables in your system
   - Use the `mcp-config.json` file (update with your credentials)
   - Pass environment variables when starting the server

3. **Add to your MCP client configuration:**
   
   For Cursor or other MCP-compatible clients, add this to your MCP configuration:
   
   ```json
   {
     "mcpServers": {
       "signavio-api": {
         "command": "node",
         "args": ["/path/to/signavio/mcp-server.js"],
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

Test the MCP server directly:
```bash
npm run mcp
```

Or:
```bash
node mcp-server.js
```

### Testing the MCP Server

A comprehensive test script is available to verify all MCP server functionality:

```bash
npm run test:mcp
```

Or:
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

