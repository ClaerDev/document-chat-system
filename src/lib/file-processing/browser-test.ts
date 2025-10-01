#!/usr/bin/env tsx

/**
 * Simple browser compatibility test for file processing
 */

import { browserFileProcessor } from './browser-adapter';

async function testBrowserProcessing() {
  console.log('🧪 Testing Browser File Processing...\n');

  // Test 1: Plain text
  console.log('📄 Test 1: Plain text processing');
  try {
    const textData = 'This is a test document with some content for analysis.';
    const textBuffer = new TextEncoder().encode(textData);
    const result = await browserFileProcessor.processFile(textBuffer, 'text/plain');
    
    if (result.success) {
      console.log('✅ Success:', result.text.substring(0, 50) + '...');
      console.log(`   Extracted ${result.text.length} characters`);
    } else {
      console.log('❌ Failed:', result.error?.message);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }

  // Test 2: JSON
  console.log('\n📄 Test 2: JSON processing');
  try {
    const jsonData = JSON.stringify({
      title: 'Government Contract Opportunity',
      description: 'Software development services for federal agency',
      value: '$2.5M',
      requirements: ['Security clearance', 'CMMI Level 3']
    }, null, 2);
    const jsonBuffer = new TextEncoder().encode(jsonData);
    const result = await browserFileProcessor.processFile(jsonBuffer, 'application/json');
    
    if (result.success) {
      console.log('✅ Success:', result.text.substring(0, 50) + '...');
      console.log(`   Extracted ${result.text.length} characters`);
    } else {
      console.log('❌ Failed:', result.error?.message);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }

  // Test 3: HTML
  console.log('\n📄 Test 3: HTML processing');
  try {
    const htmlData = `
      <html>
        <head><title>Contract Requirements</title></head>
        <body>
          <h1>RFP-2024-001</h1>
          <p>The agency requires <strong>cloud infrastructure</strong> services.</p>
          <ul>
            <li>AWS certification required</li>
            <li>FedRAMP compliance</li>
            <li>24/7 support</li>
          </ul>
        </body>
      </html>
    `;
    const htmlBuffer = new TextEncoder().encode(htmlData);
    const result = await browserFileProcessor.processFile(htmlBuffer, 'text/html');
    
    if (result.success) {
      console.log('✅ Success:', result.text.substring(0, 100) + '...');
      console.log(`   Extracted ${result.text.length} characters`);
    } else {
      console.log('❌ Failed:', result.error?.message);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }

  // Test 4: Unsupported type
  console.log('\n📄 Test 4: Unsupported file type');
  try {
    const binaryData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // Fake JPEG header
    const result = await browserFileProcessor.processFile(binaryData, 'unsupported/type');
    
    if (!result.success) {
      console.log('✅ Correctly handled unsupported type:', result.error?.message);
    } else {
      console.log('⚠️  Unexpected success for unsupported type');
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }

  // Test 5: Supported types
  console.log('\n📊 Supported file types:');
  const supportedTypes = browserFileProcessor.getSupportedTypes();
  console.log(`   Total: ${supportedTypes.length} types`);
  
  const categories = {
    'Text': supportedTypes.filter(t => t.startsWith('text/')),
    'Application': supportedTypes.filter(t => t.startsWith('application/')),
    'Image': supportedTypes.filter(t => t.startsWith('image/'))
  };
  
  for (const [category, types] of Object.entries(categories)) {
    if (types.length > 0) {
      console.log(`   ${category}: ${types.length} types`);
    }
  }

  console.log('\n🎉 Browser file processing test complete!');
}

// Only run if executed directly (not imported)
if (require.main === module) {
  testBrowserProcessing().catch(console.error);
}

export { testBrowserProcessing };