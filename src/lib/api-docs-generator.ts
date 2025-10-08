/**
 * API Documentation Generator Utilities
 * 
 * Provides utilities for generating API documentation, Postman collections,
 * and other developer tools from API endpoint definitions.
 */

import { app } from '@/lib/config/env';

interface ApiEndpoint {
  method: string
  path: string
  description: string
  auth: boolean
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
    example?: any
  }>
  example?: string
}

interface ApiSection {
  title: string
  description: string
  endpoints: ApiEndpoint[]
}

interface PostmanCollection {
  info: {
    name: string
    description: string
    schema: string
  }
  auth?: {
    type: string
    bearer: Array<{ key: string; value: string; type: string }>
  }
  event?: Array<{
    listen: string
    script: {
      type: string
      exec: string[]
    }
  }>
  variable: Array<{
    key: string
    value: string
    type: string
  }>
  item: Array<any>
}

export class ApiDocsGenerator {
  private baseUrl: string
  private apiSections: ApiSection[]

  constructor(baseUrl: string = 'https://api.documentchatsystem.ai', apiSections: ApiSection[]) {
    this.baseUrl = baseUrl
    this.apiSections = apiSections
  }

  /**
   * Generate a Postman collection from API sections
   */
  generatePostmanCollection(environment: 'development' | 'staging' | 'production' = 'production'): PostmanCollection {
    const environmentUrls = {
      development: app.apiUrl,
      staging: 'https://staging-api.documentchatsystem.ai',
      production: 'https://api.documentchatsystem.ai'
    }

    const collection: PostmanCollection = {
      info: {
        name: 'Document Chat System AI API',
        description: 'Complete API collection for Document Chat System AI - Document Management opportunities discovery and AI-powered matching',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{DOCUMENT_CHAT_SYSTEM_API_TOKEN}}',
            type: 'string'
          }
        ]
      },
      event: [
        {
          listen: 'prerequest',
          script: {
            type: 'text/javascript',
            exec: [
              '// Auto-set environment variables',
              'if (!pm.environment.get("DOCUMENT_CHAT_SYSTEM_API_TOKEN")) {',
              '    console.log("⚠️  Please set DOCUMENT_CHAT_SYSTEM_API_TOKEN in your environment");',
              '}',
              '',
              '// Add request timestamp',
              'pm.globals.set("timestamp", new Date().toISOString());'
            ]
          }
        },
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              '// Global test scripts',
              'pm.test("Response time is reasonable", function () {',
              '    pm.expect(pm.response.responseTime).to.be.below(5000);',
              '});',
              '',
              'pm.test("Response has correct Content-Type", function () {',
              '    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");',
              '});',
              '',
              'if (pm.response.code === 200) {',
              '    pm.test("Success response has correct structure", function () {',
              '        const jsonData = pm.response.json();',
              '        pm.expect(jsonData).to.have.property("success", true);',
              '        pm.expect(jsonData).to.have.property("data");',
              '    });',
              '}'
            ]
          }
        }
      ],
      variable: [
        {
          key: 'baseUrl',
          value: environmentUrls[environment],
          type: 'string'
        },
        {
          key: 'version',
          value: 'v1',
          type: 'string'
        }
      ],
      item: []
    }

    // Generate folders for each API section
    this.apiSections.forEach(section => {
      const folder = {
        name: section.title,
        description: section.description,
        item: [] as any[]
      }

      section.endpoints.forEach(endpoint => {
        const item = this.generatePostmanItem(endpoint)
        folder.item.push(item)
      })

      collection.item.push(folder)
    })

    return collection
  }

  /**
   * Generate a single Postman item from an endpoint
   */
  private generatePostmanItem(endpoint: ApiEndpoint) {
    const url = {
      raw: `{{baseUrl}}${endpoint.path}`,
      host: ['{{baseUrl}}'],
      path: endpoint.path.split('/').filter(p => p !== '')
    }

    // Extract path parameters
    const pathParams = endpoint.path.match(/:(\w+)/g)?.map(param => ({
      key: param.substring(1),
      value: `{{${param.substring(1)}}}`,
      description: `${param.substring(1)} parameter`
    })) || []

    // Extract query parameters
    const queryParams = endpoint.parameters?.filter(p => !endpoint.path.includes(`:${p.name}`))
      .map(param => ({
        key: param.name,
        value: param.example || `{{${param.name}}}`,
        description: param.description,
        disabled: !param.required
      })) || []

    const item: any = {
      name: `${endpoint.method} ${endpoint.path}`,
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: this.generatePostmanTests(endpoint)
          }
        }
      ],
      request: {
        method: endpoint.method,
        header: [
          {
            key: 'Content-Type',
            value: 'application/json',
            type: 'text'
          }
        ],
        url: {
          ...url,
          query: queryParams,
          variable: pathParams
        },
        description: endpoint.description
      },
      response: []
    }

    // Add authentication if required
    if (endpoint.auth) {
      item.request.auth = {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{API_TOKEN}}',
            type: 'string'
          }
        ]
      }
    } else {
      item.request.auth = {
        type: 'noauth'
      }
    }

    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.example) {
      item.request.body = {
        mode: 'raw',
        raw: endpoint.example,
        options: {
          raw: {
            language: 'json'
          }
        }
      }
    }

    return item
  }

  /**
   * Generate Postman test scripts for an endpoint
   */
  private generatePostmanTests(endpoint: ApiEndpoint): string[] {
    const tests = [
      `// Tests for ${endpoint.method} ${endpoint.path}`,
      ''
    ]

    // Add endpoint-specific tests
    if (endpoint.path.includes('/opportunities')) {
      tests.push(
        'if (pm.response.code === 200) {',
        '    pm.test("Opportunities response has pagination", function () {',
        '        const jsonData = pm.response.json();',
        '        if (jsonData.data && Array.isArray(jsonData.data)) {',
        '            pm.expect(jsonData).to.have.property("pagination");',
        '        }',
        '    });',
        '    ',
        '    pm.test("Opportunity objects have required fields", function () {',
        '        const jsonData = pm.response.json();',
        '        if (jsonData.data && jsonData.data.length > 0) {',
        '            const opportunity = jsonData.data[0];',
        '            pm.expect(opportunity).to.have.property("id");',
        '            pm.expect(opportunity).to.have.property("title");',
        '            pm.expect(opportunity).to.have.property("agency");',
        '        }',
        '    });',
        '}'
      )
    } else if (endpoint.path.includes('/match-scores')) {
      tests.push(
        'if (pm.response.code === 200) {',
        '    pm.test("Match scores response has valid scores", function () {',
        '        const jsonData = pm.response.json();',
        '        if (jsonData.data && Array.isArray(jsonData.data)) {',
        '            jsonData.data.forEach(score => {',
        '                pm.expect(score.score).to.be.a("number");',
        '                pm.expect(score.score).to.be.at.least(0);',
        '                pm.expect(score.score).to.be.at.most(100);',
        '            });',
        '        }',
        '    });',
        '}'
      )
    } else if (endpoint.path.includes('/profile')) {
      tests.push(
        'if (pm.response.code === 200) {',
        '    pm.test("Profile has completeness score", function () {',
        '        const jsonData = pm.response.json();',
        '        if (jsonData.data) {',
        '            pm.expect(jsonData.data).to.have.property("completenessScore");',
        '            pm.expect(jsonData.data.completenessScore).to.be.a("number");',
        '        }',
        '    });',
        '}'
      )
    }

    // Add rate limiting tests
    if (endpoint.auth) {
      tests.push(
        '',
        '// Rate limiting tests',
        'pm.test("Rate limit headers present", function () {',
        '    pm.expect(pm.response.headers.get("X-RateLimit-Limit")).to.exist;',
        '    pm.expect(pm.response.headers.get("X-RateLimit-Remaining")).to.exist;',
        '});'
      )
    }

    return tests
  }

  /**
   * Generate OpenAPI 3.0 specification
   */
  generateOpenAPISpec(): any {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'Document Chat System API',
        description: 'Complete API for government contracting opportunities discovery and AI-powered matching',
        version: '1.0.0',
        contact: {
          name: 'Document Chat System Support',
          url: 'https://document-chat-system.vercel.app/support',
          email: 'support@document-chat-system.vercel.app'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'https://api.document-chat-system.vercel.app',
          description: 'Production server'
        },
        {
          url: 'https://staging-api.document-chat-system.vercel.app',
          description: 'Staging server'
        },
        {
          url: 'http://localhost:3000/api',
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: this.generateOpenAPISchemas()
      },
      paths: {} as any
    }

    // Generate paths from sections
    this.apiSections.forEach(section => {
      section.endpoints.forEach(endpoint => {
        const path = endpoint.path.replace(/:(\w+)/g, '{$1}')
        
        if (!spec.paths[path]) {
          spec.paths[path] = {}
        }

        spec.paths[path][endpoint.method.toLowerCase()] = {
          summary: endpoint.description,
          tags: [section.title],
          security: endpoint.auth ? [{ bearerAuth: [] }] : [],
          parameters: this.generateOpenAPIParameters(endpoint),
          responses: this.generateOpenAPIResponses(endpoint)
        }

        // Add request body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.example) {
          spec.paths[path][endpoint.method.toLowerCase()].requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' },
                example: JSON.parse(endpoint.example)
              }
            }
          }
        }
      })
    })

    return spec
  }

  /**
   * Generate OpenAPI schemas
   */
  private generateOpenAPISchemas(): any {
    return {
      Opportunity: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'opp_2024_dod_cyber_001' },
          title: { type: 'string', example: 'Cybersecurity Infrastructure Modernization' },
          agency: { type: 'string', example: 'Department of Defense' },
          naicsCode: { type: 'string', example: '541511' },
          value: { type: 'number', example: 2500000 },
          setAsideType: { type: 'string', example: '8a' },
          location: { type: 'string', example: 'Washington, DC' },
          dueDate: { type: 'string', format: 'date-time' },
          description: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      MatchScore: {
        type: 'object',
        properties: {
          opportunityId: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          factors: {
            type: 'object',
            properties: {
              naicsAlignment: { type: 'number' },
              geographicProximity: { type: 'number' },
              certificationMatch: { type: 'number' },
              pastPerformance: { type: 'number' }
            }
          },
          explanation: { type: 'string' },
          calculatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Profile: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          companyName: { type: 'string' },
          uei: { type: 'string' },
          naicsCodes: { type: 'array', items: { type: 'string' } },
          certifications: { type: 'array', items: { type: 'string' } },
          completenessScore: { type: 'number', minimum: 0, maximum: 100 }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' }
            }
          }
        }
      }
    }
  }

  /**
   * Generate OpenAPI parameters
   */
  private generateOpenAPIParameters(endpoint: ApiEndpoint): any[] {
    const parameters: any[] = []

    endpoint.parameters?.forEach(param => {
      const parameter: any = {
        name: param.name,
        in: endpoint.path.includes(`:${param.name}`) ? 'path' : 'query',
        required: param.required,
        description: param.description,
        schema: {
          type: param.type === 'number' ? 'number' : 'string'
        }
      }

      if (param.example) {
        parameter.example = param.example
      }

      parameters.push(parameter)
    })

    return parameters
  }

  /**
   * Generate OpenAPI responses
   */
  private generateOpenAPIResponses(endpoint: ApiEndpoint): any {
    const responses: any = {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'object' }
              }
            }
          }
        }
      },
      '400': {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      }
    }

    if (endpoint.auth) {
      responses['401'] = {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      }
    }

    return responses
  }

  /**
   * Generate SDK code for different languages
   */
  generateSDKCode(language: 'typescript' | 'python' | 'curl', endpoint: ApiEndpoint): string {
    switch (language) {
      case 'typescript':
        return this.generateTypeScriptSDK(endpoint)
      case 'python':
        return this.generatePythonSDK(endpoint)
      case 'curl':
        return this.generateCurlCommand(endpoint)
      default:
        throw new Error(`Unsupported language: ${language}`)
    }
  }

  private generateTypeScriptSDK(endpoint: ApiEndpoint): string {
    return `
// TypeScript SDK for ${endpoint.method} ${endpoint.path}
import { ApiClient } from '@document-chat-system/api-client';

const client = new ApiClient({
  baseUrl: '${this.baseUrl}',
  apiKey: process.env.API_KEY
});

try {
  const response = await client.${endpoint.method.toLowerCase()}('${endpoint.path}');
  console.log(response.data);
} catch (error) {
  console.error('API error:', error.message);
}
`.trim()
  }

  private generatePythonSDK(endpoint: ApiEndpoint): string {
    return `
# Python SDK for ${endpoint.method} ${endpoint.path}
from document_chat_api import DocumentChatClient

client = DocumentChatClient(
    base_url='${this.baseUrl}',
    api_key=os.getenv('API_KEY')
)

try:
    response = client.${endpoint.method.toLowerCase()}('${endpoint.path}')
    print(response.data)
except Exception as error:
    print(f"API error: {error}")
`.trim()
  }

  private generateCurlCommand(endpoint: ApiEndpoint): string {
    let curl = `curl -X ${endpoint.method}`
    curl += ` \\\n  -H "Content-Type: application/json"`
    
    if (endpoint.auth) {
      curl += ` \\\n  -H "Authorization: Bearer $API_TOKEN"`
    }
    
    if (endpoint.example && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      curl += ` \\\n  -d '${endpoint.example}'`
    }
    
    curl += ` \\\n  "${this.baseUrl}${endpoint.path}"`
    
    return curl
  }
}

/**
 * Export utility function for generating documentation
 */
export function generateApiDocumentation(apiSections: ApiSection[], options: {
  format: 'postman' | 'openapi' | 'sdk'
  environment?: 'development' | 'staging' | 'production'
  language?: 'typescript' | 'python' | 'curl'
  baseUrl?: string
}) {
  const generator = new ApiDocsGenerator(options.baseUrl, apiSections)
  
  switch (options.format) {
    case 'postman':
      return generator.generatePostmanCollection(options.environment)
    case 'openapi':
      return generator.generateOpenAPISpec()
    case 'sdk':
      // Return SDK generation function
      return (endpoint: ApiEndpoint) => 
        generator.generateSDKCode(options.language || 'typescript', endpoint)
    default:
      throw new Error(`Unsupported format: ${options.format}`)
  }
}