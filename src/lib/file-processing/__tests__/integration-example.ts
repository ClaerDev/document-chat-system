#!/usr/bin/env tsx

/**
 * Integration example showing how file processing works with AI services
 * Run with: npx tsx src/lib/file-processing/__tests__/integration-example.ts
 */

import { fileProcessor } from '../index';
import { FileProcessingOptions } from '../types';

// Simulate a government contract document
const createGovernmentDocument = () => {
  return Buffer.from(`
    SOLICITATION NUMBER: FA8773-23-R-0001
    
    TITLE: Advanced Software Development Services
    
    DESCRIPTION:
    The Department of Defense seeks qualified contractors to provide advanced software
    development services for mission-critical systems. This opportunity includes:
    
    1. Full-stack web application development
    2. Cloud infrastructure implementation (AWS, Azure)
    3. Security compliance (FISMA, FedRAMP)
    4. AI/ML integration capabilities
    
    NAICS CODE: 541511 - Custom Computer Programming Services
    
    REQUIREMENTS:
    - Active Secret clearance required
    - CMMI Level 3 certification preferred
    - Past performance on similar federal contracts
    - Technical capabilities in modern frameworks
    
    PERIOD OF PERFORMANCE: 5 years base + 2 option years
    
    ESTIMATED VALUE: $25M - $50M
    
    SUBMISSION DEADLINE: 2024-03-15 14:00 EST
  `);
};

// Simulate processing different file types
async function demonstrateFileProcessing() {
  console.log('🚀 Document Chat System File Processing Integration Demo\n');
  
  // Process a government solicitation document
  console.log('📄 Processing Government Solicitation...');
  const govDoc = createGovernmentDocument();
  
  const options: Partial<FileProcessingOptions> = {
    extractMetadata: true,
    preserveFormatting: false,
    maxTextLength: 10000,
  };
  
  const result = await fileProcessor.processFile(govDoc, 'text/plain', options);
  
  if (result.success) {
    console.log('✅ Document processed successfully!');
    console.log(`   - Text length: ${result.text.length} characters`);
    console.log(`   - Processing time: ${result.processing.duration}ms`);
    console.log(`   - Method: ${result.processing.method}`);
    
    // Extract key information (simulate what AI would do)
    const extractedInfo = {
      solicitation: result.text.match(/SOLICITATION NUMBER: ([^\n]+)/)?.[1],
      title: result.text.match(/TITLE: ([^\n]+)/)?.[1],
      naics: result.text.match(/NAICS CODE: ([^\n]+)/)?.[1],
      value: result.text.match(/ESTIMATED VALUE: ([^\n]+)/)?.[1],
      deadline: result.text.match(/SUBMISSION DEADLINE: ([^\n]+)/)?.[1],
    };
    
    console.log('\n📊 Extracted Information:');
    Object.entries(extractedInfo).forEach(([key, value]) => {
      if (value) {
        console.log(`   - ${key}: ${value.trim()}`);
      }
    });
  } else {
    console.log('❌ Processing failed:', result.error?.message);
  }
  
  // Demonstrate processing multiple file types
  console.log('\n\n📁 Testing Multiple File Types...\n');
  
  const testFiles = [
    {
      name: 'Technical Proposal',
      content: Buffer.from(JSON.stringify({
        company: 'TechCorp Solutions',
        proposal: {
          technical_approach: 'Agile methodology with CI/CD',
          team_composition: ['Project Manager', 'Senior Developers', 'Security Analyst'],
          past_performance: ['DOD Contract #123', 'NASA Project XYZ'],
        }
      }, null, 2)),
      mimeType: 'application/json'
    },
    {
      name: 'Capabilities Statement',
      content: Buffer.from(`
        <html>
          <body>
            <h1>TechCorp Solutions - Capabilities</h1>
            <section>
              <h2>Core Competencies</h2>
              <ul>
                <li>Cloud Architecture (AWS, Azure, GCP)</li>
                <li>Cybersecurity & Compliance</li>
                <li>AI/ML Integration</li>
                <li>DevSecOps Implementation</li>
              </ul>
            </section>
            <section>
              <h2>Contract Vehicles</h2>
              <p>GSA Schedule 70, CIO-SP3, SEWP V</p>
            </section>
          </body>
        </html>
      `),
      mimeType: 'text/html'
    },
    {
      name: 'Pricing Matrix',
      content: Buffer.from(`Labor Category,Rate,Description
Senior Developer,$185/hr,10+ years experience
Mid-Level Developer,$145/hr,5-10 years experience
Junior Developer,$95/hr,2-5 years experience
Project Manager,$165/hr,PMP certified
Security Analyst,$175/hr,CISSP required`),
      mimeType: 'text/csv'
    }
  ];
  
  for (const file of testFiles) {
    console.log(`📄 Processing: ${file.name}`);
    const result = await fileProcessor.processFile(file.content, file.mimeType);
    
    if (result.success) {
      console.log(`   ✅ Success - Extracted ${result.text.length} characters`);
      
      // Show a preview of extracted text
      const preview = result.text.substring(0, 100).replace(/\n/g, ' ').trim();
      console.log(`   📝 Preview: "${preview}..."`);
    } else {
      console.log(`   ❌ Failed: ${result.error?.message}`);
    }
    console.log('');
  }
  
  // Demonstrate error handling
  console.log('\n🛡️ Error Handling Demo...\n');
  
  const errorCases = [
    { name: 'Empty file', buffer: Buffer.from(''), type: 'text/plain' },
    { name: 'Unsupported type', buffer: Buffer.from('test'), type: 'unsupported/format' },
    { name: 'Binary data', buffer: Buffer.from([0xFF, 0xD8, 0xFF]), type: 'application/octet-stream' },
  ];
  
  for (const errorCase of errorCases) {
    console.log(`🧪 Testing: ${errorCase.name}`);
    const result = await fileProcessor.processFile(errorCase.buffer, errorCase.type);
    
    if (!result.success) {
      console.log(`   ✅ Correctly handled: ${result.error?.message}`);
    } else {
      console.log(`   ⚠️  Unexpected success`);
    }
  }
  
  // Show how this integrates with AI processing
  console.log('\n\n🤖 AI Integration Example...\n');
  
  const opportunityDoc = Buffer.from(`
    The National Institutes of Health (NIH) is seeking innovative solutions for
    biomedical data analysis. This opportunity requires expertise in:
    
    - Machine learning algorithms for genomic data
    - HIPAA-compliant cloud infrastructure
    - Real-time data processing capabilities
    - Integration with existing NIH systems
    
    Contractors must demonstrate prior experience with healthcare IT systems
    and maintain appropriate security clearances.
  `);
  
  const aiResult = await fileProcessor.processFile(opportunityDoc, 'text/plain');
  
  if (aiResult.success) {
    console.log('📄 Document processed for AI analysis');
    console.log('🔍 Simulating AI opportunity matching...\n');
    
    // Simulate what the AI would do with the extracted text
    const keywords = ['Machine learning', 'HIPAA', 'cloud infrastructure', 'NIH'];
    const matchedKeywords = keywords.filter(kw => 
      aiResult.text.toLowerCase().includes(kw.toLowerCase())
    );
    
    console.log(`   📊 Match Score: ${(matchedKeywords.length / keywords.length * 100).toFixed(0)}%`);
    console.log(`   🎯 Matched Keywords: ${matchedKeywords.join(', ')}`);
    console.log(`   💡 Recommendation: High relevance for companies with healthcare IT experience`);
  }
  
  console.log('\n\n✨ Demo Complete!');
}

// Run the demo
demonstrateFileProcessing().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});