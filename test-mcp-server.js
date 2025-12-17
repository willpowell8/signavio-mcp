#!/usr/bin/env node

import { SignavioClient } from './signavio-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script for Signavio MCP Server
 * Tests all available API operations
 */
class MCPTester {
  constructor() {
    this.client = new SignavioClient();
    this.results = [];
    this.testData = {
      folderId: null,
      dictionaryEntryId: null,
      dictionaryCategoryId: null,
      modelId: null,
    };
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪',
    };
    console.log(`${icons[type] || ''} ${message}`);
  }

  async runTest(name, testFn) {
    this.log(`Testing: ${name}`, 'test');
    try {
      const result = await testFn();
      this.results.push({ name, success: true, result });
      this.log(`  ✓ ${name} passed`, 'success');
      return result;
    } catch (error) {
      this.results.push({ name, success: false, error: error.message });
      this.log(`  ✗ ${name} failed: ${error.message}`, 'error');
      return null;
    }
  }

  // Authentication Tests
  async testAuthentication() {
    return await this.runTest('Authentication', async () => {
      const auth = await this.client.authenticate();
      if (!auth.token) {
        throw new Error('No token received');
      }
      return auth;
    });
  }

  // Directory/Folder Tests
  async testGetRootFolders() {
    return await this.runTest('Get Root Folders', async () => {
      const folders = await this.client.request('/directory');
      if (!Array.isArray(folders) || folders.length === 0) {
        throw new Error('No folders returned');
      }
      // Store first folder ID for later tests
      const folder = folders.find(f => f.rel === 'dir');
      if (folder && folder.href) {
        const match = folder.href.match(/\/directory\/([^\/]+)/);
        if (match) {
          this.testData.folderId = match[1];
        }
      }
      return folders;
    });
  }

  async testGetFolderContents() {
    if (!this.testData.folderId) {
      this.log('  ⚠ Skipping - no folder ID available', 'warning');
      return null;
    }
    return await this.runTest('Get Folder Contents', async () => {
      const contents = await this.client.request(`/directory/${this.testData.folderId}`);
      if (!Array.isArray(contents)) {
        throw new Error('Invalid response format');
      }
      return contents;
    });
  }

  // Dictionary Tests
  async testGetDictionaryCategories() {
    return await this.runTest('Get Dictionary Categories', async () => {
      const categories = await this.client.request('/glossarycategory', 'GET', null, {
        allCategories: true,
      });
      if (!Array.isArray(categories) || categories.length === 0) {
        throw new Error('No categories returned');
      }
      // Store first category ID for later tests
      const category = categories.find(c => c.rel === 'cat');
      if (category && category.href) {
        const match = category.href.match(/\/glossarycategory\/([^\/]+)/);
        if (match) {
          this.testData.dictionaryCategoryId = match[1];
        }
      }
      return categories;
    });
  }

  async testSearchDictionary() {
    return await this.runTest('Search Dictionary', async () => {
      const results = await this.client.request('/glossary', 'GET', null, {
        q: 'test',
        limit: 10,
        offset: 0,
      });
      if (!Array.isArray(results)) {
        throw new Error('Invalid response format');
      }
      // Store first entry ID if found
      const entry = results.find(r => r.rel === 'gitem');
      if (entry && entry.href) {
        const match = entry.href.match(/\/glossary\/([^\/]+)/);
        if (match) {
          this.testData.dictionaryEntryId = match[1];
        }
      }
      return results;
    });
  }

  async testGetDictionaryEntry() {
    if (!this.testData.dictionaryEntryId) {
      this.log('  ⚠ Skipping - no dictionary entry ID available', 'warning');
      return null;
    }
    return await this.runTest('Get Dictionary Entry', async () => {
      const entry = await this.client.request(`/glossary/${this.testData.dictionaryEntryId}`);
      if (!entry || !entry.id) {
        throw new Error('Invalid entry data');
      }
      return entry;
    });
  }

  async testGetDictionaryCategory() {
    if (!this.testData.dictionaryCategoryId) {
      this.log('  ⚠ Skipping - no dictionary category ID available', 'warning');
      return null;
    }
    return await this.runTest('Get Dictionary Category', async () => {
      const category = await this.client.request(`/glossarycategory/${this.testData.dictionaryCategoryId}`);
      if (!Array.isArray(category)) {
        throw new Error('Invalid response format');
      }
      return category;
    });
  }

  // Model Tests
  async testSearchModels() {
    return await this.runTest('Search for Models', async () => {
      const results = await this.client.request('/search', 'GET', null, {
        q: 'process',
        types: ['MODEL'],
        limit: 5,
        offset: 0,
      });
      if (!Array.isArray(results)) {
        throw new Error('Invalid response format');
      }
      // Store first model ID if found
      const model = results.find(r => r.rel === 'mod');
      if (model && model.href) {
        const match = model.href.match(/\/model\/([^\/]+)/);
        if (match) {
          this.testData.modelId = match[1];
        }
      }
      return results;
    });
  }

  async testGetModel() {
    if (!this.testData.modelId) {
      this.log('  ⚠ Skipping - no model ID available', 'warning');
      return null;
    }
    return await this.runTest('Get Model', async () => {
      const model = await this.client.request(`/model/${this.testData.modelId}`);
      if (!model || !Array.isArray(model)) {
        throw new Error('Invalid response format');
      }
      return model;
    });
  }

  async testGetModelRevisions() {
    if (!this.testData.modelId) {
      this.log('  ⚠ Skipping - no model ID available', 'warning');
      return null;
    }
    return await this.runTest('Get Model Revisions', async () => {
      const revisions = await this.client.request(`/model/${this.testData.modelId}/revisions`, 'GET', null, {
        limit: 5,
        offset: 0,
      });
      if (!Array.isArray(revisions)) {
        throw new Error('Invalid response format');
      }
      return revisions;
    });
  }

  async testExportModel() {
    if (!this.testData.modelId) {
      this.log('  ⚠ Skipping - no model ID available', 'warning');
      return null;
    }
    return await this.runTest('Export Model (JSON)', async () => {
      const exported = await this.client.request(`/model/${this.testData.modelId}/json`);
      if (!exported) {
        throw new Error('No export data returned');
      }
      return { exported: true, format: 'json' };
    });
  }

  // Full Search Test
  async testFullTextSearch() {
    return await this.runTest('Full-Text Search', async () => {
      const results = await this.client.request('/search', 'GET', null, {
        q: 'test',
        limit: 10,
        offset: 0,
      });
      if (!Array.isArray(results)) {
        throw new Error('Invalid response format');
      }
      return results;
    });
  }

  // Run all tests
  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Signavio MCP Server Test Suite');
    console.log('='.repeat(60) + '\n');

    // Check environment variables
    if (!process.env.SIGNAVIO_EMAIL || !process.env.SIGNAVIO_PASSWORD || !process.env.SIGNAVIO_TENANT) {
      this.log('Missing required environment variables!', 'error');
      this.log('Please set: SIGNAVIO_EMAIL, SIGNAVIO_PASSWORD, SIGNAVIO_TENANT', 'error');
      process.exit(1);
    }

    this.log(`Base URL: ${process.env.SIGNAVIO_BASE_URL || 'https://api.eu.signavio.cloud.sap'}`, 'info');
    this.log(`Email: ${process.env.SIGNAVIO_EMAIL}`, 'info');
    this.log(`Tenant: ${process.env.SIGNAVIO_TENANT}`, 'info');
    console.log('');

    // Run tests in sequence
    await this.testAuthentication();
    console.log('');

    this.log('Testing Directory Operations...', 'info');
    await this.testGetRootFolders();
    await this.testGetFolderContents();
    console.log('');

    this.log('Testing Dictionary Operations...', 'info');
    await this.testGetDictionaryCategories();
    await this.testSearchDictionary();
    await this.testGetDictionaryEntry();
    await this.testGetDictionaryCategory();
    console.log('');

    this.log('Testing Model Operations...', 'info');
    await this.testSearchModels();
    await this.testGetModel();
    await this.testGetModelRevisions();
    await this.testExportModel();
    console.log('');

    this.log('Testing Search Operations...', 'info');
    await this.testFullTextSearch();
    console.log('');

    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));

    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;

    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name}`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${total} tests`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log('='.repeat(60) + '\n');

    if (failed === 0) {
      this.log('All tests passed! 🎉', 'success');
    } else {
      this.log(`Some tests failed. Please review the errors above.`, 'warning');
      process.exit(1);
    }
  }
}

// Run tests
const tester = new MCPTester();
tester.runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

