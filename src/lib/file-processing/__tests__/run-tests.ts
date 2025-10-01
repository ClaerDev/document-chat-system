#!/usr/bin/env tsx

/**
 * Quick test runner for file processing verification
 * Run with: npx tsx src/lib/file-processing/__tests__/run-tests.ts
 */

import { FileProcessingAdapter, fileProcessor } from '../index';
import { ProcessingMethod } from '../types';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}`),
};

async function runTests() {
  log.section('File Processing Verification Tests');
  
  const adapter = new FileProcessingAdapter();
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Check supported types
  totalTests++;
  try {
    const supportedTypes = adapter.getSupportedTypes();
    if (supportedTypes.length > 20) {
      log.success(`Supported types loaded: ${supportedTypes.length} types`);
      passedTests++;
    } else {
      log.error(`Not enough supported types: ${supportedTypes.length}`);
    }
  } catch (error) {
    log.error(`Failed to get supported types: ${error}`);
  }
  
  // Test 2: Process plain text
  totalTests++;
  try {
    const textBuffer = Buffer.from('This is a test document for processing.');
    const result = await adapter.processFile(textBuffer, 'text/plain');
    
    if (result.success && result.text.includes('test document')) {
      log.success('Plain text processing works');
      passedTests++;
    } else {
      log.error('Plain text processing failed');
    }
  } catch (error) {
    log.error(`Text processing error: ${error}`);
  }
  
  // Test 3: Process JSON
  totalTests++;
  try {
    const jsonData = { title: 'Test', content: 'JSON processing test' };
    const jsonBuffer = Buffer.from(JSON.stringify(jsonData, null, 2));
    const result = await adapter.processFile(jsonBuffer, 'application/json');
    
    if (result.success && result.text.includes('JSON processing test')) {
      log.success('JSON processing works');
      passedTests++;
    } else {
      log.error('JSON processing failed');
    }
  } catch (error) {
    log.error(`JSON processing error: ${error}`);
  }
  
  // Test 4: Process HTML
  totalTests++;
  try {
    const htmlBuffer = Buffer.from('<html><body><h1>Test</h1><p>HTML test content</p></body></html>');
    const result = await adapter.processFile(htmlBuffer, 'text/html');
    
    if (result.success && result.text.includes('HTML test content')) {
      log.success('HTML processing works');
      passedTests++;
    } else {
      log.error('HTML processing failed');
    }
  } catch (error) {
    log.error(`HTML processing error: ${error}`);
  }
  
  // Test 5: Handle unsupported type
  totalTests++;
  try {
    const binaryBuffer = Buffer.from([0x00, 0xFF, 0xAA]);
    const result = await adapter.processFile(binaryBuffer, 'unsupported/type');
    
    if (!result.success && result.error) {
      log.success('Unsupported type handling works');
      passedTests++;
    } else {
      log.error('Unsupported type should have failed');
    }
  } catch (error) {
    log.error(`Unsupported type error: ${error}`);
  }
  
  // Test 6: Fallback processing
  totalTests++;
  try {
    const jsonBuffer = Buffer.from('{"test": "fallback"}');
    const result = await adapter.processFileWithFallback(jsonBuffer, 'text/plain');
    
    if (result.success && result.text.includes('fallback')) {
      log.success('Fallback processing works');
      passedTests++;
    } else {
      log.error('Fallback processing failed');
    }
  } catch (error) {
    log.error(`Fallback processing error: ${error}`);
  }
  
  // Test 7: Default export
  totalTests++;
  try {
    const textBuffer = Buffer.from('Default export test');
    const result = await fileProcessor.processFile(textBuffer, 'text/plain');
    
    if (result.success && result.text.includes('Default export test')) {
      log.success('Default export works');
      passedTests++;
    } else {
      log.error('Default export failed');
    }
  } catch (error) {
    log.error(`Default export error: ${error}`);
  }
  
  // Test 8: Processing stats
  totalTests++;
  try {
    const stats = adapter.getProcessingStats();
    
    if (stats.processors.length > 0 && stats.supportedTypes > 0) {
      log.success(`Processing stats: ${stats.processors.length} processors, ${stats.supportedTypes} types`);
      passedTests++;
    } else {
      log.error('Processing stats incomplete');
    }
  } catch (error) {
    log.error(`Processing stats error: ${error}`);
  }
  
  // Summary
  log.section('Test Summary');
  const percentage = Math.round((passedTests / totalTests) * 100);
  
  if (passedTests === totalTests) {
    log.success(`All tests passed! (${passedTests}/${totalTests})`);
  } else {
    log.warn(`${passedTests}/${totalTests} tests passed (${percentage}%)`);
  }
  
  // List all supported file types
  log.section('Supported File Types');
  const supportedTypes = adapter.getSupportedTypes();
  const categories = {
    'Documents': ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
    'Spreadsheets': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
    'Text': ['text/plain', 'text/html', 'text/markdown', 'application/json', 'application/xml'],
    'Images': ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
    'Archives': ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar'],
  };
  
  for (const [category, types] of Object.entries(categories)) {
    const supported = types.filter(type => supportedTypes.includes(type));
    if (supported.length > 0) {
      log.info(`${category}: ${supported.join(', ')}`);
    }
  }
  
  // Performance info
  log.section('Performance Info');
  const processingTimes: number[] = [];
  
  // Quick performance test
  const perfBuffer = Buffer.from('Performance test content'.repeat(100));
  const startTime = Date.now();
  const perfResult = await adapter.processFile(perfBuffer, 'text/plain');
  const endTime = Date.now();
  
  if (perfResult.success) {
    const duration = endTime - startTime;
    log.info(`Text processing speed: ${duration}ms for ${perfBuffer.length} bytes`);
    log.info(`Throughput: ${Math.round(perfBuffer.length / duration * 1000)} bytes/sec`);
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});