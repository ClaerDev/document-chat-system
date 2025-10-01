#!/usr/bin/env tsx

/**
 * Test PDF processing capability
 */

import { browserFileProcessor } from './browser-adapter';

async function testPDFProcessing() {
  console.log('🧪 Testing PDF Processing...\n');

  // Create a simple test "PDF" with PDF header
  // This won't be a real PDF but will test the detection logic
  const pdfHeader = '%PDF-1.4\n%âãÏÓ\n';
  const pdfContent = `1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Hello, World!) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000054 00000 n 
0000000111 00000 n 
0000000199 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
294
%%EOF`;

  const fakePdfBuffer = Buffer.from(pdfHeader + pdfContent);
  
  console.log('📄 Testing PDF detection...');
  const isSupported = browserFileProcessor.isSupported('application/pdf');
  console.log(`PDF support: ${isSupported ? '✅ Supported' : '❌ Not supported'}`);
  
  console.log('\n📄 Testing PDF processing...');
  try {
    const result = await browserFileProcessor.processFile(fakePdfBuffer, 'application/pdf');
    
    if (result.success) {
      console.log('✅ PDF processing succeeded');
      console.log(`📝 Extracted text: "${result.text.substring(0, 200)}${result.text.length > 200 ? '...' : ''}"`);
      console.log(`📊 Character count: ${result.text.length}`);
      console.log(`⏱️  Processing time: ${result.processing.duration}ms`);
      console.log(`🔧 Method: ${result.processing.method}`);
    } else {
      console.log('❌ PDF processing failed');
      console.log(`Error: ${result.error?.message}`);
    }
  } catch (error) {
    console.log('❌ PDF processing threw error:', error);
  }

  console.log('\n🎉 PDF test complete!');
}

// Only run if executed directly
if (require.main === module) {
  testPDFProcessing().catch(console.error);
}

export { testPDFProcessing };