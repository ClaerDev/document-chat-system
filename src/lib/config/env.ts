/**
 * Environment Configuration
 *
 * Centralized configuration for all environment variables with validation and defaults
 */

import { z } from 'zod'

// Environment variable schemas with validation
const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .min(1)
    .describe(
      'Connection string for the primary PostgreSQL database. Format: postgresql://user:password@host:port/dbname. Required.'
    ),

  // Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1)
    .describe(
      'Clerk frontend publishable key for authentication. Used by the client to initialize Clerk.js. Required.'
    ),
  CLERK_SECRET_KEY: z
    .string()
    .min(1)
    .describe(
      'Clerk backend secret key for server-side authentication. Used by the backend to verify and manage users. Required.'
    ),
  CLERK_WEBHOOK_SECRET: z
    .string()
    .optional()
    .describe(
      'Clerk webhook secret for verifying webhook signatures from Clerk. Used in /api/v1/webhooks/clerk/route.ts for secure webhook processing.'
    ),

  // AI Providers
  LITELLM_BASE_URL: z
    .string()
    .optional()
    .describe(
      'Base URL for LiteLLM proxy (optional). Used for routing AI requests through LiteLLM if set.'
    ),
  LITELLM_MASTER_KEY: z
    .string()
    .optional()
    .describe('Master API key for LiteLLM proxy (optional).'),
  LITELLM_API_KEY: z
    .string()
    .optional()
    .describe('API key for LiteLLM proxy (optional).'),
  LITELLM_UI_USERNAME: z
    .string()
    .optional()
    .describe(
      'Username for LiteLLM UI access. Present in .env.example but missing from env.ts. Used for LiteLLM dashboard authentication.'
    ),
  LITELLM_UI_PASSWORD: z
    .string()
    .optional()
    .describe(
      'Password for LiteLLM UI access. Present in .env.example but missing from env.ts. Used for LiteLLM dashboard authentication.'
    ),
  LITELLM_DATABASE_URL: z
    .string()
    .optional()
    .describe(
      'Database URL for LiteLLM persistence. Present in .env.example but missing from env.ts. Used for LiteLLM analytics and logging.'
    ),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .describe(
      'API key for OpenAI services (optional). Used for direct OpenAI API calls if not using LiteLLM.'
    ),
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .describe('API key for Anthropic services (optional).'),
  GOOGLE_AI_API_KEY: z
    .string()
    .optional()
    .describe('API key for Google AI services (optional).'),
  AZURE_OPENAI_API_KEY: z
    .string()
    .optional()
    .describe('API key for Azure OpenAI services (optional).'),
  AZURE_OPENAI_ENDPOINT: z
    .string()
    .optional()
    .describe(
      'Endpoint URL for Azure OpenAI resource (optional). Example: https://your-resource.openai.azure.com'
    ),
  OPENROUTER_API_KEY: z
    .string()
    .optional()
    .describe(
      'API key for OpenRouter multi-provider AI routing (optional). Enables intelligent provider selection and cost optimization.'
    ),
  OPENROUTER_APP_NAME: z
    .string()
    .default('GovMatch-AI')
    .describe(
      'Application name for OpenRouter requests. Used for tracking and analytics. Default: GovMatch-AI'
    ),
  OPENROUTER_SITE_URL: z
    .string()
    .url()
    .default('https://govmatch.ai')
    .describe(
      'Site URL for OpenRouter requests. Used for provider attribution and analytics. Default: https://govmatch.ai'
    ),

  // Extended AI Provider Configuration
  OPENAI_ORGANIZATION_ID: z
    .string()
    .optional()
    .describe(
      'OpenAI organization ID for API requests. Used in ai-service-manager.ts and ai-config.ts for organization-specific billing and access.'
    ),
  OPENAI_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .default(500)
    .describe(
      'Rate limit for OpenAI requests per minute. Used in ai-config.ts for provider rate limiting. Default: 500'
    ),
  OPENAI_TOKENS_PER_MINUTE: z.coerce
    .number()
    .default(150000)
    .describe(
      'Token limit for OpenAI requests per minute. Used in ai-config.ts for token-based rate limiting. Default: 150000'
    ),
  ANTHROPIC_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .default(200)
    .describe(
      'Rate limit for Anthropic requests per minute. Used in ai-config.ts for provider rate limiting. Default: 200'
    ),
  ANTHROPIC_TOKENS_PER_MINUTE: z.coerce
    .number()
    .default(100000)
    .describe(
      'Token limit for Anthropic requests per minute. Used in ai-config.ts for token-based rate limiting. Default: 100000'
    ),
  GOOGLE_AI_PROJECT_ID: z
    .string()
    .optional()
    .describe(
      'Google Cloud project ID for Google AI services. Used in ai-config.ts for project-specific API access and billing.'
    ),
  GOOGLE_AI_LOCATION: z
    .string()
    .default('us-central1')
    .describe(
      'Google AI service region/location. Used in ai-config.ts for geographic deployment and latency optimization. Default: us-central1'
    ),
  GOOGLE_AI_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .default(300)
    .describe(
      'Rate limit for Google AI requests per minute. Used in ai-config.ts for provider rate limiting. Default: 300'
    ),
  GOOGLE_AI_TOKENS_PER_MINUTE: z.coerce
    .number()
    .default(120000)
    .describe(
      'Token limit for Google AI requests per minute. Used in ai-config.ts for token-based rate limiting. Default: 120000'
    ),
  AZURE_OPENAI_API_VERSION: z
    .string()
    .default('2024-02-01')
    .describe(
      'Azure OpenAI API version for requests. Used in ai-config.ts for API compatibility. Default: 2024-02-01'
    ),
  AZURE_OPENAI_DEPLOYMENT_NAME: z
    .string()
    .optional()
    .describe(
      'Azure OpenAI deployment name for model routing. Used in ai-config.ts for deployment-specific model access.'
    ),
  AZURE_OPENAI_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .default(300)
    .describe(
      'Rate limit for Azure OpenAI requests per minute. Used in ai-config.ts for provider rate limiting. Default: 300'
    ),
  AZURE_OPENAI_TOKENS_PER_MINUTE: z.coerce
    .number()
    .default(120000)
    .describe(
      'Token limit for Azure OpenAI requests per minute. Used in ai-config.ts for token-based rate limiting. Default: 120000'
    ),
  OPENROUTER_SMART_ROUTING: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Enable intelligent model routing in OpenRouter. Used in ai-config.ts for cost and performance optimization. Default: true'
    ),
  OPENROUTER_COST_OPTIMIZATION: z
    .enum(['aggressive', 'balanced', 'conservative'])
    .default('balanced')
    .describe(
      'Cost optimization strategy for OpenRouter. Used in ai-config.ts for model selection based on cost priorities. Default: balanced'
    ),
  OPENROUTER_FALLBACK_STRATEGY: z
    .enum(['internal', 'openrouter', 'hybrid'])
    .default('hybrid')
    .describe(
      'Fallback strategy when primary providers fail. Used in ai-config.ts for resilient AI service architecture. Default: hybrid'
    ),
  OPENROUTER_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .default(500)
    .describe(
      'Rate limit for OpenRouter requests per minute. Used in ai-config.ts for provider rate limiting. Default: 500'
    ),
  OPENROUTER_TOKENS_PER_MINUTE: z.coerce
    .number()
    .default(200000)
    .describe(
      'Token limit for OpenRouter requests per minute. Used in ai-config.ts for token-based rate limiting. Default: 200000'
    ),
  OPENROUTER_PROMPT_CACHE_ENABLED: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Enable OpenRouter prompt caching for cost optimization. Uses cache_control breakpoints for Anthropic/Gemini and automatic caching for OpenAI/Grok. Default: true'
    ),
  OPENROUTER_PROMPT_CACHE_TTL: z.coerce
    .number()
    .default(300)
    .describe(
      'TTL in seconds for prompt caching on OpenRouter. Matches OpenRouter provider cache duration (5 minutes for most providers). Default: 300'
    ),
  OPENROUTER_PROMPT_CACHE_MIN_TOKENS: z.coerce
    .number()
    .default(1024)
    .describe(
      'Minimum token count to enable prompt caching. OpenAI requires 1024, Gemini 2048, Anthropic no limit. Default: 1024'
    ),
  OPENROUTER_CACHE_BREAKPOINT_STRATEGY: z
    .enum(['auto', 'system_only', 'user_only', 'disabled'])
    .default('auto')
    .describe(
      'Strategy for inserting cache_control breakpoints. auto: intelligent placement, system_only: only in system messages, user_only: only in user messages, disabled: no breakpoints. Default: auto'
    ),

  // ImageRouter Configuration
  IMAGEROUTER_API_KEY: z
    .string()
    .optional()
    .describe(
      'API key for ImageRouter image and video generation services. Used for creating media content through AI. Optional for development.'
    ),
  IMAGEROUTER_BASE_URL: z
    .string()
    .url()
    .default('https://api.imagerouter.io')
    .describe(
      'Base URL for ImageRouter API endpoints. Default: https://api.imagerouter.io'
    ),
  IMAGEROUTER_TIMEOUT: z.coerce
    .number()
    .default(60000)
    .describe(
      'Request timeout for ImageRouter API calls in milliseconds. Image/video generation can take longer. Default: 60000 (60 seconds)'
    ),
  IMAGEROUTER_MAX_RETRIES: z.coerce
    .number()
    .default(2)
    .describe(
      'Maximum retry attempts for failed ImageRouter requests. Default: 2'
    ),
  IMAGEROUTER_RETRY_DELAY: z.coerce
    .number()
    .default(2000)
    .describe(
      'Delay between ImageRouter retry attempts in milliseconds. Default: 2000'
    ),
  IMAGEROUTER_RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .default(30)
    .describe(
      'Rate limit for ImageRouter requests per minute. Based on ImageRouter limits (30 image generation requests per minute). Default: 30'
    ),
  IMAGEROUTER_COST_OPTIMIZATION: z
    .enum(['aggressive', 'balanced', 'conservative'])
    .default('balanced')
    .describe(
      'Cost optimization strategy for ImageRouter model selection. Affects model quality vs cost trade-offs. Default: balanced'
    ),
  IMAGEROUTER_DEFAULT_IMAGE_MODEL: z
    .string()
    .default('test/test')
    .describe(
      'Default model for image generation when no specific model is requested. Default: test/test'
    ),
  IMAGEROUTER_DEFAULT_VIDEO_MODEL: z
    .string()
    .default('ir/test-video')
    .describe(
      'Default model for video generation when no specific model is requested. Default: ir/test-video'
    ),
  IMAGEROUTER_DEFAULT_QUALITY: z
    .enum(['auto', 'low', 'medium', 'high'])
    .default('auto')
    .describe(
      'Default quality setting for image generation. Higher quality may cost more and take longer. Default: auto'
    ),
  IMAGEROUTER_DEFAULT_RESPONSE_FORMAT: z
    .enum(['url', 'b64_json'])
    .default('url')
    .describe(
      'Default response format for generated images. url returns image URLs, b64_json returns base64 encoded images. Default: url'
    ),
  IMAGEROUTER_ENABLE_CACHING: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Enable caching for ImageRouter model lists and responses to reduce API calls. Default: true'
    ),
  IMAGEROUTER_CACHE_TTL: z.coerce
    .number()
    .default(1800)
    .describe(
      'Cache TTL for ImageRouter responses in seconds. Default: 1800 (30 minutes)'
    ),

  // Security & API Keys
  INTERNAL_API_KEY: z
    .string()
    .optional()
    .describe(
      'Internal API key for secure inter-service communication. Used in api-service-manager.ts and auth middleware for system-to-system authentication.'
    ),
  CRON_SECRET: z
    .string()
    .optional()
    .describe(
      'Secret token for authenticating scheduled cron jobs. Used in cron endpoints for verifying legitimate automated requests.'
    ),
  JWT_SECRET: z
    .string()
    .optional()
    .describe(
      'Secret key for signing JWT tokens. Used for API key authentication and session management in auth middleware.'
    ),
  NEXTAUTH_SECRET: z
    .string()
    .optional()
    .describe(
      'NextAuth.js secret for session encryption. Required for NextAuth.js authentication if used alongside Clerk.'
    ),
  NEXTAUTH_URL: z
    .string()
    .url()
    .optional()
    .describe(
      'NextAuth.js canonical URL for callback handling. Required for NextAuth.js authentication in production environments.'
    ),

  // Stripe Extended Configuration
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .describe(
      'Stripe webhook endpoint secret for signature verification. Used in /api/v1/webhooks/stripe/route.ts for secure webhook processing.'
    ),
  STRIPE_PRICE_ID_BASIC: z
    .string()
    .optional()
    .describe(
      'Stripe price ID for basic subscription plan. Used in billing-service-manager.ts for subscription management.'
    ),
  STRIPE_PRICE_ID_PRO: z
    .string()
    .optional()
    .describe(
      'Stripe price ID for pro subscription plan. Used in billing-service-manager.ts for subscription management.'
    ),
  STRIPE_PRICE_ID_ENTERPRISE: z
    .string()
    .optional()
    .describe(
      'Stripe price ID for enterprise subscription plan. Used in billing-service-manager.ts for subscription management.'
    ),
  STRIPE_PRICE_STARTER: z
    .string()
    .optional()
    .describe(
      'Stripe price ID for starter subscription plan. Used in stripe.ts for subscription management and pricing display.'
    ),
  STRIPE_PRICE_PROFESSIONAL: z
    .string()
    .optional()
    .describe(
      'Stripe price ID for professional subscription plan. Used in stripe.ts for subscription management and pricing display.'
    ),
  STRIPE_PRICE_AGENCY: z
    .string()
    .optional()
    .describe(
      'Stripe price ID for agency subscription plan. Used in stripe.ts for subscription management and pricing display.'
    ),

  // Webhook URLs & Security
  WEBHOOK_SECRET_SALES_INQUIRY: z
    .string()
    .optional()
    .describe(
      'Secret for sales inquiry webhook verification. Used in sales inquiry webhook endpoints for security.'
    ),
  WEBHOOK_SECRET_FORM_SUBMISSION: z
    .string()
    .optional()
    .describe(
      'Secret for form submission webhook verification. Used in form webhook endpoints for security.'
    ),
  SALES_INQUIRY_WEBHOOK_URL: z
    .string()
    .url()
    .optional()
    .describe(
      'External URL for sales inquiry webhooks. Used for forwarding sales inquiries to CRM systems.'
    ),
  SALES_INQUIRY_WEBHOOK_SECRET: z
    .string()
    .optional()
    .describe(
      'Secret for sales inquiry webhook verification. Used in sales inquiry webhook endpoints for authentication.'
    ),

  // Security Monitoring
  SECURITY_WEBHOOK_URL: z
    .string()
    .url()
    .optional()
    .describe(
      'External URL for security alerts and monitoring webhooks. Used in security-monitoring.ts for incident notifications.'
    ),
  SECURITY_WEBHOOK_TOKEN: z
    .string()
    .optional()
    .describe(
      'Authentication token for security webhook endpoints. Used in security-monitoring.ts for secure webhook delivery.'
    ),
  SECURITY_ALERT_EMAIL: z
    .string()
    .email()
    .optional()
    .describe(
      'Email address for security alert notifications. Used in security-monitoring.ts for critical security incidents.'
    ),
  SECURITY_SLACK_WEBHOOK: z
    .string()
    .url()
    .optional()
    .describe(
      'Slack webhook URL for security notifications. Used in security-monitoring.ts for real-time security alerts.'
    ),

  // API Configuration
  GOVMATCH_API_KEY: z
    .string()
    .optional()
    .describe(
      'API key for GovMatch services. Used in api-docs-generator.ts and external API integrations for authentication.'
    ),
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url()
    .optional()
    .describe(
      'Public base URL for the application. Used in API routes and client-side code for URL generation.'
    ),

  // AI Feature Flags
  AI_FEATURE_SMART_ROUTING: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Enable intelligent AI provider routing based on cost and performance. Used in ai-service-manager.ts for provider selection. Default: true'
    ),
  AI_FEATURE_COST_OPTIMIZATION: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Enable cost-based AI model selection and optimization. Used in ai-service-manager.ts for cost control. Default: true'
    ),
  AI_FEATURE_PERFORMANCE_MONITORING: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Enable real-time AI performance monitoring and alerting. Used in ai-service-manager.ts for performance tracking. Default: true'
    ),

  // Testing & Development
  TEST_DATABASE_URL: z
    .string()
    .optional()
    .describe(
      'Database URL for test environments. Used in test configurations and CI/CD pipelines for isolated testing.'
    ),
  TEST_REDIS_URL: z
    .string()
    .optional()
    .describe(
      'Redis URL for test environments. Used in test configurations for isolated cache testing.'
    ),
  MOCK_AI_RESPONSES: z.coerce
    .boolean()
    .default(false)
    .describe(
      'Enable mock AI responses for testing and development. Used in ai-service-manager.ts to bypass real AI calls during testing. Default: false'
    ),
  ENABLE_DEBUG_LOGGING: z.coerce
    .boolean()
    .default(false)
    .describe(
      'Enable verbose debug logging for development and troubleshooting. Used throughout the application for detailed logging. Default: false'
    ),

  // Development User Configuration
  DEVELOPER_EMAIL: z
    .string()
    .email()
    .optional()
    .describe(
      'Email address for the developer/owner of the application. Used in seed.ts and throughout the app for developer-specific configurations.'
    ),

  // Error Configuration - Circuit Breaker
  ERROR_CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce
    .number()
    .default(5)
    .describe(
      'Number of failures before opening circuit breaker. Used in error-config.ts for circuit breaker configuration. Default: 5'
    ),
  ERROR_CIRCUIT_BREAKER_RECOVERY_TIMEOUT: z.coerce
    .number()
    .default(30000)
    .describe(
      'Time in milliseconds before attempting recovery. Used in error-config.ts for circuit breaker configuration. Default: 30000'
    ),
  ERROR_CIRCUIT_BREAKER_MONITORING_WINDOW: z.coerce
    .number()
    .default(60000)
    .describe(
      'Time window in milliseconds for monitoring failures. Used in error-config.ts for circuit breaker configuration. Default: 60000'
    ),
  ERROR_CIRCUIT_BREAKER_ERROR_RATE: z.coerce
    .number()
    .default(0.1)
    .describe(
      'Expected error rate (0-1) before triggering circuit breaker. Used in error-config.ts for circuit breaker configuration. Default: 0.1'
    ),
  ERROR_CIRCUIT_BREAKER_HALF_OPEN_CALLS: z.coerce
    .number()
    .default(3)
    .describe(
      'Maximum calls allowed in half-open state. Used in error-config.ts for circuit breaker configuration. Default: 3'
    ),

  // Error Configuration - Notifications
  ERROR_NOTIFICATIONS_MAX_PER_MINUTE: z.coerce
    .number()
    .default(10)
    .describe(
      'Maximum error notifications per minute to prevent spam. Used in error-config.ts for notification configuration. Default: 10'
    ),
  ERROR_NOTIFICATIONS_COOLDOWN: z.coerce
    .number()
    .default(300000)
    .describe(
      'Cooldown period in milliseconds between health notifications. Used in error-config.ts for notification configuration. Default: 300000'
    ),
  ERROR_NOTIFICATIONS_PERSISTENT_SEVERITIES: z
    .string()
    .default('critical')
    .describe(
      'Comma-separated error severities that show persistent notifications. Used in error-config.ts for notification configuration. Default: critical'
    ),

  // Error Configuration - Retry
  ERROR_RETRY_MAX_ATTEMPTS: z.coerce
    .number()
    .default(3)
    .describe(
      'Maximum retry attempts for retryable errors. Used in error-config.ts for retry configuration. Default: 3'
    ),
  ERROR_RETRY_BASE_DELAY: z.coerce
    .number()
    .default(1000)
    .describe(
      'Base delay in milliseconds for exponential backoff. Used in error-config.ts for retry configuration. Default: 1000'
    ),
  ERROR_RETRY_MAX_DELAY: z.coerce
    .number()
    .default(30000)
    .describe(
      'Maximum delay in milliseconds for exponential backoff. Used in error-config.ts for retry configuration. Default: 30000'
    ),
  ERROR_RETRY_JITTER_FACTOR: z.coerce
    .number()
    .default(0.1)
    .describe(
      'Jitter factor (0-1) to prevent thundering herd. Used in error-config.ts for retry configuration. Default: 0.1'
    ),

  // Error Configuration - Recovery
  ERROR_RECOVERY_MAX_RETRIES: z.coerce
    .number()
    .default(3)
    .describe(
      'Maximum auto-recovery attempts. Used in error-config.ts for recovery configuration. Default: 3'
    ),
  ERROR_RECOVERY_TIMEOUT: z.coerce
    .number()
    .default(120000)
    .describe(
      'Timeout in milliseconds for recovery operations. Used in error-config.ts for recovery configuration. Default: 120000'
    ),
  ERROR_RECOVERY_HEALTH_CHECK_INTERVAL: z.coerce
    .number()
    .default(15000)
    .describe(
      'Interval in milliseconds for health checks during recovery. Used in error-config.ts for recovery configuration. Default: 15000'
    ),
  ERROR_RECOVERY_ENABLE_AUTO: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Whether to enable automatic error recovery. Used in error-config.ts for recovery configuration. Default: true'
    ),

  // Error Configuration - Patterns
  ERROR_PATTERNS_CORRELATION_WINDOW: z.coerce
    .number()
    .default(60000)
    .describe(
      'Time window in milliseconds for error correlation. Used in error-config.ts for pattern detection. Default: 60000'
    ),
  ERROR_PATTERNS_BURST_THRESHOLD: z.coerce
    .number()
    .default(3)
    .describe(
      'Number of errors in correlation window to trigger burst detection. Used in error-config.ts for pattern detection. Default: 3'
    ),
  ERROR_PATTERNS_CASCADE_TIMEOUT: z.coerce
    .number()
    .default(15000)
    .describe(
      'Timeout in milliseconds to detect cascade failures. Used in error-config.ts for pattern detection. Default: 15000'
    ),
  ERROR_PATTERNS_TREND_WINDOW: z.coerce
    .number()
    .default(1800000)
    .describe(
      'Time window in milliseconds for error trend analysis. Used in error-config.ts for pattern detection. Default: 1800000'
    ),

  // Error Configuration - Health
  ERROR_HEALTH_CRITICAL_THRESHOLD: z.coerce
    .number()
    .default(10)
    .describe(
      'Error count per hour threshold for critical health status. Used in error-config.ts for health monitoring. Default: 10'
    ),
  ERROR_HEALTH_WARNING_THRESHOLD: z.coerce
    .number()
    .default(5)
    .describe(
      'Error count per hour threshold for warning health status. Used in error-config.ts for health monitoring. Default: 5'
    ),
  ERROR_HEALTH_CHECK_INTERVAL: z.coerce
    .number()
    .default(30000)
    .describe(
      'Interval in milliseconds for system health checks. Used in error-config.ts for health monitoring. Default: 30000'
    ),
  ERROR_HEALTH_HISTORY_RETENTION: z.coerce
    .number()
    .default(100)
    .describe(
      'Number of errors to retain in history. Used in error-config.ts for health monitoring. Default: 100'
    ),

  // Error Configuration - AI Services
  ERROR_AI_TIMEOUT_MS: z.coerce
    .number()
    .default(30000)
    .describe(
      'Timeout in milliseconds for AI service requests in error handling. Used in error-config.ts for AI service configuration. Default: 30000'
    ),
  ERROR_AI_RATE_LIMIT_WINDOW: z.coerce
    .number()
    .default(3600000)
    .describe(
      'Rate limit window in milliseconds for AI services in error handling. Used in error-config.ts for AI service configuration. Default: 3600000'
    ),
  ERROR_AI_COST_WARNING: z.coerce
    .number()
    .default(100)
    .describe(
      'Cost threshold in dollars for warning notifications in error handling. Used in error-config.ts for AI service configuration. Default: 100'
    ),
  ERROR_AI_COST_CRITICAL: z.coerce
    .number()
    .default(500)
    .describe(
      'Cost threshold in dollars for critical notifications in error handling. Used in error-config.ts for AI service configuration. Default: 500'
    ),
  ERROR_AI_FALLBACK_DELAY: z.coerce
    .number()
    .default(1000)
    .describe(
      'Delay in milliseconds before attempting fallback provider in error handling. Used in error-config.ts for AI service configuration. Default: 1000'
    ),

  // Error Configuration - Reporting
  ERROR_REPORTING_TRACKING: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Whether to enable external error tracking (Sentry, etc.). Used in error-config.ts for reporting configuration. Default: true'
    ),
  ERROR_REPORTING_METRICS: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Whether to enable error metrics collection. Used in error-config.ts for reporting configuration. Default: true'
    ),
  ERROR_REPORTING_ANALYTICS: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Whether to enable error analytics. Used in error-config.ts for reporting configuration. Default: true'
    ),
  ERROR_REPORTING_BATCH_SIZE: z.coerce
    .number()
    .default(10)
    .describe(
      'Batch size for error reporting to external services. Used in error-config.ts for reporting configuration. Default: 10'
    ),
  ERROR_REPORTING_FLUSH_INTERVAL: z.coerce
    .number()
    .default(30000)
    .describe(
      'Interval in milliseconds to flush batched error reports. Used in error-config.ts for reporting configuration. Default: 30000'
    ),

  // Error Configuration - Development
  ERROR_DEV_CONSOLE: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Whether to enable console logging in development for errors. Used in error-config.ts for development configuration. Default: true'
    ),
  ERROR_DEV_DETAILED: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Whether to show detailed error information in development. Used in error-config.ts for development configuration. Default: true'
    ),
  ERROR_DEV_MOCK_ERRORS: z.coerce
    .boolean()
    .default(false)
    .describe(
      'Whether to enable mock errors for testing. Used in error-config.ts for development configuration. Default: false'
    ),
  ERROR_DEV_VERBOSE: z.coerce
    .boolean()
    .default(false)
    .describe(
      'Whether to enable verbose error logging. Used in error-config.ts for development configuration. Default: false'
    ),

  // AI Model Configuration
  AI_MODEL_FAST: z
    .string()
    .default('gpt-3.5-turbo')
    .describe('Fast AI model for simple tasks. Default: gpt-3.5-turbo'),
  AI_MODEL_BALANCED: z
    .string()
    .default('gpt-4o-mini')
    .describe('Balanced AI model for general tasks. Default: gpt-4o-mini'),
  AI_MODEL_POWERFUL: z
    .string()
    .default('gpt-4o')
    .describe('Powerful AI model for complex tasks. Default: gpt-4o'),
  AI_DEFAULT_MODEL: z
    .string()
    .default('gpt-4o-mini')
    .describe('Default AI model when no specific model is requested. Default: gpt-4o-mini'),
  AI_MAX_TOKENS: z.coerce
    .number()
    .default(16000)
    .describe('Maximum tokens for AI model responses. Increased from 1000 to 16000 for better quality. Default: 16000'),

  // AI Performance & Limits
  AI_MAX_LATENCY_FAST: z.coerce
    .number()
    .default(3000)
    .describe('Maximum latency for fast AI models (ms). Default: 3000'),
  AI_MAX_LATENCY_BALANCED: z.coerce
    .number()
    .default(8000)
    .describe('Maximum latency for balanced AI models (ms). Default: 8000'),
  AI_MAX_LATENCY_POWERFUL: z.coerce
    .number()
    .default(15000)
    .describe('Maximum latency for powerful AI models (ms). Default: 15000'),
  AI_PERFORMANCE_ALERT_THRESHOLD: z.coerce
    .number()
    .default(3000)
    .describe('Latency threshold for performance alerts (ms). Default: 3000'),

  // Cache Configuration
  CACHE_DEFAULT_TTL: z.coerce
    .number()
    .default(3600)
    .describe('Default cache TTL in seconds. Default: 3600 (1 hour)'),
  CACHE_HEALTH_CHECK_INTERVAL: z.coerce
    .number()
    .default(30000)
    .describe('Cache health check interval (ms). Default: 30000'),

  // Circuit Breaker Configuration
  CIRCUIT_BREAKER_RECOVERY_TIMEOUT: z.coerce
    .number()
    .default(60000)
    .describe('Circuit breaker recovery timeout (ms). Default: 60000'),
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce
    .number()
    .default(5)
    .describe('Circuit breaker failure threshold. Default: 5'),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z
    .string()
    .default('http://localhost:3000')
    .describe(
      'Public URL of the frontend application. Used for client-side routing and redirects. Default: http://localhost:3000'
    ),
  NEXT_PUBLIC_API_URL: z
    .string()
    .default('http://localhost:3000/api')
    .describe(
      'Public URL of the API endpoint. Used by the frontend to call backend APIs. Default: http://localhost:3000/api'
    ),

  // Redis Configuration
  UPSTASH_REDIS_REST_URL: z
    .string()
    .optional()
    .describe(
      'Upstash Redis REST API URL (optional). Used for production Redis connections.'
    ),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .describe('Upstash Redis REST API token (optional).'),
  REDIS_FALLBACK_URL: z
    .string()
    .default('http://localhost:6379')
    .describe(
      'Fallback Redis URL for local/dev environments. Default: http://localhost:6379'
    ),
  REDIS_FALLBACK_TOKEN: z
    .string()
    .default('dev-token')
    .describe(
      'Fallback Redis token for local/dev environments. Default: dev-token'
    ),
  REDIS_CONNECTION_TIMEOUT: z.coerce
    .number()
    .default(10000)
    .describe('Redis connection timeout in milliseconds. Default: 10000'),
  REDIS_COMMAND_TIMEOUT: z.coerce
    .number()
    .default(5000)
    .describe('Redis command timeout in milliseconds. Default: 5000'),
  REDIS_MAX_RETRIES: z.coerce
    .number()
    .default(3)
    .describe('Maximum number of Redis connection retries. Default: 3'),
  REDIS_RETRY_DELAY: z.coerce
    .number()
    .default(100)
    .describe('Delay between Redis retries in milliseconds. Default: 100'),
  REDIS_KEEP_ALIVE: z.coerce
    .number()
    .default(30000)
    .describe('Redis keep-alive interval in milliseconds. Default: 30000'),
  REDIS_HOST: z
    .string()
    .default('localhost')
    .describe('Redis server hostname. Used in cache configuration for direct Redis connections. Default: localhost'),
  REDIS_PORT: z.coerce
    .number()
    .default(6379)
    .describe('Redis server port number. Used in cache configuration for direct Redis connections. Default: 6379'),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .describe('Redis server password for authentication. Used in cache configuration when Redis requires authentication.'),
  REDIS_DB: z.coerce
    .number()
    .default(0)
    .describe('Redis database number to use. Used in cache configuration for database selection. Default: 0'),
  MEMORY_CACHE_CLEANUP_INTERVAL: z.coerce
    .number()
    .default(300000)
    .describe(
      'Interval for in-memory cache cleanup in milliseconds. Default: 300000 (5 minutes)'
    ),

  // Cache Configuration
  CACHE_TTL_SHORT: z.coerce
    .number()
    .default(300)
    .describe(
      'Short cache TTL in seconds (e.g., for ephemeral data). Default: 300 (5 minutes)'
    ),
  CACHE_TTL_MEDIUM: z.coerce
    .number()
    .default(1800)
    .describe(
      'Medium cache TTL in seconds (e.g., for user profiles). Default: 1800 (30 minutes)'
    ),
  CACHE_TTL_LONG: z.coerce
    .number()
    .default(3600)
    .describe(
      'Long cache TTL in seconds (e.g., for less volatile data). Default: 3600 (1 hour)'
    ),
  CACHE_TTL_DAY: z.coerce
    .number()
    .default(86400)
    .describe(
      'Daily cache TTL in seconds (e.g., for pricing data). Default: 86400 (24 hours)'
    ),
  CACHE_TTL_WEEK: z.coerce
    .number()
    .default(604800)
    .describe(
      'Weekly cache TTL in seconds (e.g., for rarely changing data). Default: 604800 (7 days)'
    ),
  PRICING_CACHE_TTL: z.coerce
    .number()
    .default(300000)
    .describe(
      'TTL for pricing cache in milliseconds. Default: 300000 (5 minutes)'
    ),

  // Rate Limiting Configuration
  RATE_LIMIT_MATCH_SCORES_WINDOW: z.coerce
    .number()
    .default(60000)
    .describe(
      'Rate limit window for match scores (ms). Default: 60000 (1 minute)'
    ),
  RATE_LIMIT_MATCH_SCORES_MAX: z.coerce
    .number()
    .default(10)
    .describe('Max requests per window for match scores. Default: 10'),
  RATE_LIMIT_SEARCH_WINDOW: z.coerce
    .number()
    .default(60000)
    .describe('Rate limit window for search (ms). Default: 60000 (1 minute)'),
  RATE_LIMIT_SEARCH_MAX: z.coerce
    .number()
    .default(20)
    .describe('Max requests per window for search. Default: 20'),
  RATE_LIMIT_AI_WINDOW: z.coerce
    .number()
    .default(60000)
    .describe(
      'Rate limit window for AI requests (ms). Default: 60000 (1 minute)'
    ),
  RATE_LIMIT_AI_MAX: z.coerce
    .number()
    .default(5)
    .describe('Max AI requests per window. Default: 5'),
  RATE_LIMIT_API_WINDOW: z.coerce
    .number()
    .default(60000)
    .describe(
      'Rate limit window for API requests (ms). Default: 60000 (1 minute)'
    ),
  RATE_LIMIT_API_MAX: z.coerce
    .number()
    .default(100)
    .describe('Max API requests per window. Default: 100'),
  RATE_LIMIT_UPLOAD_WINDOW: z.coerce
    .number()
    .default(60000)
    .describe('Rate limit window for uploads (ms). Default: 60000 (1 minute)'),
  RATE_LIMIT_UPLOAD_MAX: z.coerce
    .number()
    .default(5)
    .describe('Max upload requests per window. Default: 5'),

  // File Upload Configuration
  MAX_FILE_UPLOAD_SIZE: z.coerce
    .number()
    .default(52428800)
    .describe('Maximum file upload size in bytes. Default: 52428800 (50MB) - increased to support video files'),
  DEFAULT_PAGE_SIZE: z.coerce
    .number()
    .default(25)
    .describe('Default pagination page size. Default: 25'),
  MAX_PAGE_SIZE: z.coerce
    .number()
    .default(100)
    .describe('Maximum allowed pagination page size. Default: 100'),

  // Billing Configuration
  BILLING_COST_PER_API_CALL: z.coerce
    .number()
    .default(0.01)
    .describe('Cost per API call (USD). Default: 0.01'),
  BILLING_COST_PER_CACHE_HIT: z.coerce
    .number()
    .default(0.001)
    .describe('Cost per cache hit (USD). Default: 0.001'),
  BILLING_COST_PER_AI_CALL: z.coerce
    .number()
    .default(0.05)
    .describe('Cost per AI call (USD). Default: 0.05'),

  // AI Service Configuration
  AI_DEFAULT_TIMEOUT: z.coerce
    .number()
    .default(30000)
    .describe(
      'Default timeout for AI requests (ms). Default: 30000 (30 seconds)'
    ),
  AI_MAX_CONCURRENT_REQUESTS: z.coerce
    .number()
    .default(100)
    .describe('Max concurrent AI requests allowed. Default: 100'),
  AI_DAILY_COST_LIMIT: z.coerce
    .number()
    .default(100.0)
    .describe('Daily cost limit for AI usage (USD). Default: 100.00'),
  AI_MONTHLY_COST_LIMIT: z.coerce
    .number()
    .default(1000.0)
    .describe('Monthly cost limit for AI usage (USD). Default: 1000.00'),
  AI_PER_REQUEST_COST_LIMIT: z.coerce
    .number()
    .default(5.0)
    .describe('Per-request cost limit for AI usage (USD). Default: 5.00'),
  AI_RETRY_ATTEMPTS: z.coerce
    .number()
    .default(3)
    .describe('Number of retry attempts for failed AI requests. Default: 3'),
  AI_RETRY_DELAY: z.coerce
    .number()
    .default(1000)
    .describe('Delay between AI retry attempts (ms). Default: 1000'),
  AI_CIRCUIT_BREAKER_THRESHOLD: z.coerce
    .number()
    .default(5)
    .describe('Failure threshold for AI circuit breaker. Default: 5'),
  AI_CIRCUIT_BREAKER_TIMEOUT: z.coerce
    .number()
    .default(60000)
    .describe(
      'Timeout for AI circuit breaker reset (ms). Default: 60000 (1 minute)'
    ),

  // Security Configuration
  HSTS_MAX_AGE: z.coerce
    .number()
    .default(31536000)
    .describe(
      'Max age for HTTP Strict Transport Security header (seconds). Default: 31536000 (1 year)'
    ),
  CSP_NONCE_SIZE: z.coerce
    .number()
    .default(16)
    .describe('Size of the CSP nonce in bytes. Default: 16'),

  // Contact Information
  SUPPORT_EMAIL: z
    .string()
    .email()
    .default('support@govmatch.ai')
    .describe('Support contact email address. Default: support@govmatch.ai'),
  SUPPORT_NAME: z
    .string()
    .default('GovMatch AI Support')
    .describe('Support contact display name. Default: GovMatch AI Support'),

  // Third-party Service URLs
  STRIPE_PUBLISHABLE_KEY_DOMAIN: z
    .string()
    .default('https://js.stripe.com')
    .describe(
      'Stripe.js domain for loading Stripe scripts. Default: https://js.stripe.com'
    ),
  CLERK_FRONTEND_API: z
    .string()
    .default('https://api.clerk.dev')
    .describe('Clerk frontend API base URL. Default: https://api.clerk.dev'),
  CAPTCHA_DOMAINS: z
    .string()
    .default(
      'https://www.google.com,https://www.gstatic.com,https://hcaptcha.com,https://assets.hcaptcha.com'
    )
    .describe(
      'Comma-separated list of allowed CAPTCHA domains. Default: https://www.google.com,https://www.gstatic.com,https://hcaptcha.com,https://assets.hcaptcha.com'
    ),

  // Supabase Configuration (Optional)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .optional()
    .describe('Supabase project URL (optional).'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .optional()
    .describe('Supabase anon/public API key (optional).'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional()
    .describe('Supabase service role key for server-side operations. Bypasses RLS policies. Used for file uploads, admin operations, and background jobs.'),

  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .optional()
    .describe('Stripe publishable key (optional).'),
  STRIPE_SECRET_KEY: z
    .string()
    .optional()
    .describe('Stripe secret key (optional).'),

  // Performance Configuration
  API_TIMEOUT: z.coerce
    .number()
    .default(30000)
    .describe(
      'Default API request timeout in milliseconds. Default: 30000 (30 seconds)'
    ),
  DATABASE_TIMEOUT: z.coerce
    .number()
    .default(10000)
    .describe(
      'Default database query timeout in milliseconds. Default: 10000 (10 seconds)'
    ),
  CACHE_TIMEOUT: z.coerce
    .number()
    .default(5000)
    .describe(
      'Default cache operation timeout in milliseconds. Default: 5000 (5 seconds)'
    ),

  // Vector Database Configuration
  PINECONE_API_KEY: z
    .string()
    .optional()
    .describe(
      'API key for Pinecone vector database. Used for primary vector search and document embeddings. Required for vector search functionality.'
    ),
  PINECONE_ENVIRONMENT: z
    .string()
    .default('us-east-1')
    .describe(
      'Pinecone environment/region. Used for Pinecone index connections. Default: us-east-1'
    ),
  PINECONE_INDEX_NAME: z
    .string()
    .default('govmatch-ai-2')
    .describe(
      'Name of the Pinecone index for vector storage. Used for all vector search operations. Default: govmatch-ai-2'
    ),
  PGVECTOR_CONNECTION_STRING: z
    .string()
    .optional()
    .describe(
      'PostgreSQL connection string for pgvector fallback. Used when Pinecone is unavailable. Falls back to DATABASE_URL if not specified.'
    ),
  PGVECTOR_TABLE_NAME: z
    .string()
    .default('document_vectors')
    .describe(
      'Table name for pgvector storage. Used for fallback vector operations. Default: document_vectors'
    ),
  ENABLE_PGVECTOR_FALLBACK: z.coerce
    .boolean()
    .default(true)
    .describe(
      'Enable pgvector as fallback when Pinecone is unavailable. Provides high availability for vector search. Default: true'
    ),

  // Node Environment
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development')
    .describe(
      'Node.js environment (development, test, production). Default: development'
    ),
})

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Validate environment variables
function validateEnv() {
  // Skip validation in browser environment - these are server-side variables
  if (isBrowser) {
    console.warn('⚠️  Skipping environment validation in browser')
    // Return a minimal config for browser with only public variables
    return {
      // Only include NEXT_PUBLIC_ variables and defaults for browser
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard',
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/onboarding',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      NODE_ENV: 'development',
      // Provide safe defaults for all other values
      DATABASE_URL: '',
      CLERK_SECRET_KEY: '',
      CLERK_WEBHOOK_SECRET: '',
      DATABASE_TIMEOUT: 30000,
      INTERNAL_API_KEY: '',
      CRON_SECRET: '',
      JWT_SECRET: '',
      NEXTAUTH_SECRET: '',
      NEXTAUTH_URL: '',
      LITELLM_BASE_URL: '',
      LITELLM_MASTER_KEY: '',
      LITELLM_API_KEY: '',
      LITELLM_UI_USERNAME: '',
      LITELLM_UI_PASSWORD: '',
      LITELLM_DATABASE_URL: '',
      OPENAI_API_KEY: '',
      OPENAI_ORGANIZATION_ID: '',
      OPENAI_REQUESTS_PER_MINUTE: 60,
      OPENAI_TOKENS_PER_MINUTE: 100000,
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_REQUESTS_PER_MINUTE: 60,
      ANTHROPIC_TOKENS_PER_MINUTE: 100000,
      GOOGLE_AI_API_KEY: '',
      GOOGLE_AI_PROJECT_ID: '',
      GOOGLE_AI_LOCATION: 'us-central1',
      GOOGLE_AI_REQUESTS_PER_MINUTE: 60,
      GOOGLE_AI_TOKENS_PER_MINUTE: 100000,
      AZURE_OPENAI_API_KEY: '',
      AZURE_OPENAI_ENDPOINT: '',
      AZURE_OPENAI_API_VERSION: '2024-02-01',
      AZURE_OPENAI_DEPLOYMENT_NAME: '',
      AZURE_OPENAI_REQUESTS_PER_MINUTE: 60,
      AZURE_OPENAI_TOKENS_PER_MINUTE: 100000,
      OPENROUTER_API_KEY: '',
      OPENROUTER_APP_NAME: 'govmatch-ai',
      OPENROUTER_SITE_URL: '',
      OPENROUTER_SMART_ROUTING: true,
      OPENROUTER_COST_OPTIMIZATION: true,
      OPENROUTER_FALLBACK_STRATEGY: 'balanced',
      OPENROUTER_REQUESTS_PER_MINUTE: 60,
      OPENROUTER_TOKENS_PER_MINUTE: 100000,
      AI_DEFAULT_TIMEOUT: 30000,
      AI_MAX_CONCURRENT_REQUESTS: 10,
      AI_DAILY_COST_LIMIT: 100,
      AI_MONTHLY_COST_LIMIT: 3000,
      AI_PER_REQUEST_COST_LIMIT: 1,
      AI_RETRY_ATTEMPTS: 3,
      AI_RETRY_DELAY: 1000,
      PINECONE_API_KEY: '',
      PINECONE_ENVIRONMENT: 'us-east1-gcp',
      PINECONE_INDEX_NAME: 'govmatch-embeddings',
      PGVECTOR_CONNECTION_STRING: '',
      PGVECTOR_TABLE_NAME: 'embeddings',
      RATE_LIMIT_WINDOW: 60000,
      RATE_LIMIT_MAX_REQUESTS: 60,
      RATE_LIMIT_BURST_SIZE: 10,
      RATE_LIMIT_CONCURRENT_REQUESTS: 5,
      RATE_LIMIT_COOLDOWN_PERIOD: 300000,
      RATE_LIMIT_BLACKLIST_THRESHOLD: 10,
      RATE_LIMIT_WHITELIST_IPS: '',
      RATE_LIMIT_BYPASS_TOKENS: '',
      ERROR_RETRY_ATTEMPTS: 3,
      ERROR_RETRY_DELAY: 1000,
      ERROR_RETRY_MAX_DELAY: 30000,
      ERROR_RETRY_BACKOFF_FACTOR: 2,
      ERROR_CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5,
      ERROR_CIRCUIT_BREAKER_RESET_TIMEOUT: 60000,
      ERROR_CIRCUIT_BREAKER_MONITOR_PERIOD: 300000,
      ERROR_CIRCUIT_BREAKER_SUCCESS_THRESHOLD: 3,
      ERROR_CIRCUIT_BREAKER_TIMEOUT: 10000,
      ERROR_PATTERN_RECOGNITION_THRESHOLD: 3,
      ERROR_PATTERN_SIMILARITY_THRESHOLD: 0.8,
      ERROR_PATTERN_TIME_WINDOW: 3600000,
      ERROR_PATTERN_BURST_THRESHOLD: 10,
      ERROR_PATTERN_CORRELATION_WINDOW: 300000,
      ERROR_BATCH_SIZE: 100,
      ERROR_BATCH_TIMEOUT: 5000,
      ERROR_FLUSH_INTERVAL: 60000,
      ERROR_MAX_BATCH_RETRIES: 3,
      ERROR_BATCH_RETRY_DELAY: 1000,
      ERROR_REPORTING_ENABLE_ERROR_TRACKING: true,
      ERROR_REPORTING_ENABLE_ANALYTICS: true,
      ERROR_REPORTING_ENABLE_METRICS: true,
      ERROR_REPORTING_SAMPLING_RATE: 1,
      ERROR_REPORTING_USER_TRACKING: true,
      ERROR_CACHE_TTL: 300000,
      ERROR_CACHE_MAX_SIZE: 1000,
      ERROR_CACHE_CLEANUP_INTERVAL: 600000,
      ERROR_CACHE_BYPASS_ON_ERROR: true,
      ERROR_MONITORING_ALERT_EMAIL: '',
      ERROR_MONITORING_ALERT_WEBHOOK: '',
      ERROR_MONITORING_ALERT_CHANNEL: '',
      ERROR_MONITORING_ALERT_THRESHOLD: 10,
      ERROR_MONITORING_ALERT_WINDOW: 300000,
      ERROR_AGGREGATION_INTERVAL: 300000,
      ERROR_AGGREGATION_MIN_COUNT: 5,
      ERROR_AGGREGATION_GROUP_BY_FIELDS: 'category,severity,source',
      ERROR_AGGREGATION_INCLUDE_STACK_TRACE: true,
      ERROR_AGGREGATION_MAX_GROUPS: 100,
      REDIS_URL: '',
      REDIS_TOKEN: '',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: '',
      REDIS_MAX_RETRIES: 3,
      REDIS_RETRY_DELAY: 100,
      REDIS_CONNECTION_TIMEOUT: 5000,
      REDIS_COMMAND_TIMEOUT: 5000,
      REDIS_ENABLE_OFFLINE_QUEUE: true,
      REDIS_MEMORY_CACHE_CLEANUP_INTERVAL: 60000,
      SECURITY_HSTS_MAX_AGE: 31536000,
      SECURITY_CSP_NONCE_SIZE: 16,
      SECURITY_WEBHOOK_URL: '',
      SECURITY_WEBHOOK_TOKEN: '',
      SECURITY_ALERT_EMAIL: '',
      SECURITY_SLACK_WEBHOOK: '',
      STRIPE_SECRET_KEY: '',
      STRIPE_PUBLISHABLE_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      STRIPE_PUBLISHABLE_KEY_DOMAIN: 'https://js.stripe.com',
      STRIPE_FREE_PLAN_PRICE_ID: '',
      STRIPE_STARTER_PLAN_PRICE_ID: '',
      STRIPE_PROFESSIONAL_PLAN_PRICE_ID: '',
      STRIPE_ENTERPRISE_PLAN_PRICE_ID: '',
      SAM_API_KEY: '',
      SAM_API_BASE_URL: 'https://api.sam.gov',
      SAM_API_TIMEOUT: 30000,
      SAM_API_RATE_LIMIT: 1000,
      SAM_API_CACHE_TTL: 3600,
      SAM_API_RETRY_ATTEMPTS: 3,
      SAM_API_RETRY_DELAY: 1000,
      HIGHERGOV_API_KEY: '',
      HIGHERGOV_API_BASE_URL: 'https://api.highergov.com',
      HIGHERGOV_API_TIMEOUT: 30000,
      HIGHERGOV_API_RATE_LIMIT: 100,
      HIGHERGOV_API_CACHE_TTL: 1800,
      HIGHERGOV_API_RETRY_ATTEMPTS: 3,
      HIGHERGOV_API_RETRY_DELAY: 1000,
      CLERK_FRONTEND_API: 'https://clerk.dev',
      CAPTCHA_DOMAINS: 'https://www.google.com,https://www.gstatic.com,https://www.recaptcha.net,https://hcaptcha.com,https://*.hcaptcha.com',
    } as any
  }

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format())

    // In development and build time, log the error but don't crash
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
      console.warn(
        '⚠️  Environment validation failed, using environment variables as-is'
      )
      // Return environment variables as-is with defaults
      return envSchema.parse({
        ...process.env,
        DATABASE_URL:
          process.env.DATABASE_URL ||
          'postgresql://postgres:password@localhost:5432/govmatch_dev',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
          'pk_test_development',
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_development',
      })
    }

    throw new Error('Environment validation failed')
  }

  return result.data
}

// Export typed configuration
export const env = validateEnv()

// Export configuration categories for better organization
export const database = {
  url: env.DATABASE_URL,
  timeout: env.DATABASE_TIMEOUT,
} as const

export const auth = {
  clerkPublishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  clerkSecretKey: env.CLERK_SECRET_KEY,
  clerkWebhookSecret: env.CLERK_WEBHOOK_SECRET,
  internalApiKey: env.INTERNAL_API_KEY,
  cronSecret: env.CRON_SECRET,
  jwtSecret: env.JWT_SECRET,
  nextAuthSecret: env.NEXTAUTH_SECRET,
  nextAuthUrl: env.NEXTAUTH_URL,
} as const

export const ai = {
  litellmBaseUrl: env.LITELLM_BASE_URL,
  litellmMasterKey: env.LITELLM_MASTER_KEY,
  litellmApiKey: env.LITELLM_API_KEY,
  litellmUiUsername: env.LITELLM_UI_USERNAME,
  litellmUiPassword: env.LITELLM_UI_PASSWORD,
  litellmDatabaseUrl: env.LITELLM_DATABASE_URL,
  openaiApiKey: env.OPENAI_API_KEY,
  openaiOrganizationId: env.OPENAI_ORGANIZATION_ID,
  openaiRequestsPerMinute: env.OPENAI_REQUESTS_PER_MINUTE,
  openaiTokensPerMinute: env.OPENAI_TOKENS_PER_MINUTE,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  anthropicRequestsPerMinute: env.ANTHROPIC_REQUESTS_PER_MINUTE,
  anthropicTokensPerMinute: env.ANTHROPIC_TOKENS_PER_MINUTE,
  googleAiApiKey: env.GOOGLE_AI_API_KEY,
  googleAiProjectId: env.GOOGLE_AI_PROJECT_ID,
  googleAiLocation: env.GOOGLE_AI_LOCATION,
  googleAiRequestsPerMinute: env.GOOGLE_AI_REQUESTS_PER_MINUTE,
  googleAiTokensPerMinute: env.GOOGLE_AI_TOKENS_PER_MINUTE,
  azureOpenaiApiKey: env.AZURE_OPENAI_API_KEY,
  azureOpenaiEndpoint: env.AZURE_OPENAI_ENDPOINT,
  azureOpenaiApiVersion: env.AZURE_OPENAI_API_VERSION,
  azureOpenaiDeploymentName: env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenaiRequestsPerMinute: env.AZURE_OPENAI_REQUESTS_PER_MINUTE,
  azureOpenaiTokensPerMinute: env.AZURE_OPENAI_TOKENS_PER_MINUTE,
  openrouterApiKey: env.OPENROUTER_API_KEY,
  openrouterAppName: env.OPENROUTER_APP_NAME,
  openrouterSiteUrl: env.OPENROUTER_SITE_URL,
  openrouterSmartRouting: env.OPENROUTER_SMART_ROUTING,
  openrouterCostOptimization: env.OPENROUTER_COST_OPTIMIZATION,
  openrouterFallbackStrategy: env.OPENROUTER_FALLBACK_STRATEGY,
  openrouterRequestsPerMinute: env.OPENROUTER_REQUESTS_PER_MINUTE,
  openrouterTokensPerMinute: env.OPENROUTER_TOKENS_PER_MINUTE,
  openrouterPromptCacheEnabled: env.OPENROUTER_PROMPT_CACHE_ENABLED,
  openrouterPromptCacheTtl: env.OPENROUTER_PROMPT_CACHE_TTL,
  openrouterPromptCacheMinTokens: env.OPENROUTER_PROMPT_CACHE_MIN_TOKENS,
  openrouterCacheBreakpointStrategy: env.OPENROUTER_CACHE_BREAKPOINT_STRATEGY,
  defaultTimeout: env.AI_DEFAULT_TIMEOUT,
  maxConcurrentRequests: env.AI_MAX_CONCURRENT_REQUESTS,
  dailyCostLimit: env.AI_DAILY_COST_LIMIT,
  monthlyCostLimit: env.AI_MONTHLY_COST_LIMIT,
  perRequestCostLimit: env.AI_PER_REQUEST_COST_LIMIT,
  retryAttempts: env.AI_RETRY_ATTEMPTS,
  retryDelay: env.AI_RETRY_DELAY,
  
  // Model Configuration
  modelFast: env.AI_MODEL_FAST,
  modelBalanced: env.AI_MODEL_BALANCED,
  modelPowerful: env.AI_MODEL_POWERFUL,
  defaultModel: env.AI_DEFAULT_MODEL,
  maxTokens: env.AI_MAX_TOKENS,
  
  // Performance Limits
  maxLatencyFast: env.AI_MAX_LATENCY_FAST,
  maxLatencyBalanced: env.AI_MAX_LATENCY_BALANCED,
  maxLatencyPowerful: env.AI_MAX_LATENCY_POWERFUL,
  performanceAlertThreshold: env.AI_PERFORMANCE_ALERT_THRESHOLD,
  circuitBreakerThreshold: env.AI_CIRCUIT_BREAKER_THRESHOLD,
  circuitBreakerTimeout: env.AI_CIRCUIT_BREAKER_TIMEOUT,
  
  // Feature Flags
  featureSmartRouting: env.AI_FEATURE_SMART_ROUTING,
  featureCostOptimization: env.AI_FEATURE_COST_OPTIMIZATION,
  featurePerformanceMonitoring: env.AI_FEATURE_PERFORMANCE_MONITORING,
} as const

export const imageRouter = {
  apiKey: env.IMAGEROUTER_API_KEY,
  baseUrl: env.IMAGEROUTER_BASE_URL,
  timeout: env.IMAGEROUTER_TIMEOUT,
  maxRetries: env.IMAGEROUTER_MAX_RETRIES,
  retryDelay: env.IMAGEROUTER_RETRY_DELAY,
  rateLimit: {
    requestsPerMinute: env.IMAGEROUTER_RATE_LIMIT_REQUESTS_PER_MINUTE,
  },
  costOptimization: env.IMAGEROUTER_COST_OPTIMIZATION,
  defaultModels: {
    image: env.IMAGEROUTER_DEFAULT_IMAGE_MODEL,
    video: env.IMAGEROUTER_DEFAULT_VIDEO_MODEL,
  },
  defaultQuality: env.IMAGEROUTER_DEFAULT_QUALITY,
  defaultResponseFormat: env.IMAGEROUTER_DEFAULT_RESPONSE_FORMAT,
  caching: {
    enabled: env.IMAGEROUTER_ENABLE_CACHING,
    ttl: env.IMAGEROUTER_CACHE_TTL,
  },
} as const

export const app = {
  url: env.NEXT_PUBLIC_APP_URL,
  apiUrl: env.NEXT_PUBLIC_API_URL,
  nodeEnv: env.NODE_ENV,
  apiTimeout: env.API_TIMEOUT,
} as const

export const redis = {
  url: env.UPSTASH_REDIS_REST_URL || env.REDIS_FALLBACK_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN || env.REDIS_FALLBACK_TOKEN,
  connectionTimeout: env.REDIS_CONNECTION_TIMEOUT,
  commandTimeout: env.REDIS_COMMAND_TIMEOUT,
  maxRetries: env.REDIS_MAX_RETRIES,
  retryDelay: env.REDIS_RETRY_DELAY,
  keepAlive: env.REDIS_KEEP_ALIVE,
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  db: env.REDIS_DB,
  memoryCacheCleanupInterval: env.MEMORY_CACHE_CLEANUP_INTERVAL,
} as const

export const cache = {
  ttl: {
    short: env.CACHE_TTL_SHORT,
    medium: env.CACHE_TTL_MEDIUM,
    long: env.CACHE_TTL_LONG,
    day: env.CACHE_TTL_DAY,
    week: env.CACHE_TTL_WEEK,
  },
  pricingTtl: env.PRICING_CACHE_TTL,
  timeout: env.CACHE_TIMEOUT,
  defaultTtl: env.CACHE_DEFAULT_TTL,
  healthCheckInterval: env.CACHE_HEALTH_CHECK_INTERVAL,
} as const

export const circuitBreaker = {
  recoveryTimeout: env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT,
  failureThreshold: env.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
} as const

export const rateLimit = {
  matchScores: {
    window: env.RATE_LIMIT_MATCH_SCORES_WINDOW,
    max: env.RATE_LIMIT_MATCH_SCORES_MAX,
  },
  search: {
    window: env.RATE_LIMIT_SEARCH_WINDOW,
    max: env.RATE_LIMIT_SEARCH_MAX,
  },
  ai: {
    window: env.RATE_LIMIT_AI_WINDOW,
    max: env.RATE_LIMIT_AI_MAX,
  },
  api: {
    window: env.RATE_LIMIT_API_WINDOW,
    max: env.RATE_LIMIT_API_MAX,
  },
  upload: {
    window: env.RATE_LIMIT_UPLOAD_WINDOW,
    max: env.RATE_LIMIT_UPLOAD_MAX,
  },
} as const

export const fileUpload = {
  maxSize: env.MAX_FILE_UPLOAD_SIZE,
  defaultPageSize: env.DEFAULT_PAGE_SIZE,
  maxPageSize: env.MAX_PAGE_SIZE,
} as const

export const billing = {
  costPerApiCall: env.BILLING_COST_PER_API_CALL,
  costPerCacheHit: env.BILLING_COST_PER_CACHE_HIT,
  costPerAiCall: env.BILLING_COST_PER_AI_CALL,
} as const

export const security = {
  hstsMaxAge: env.HSTS_MAX_AGE,
  cspNonceSize: env.CSP_NONCE_SIZE,
  webhookUrl: env.SECURITY_WEBHOOK_URL,
  webhookToken: env.SECURITY_WEBHOOK_TOKEN,
  alertEmail: env.SECURITY_ALERT_EMAIL,
  slackWebhook: env.SECURITY_SLACK_WEBHOOK,
} as const

export const contact = {
  supportEmail: env.SUPPORT_EMAIL,
  supportName: env.SUPPORT_NAME,
} as const

export const thirdParty = {
  stripePublishableKeyDomain: env.STRIPE_PUBLISHABLE_KEY_DOMAIN,
  clerkFrontendApi: env.CLERK_FRONTEND_API,
  captchaDomains: env.CAPTCHA_DOMAINS.split(','),
} as const

export const supabase = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
} as const

export const stripe = {
  publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  secretKey: env.STRIPE_SECRET_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  priceIdBasic: env.STRIPE_PRICE_ID_BASIC,
  priceIdPro: env.STRIPE_PRICE_ID_PRO,
  priceIdEnterprise: env.STRIPE_PRICE_ID_ENTERPRISE,
  priceStarter: env.STRIPE_PRICE_STARTER,
  priceProfessional: env.STRIPE_PRICE_PROFESSIONAL,
  priceAgency: env.STRIPE_PRICE_AGENCY,
} as const

export const webhooks = {
  salesInquirySecret: env.WEBHOOK_SECRET_SALES_INQUIRY,
  formSubmissionSecret: env.WEBHOOK_SECRET_FORM_SUBMISSION,
  salesInquiryUrl: env.SALES_INQUIRY_WEBHOOK_URL,
  salesInquiryWebhookSecret: env.SALES_INQUIRY_WEBHOOK_SECRET,
} as const

export const api = {
  govmatchApiKey: env.GOVMATCH_API_KEY,
  baseUrl: env.NEXT_PUBLIC_BASE_URL,
} as const

export const testing = {
  databaseUrl: env.TEST_DATABASE_URL,
  redisUrl: env.TEST_REDIS_URL,
  mockAiResponses: env.MOCK_AI_RESPONSES,
  enableDebugLogging: env.ENABLE_DEBUG_LOGGING,
} as const

export const development = {
  developerEmail: env.DEVELOPER_EMAIL,
} as const

export const vectorDatabase = {
  pinecone: {
    apiKey: env.PINECONE_API_KEY,
    environment: env.PINECONE_ENVIRONMENT,
    indexName: env.PINECONE_INDEX_NAME,
  },
  pgvector: {
    connectionString: env.PGVECTOR_CONNECTION_STRING,
    tableName: env.PGVECTOR_TABLE_NAME,
    fallbackEnabled: env.ENABLE_PGVECTOR_FALLBACK,
  },
} as const

export const errorConfig = {
  circuitBreaker: {
    failureThreshold: env.ERROR_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    recoveryTimeout: env.ERROR_CIRCUIT_BREAKER_RECOVERY_TIMEOUT,
    monitoringWindow: env.ERROR_CIRCUIT_BREAKER_MONITORING_WINDOW,
    expectedErrorRate: env.ERROR_CIRCUIT_BREAKER_ERROR_RATE,
    halfOpenMaxCalls: env.ERROR_CIRCUIT_BREAKER_HALF_OPEN_CALLS,
  },
  notifications: {
    maxPerMinute: env.ERROR_NOTIFICATIONS_MAX_PER_MINUTE,
    cooldownPeriod: env.ERROR_NOTIFICATIONS_COOLDOWN,
    persistentSeverities: env.ERROR_NOTIFICATIONS_PERSISTENT_SEVERITIES,
  },
  retry: {
    maxAttempts: env.ERROR_RETRY_MAX_ATTEMPTS,
    baseDelay: env.ERROR_RETRY_BASE_DELAY,
    maxDelay: env.ERROR_RETRY_MAX_DELAY,
    jitterFactor: env.ERROR_RETRY_JITTER_FACTOR,
  },
  recovery: {
    maxRetries: env.ERROR_RECOVERY_MAX_RETRIES,
    recoveryTimeout: env.ERROR_RECOVERY_TIMEOUT,
    healthCheckInterval: env.ERROR_RECOVERY_HEALTH_CHECK_INTERVAL,
    enableAutoRecovery: env.ERROR_RECOVERY_ENABLE_AUTO,
  },
  patterns: {
    correlationWindow: env.ERROR_PATTERNS_CORRELATION_WINDOW,
    burstThreshold: env.ERROR_PATTERNS_BURST_THRESHOLD,
    cascadeTimeout: env.ERROR_PATTERNS_CASCADE_TIMEOUT,
    trendAnalysisWindow: env.ERROR_PATTERNS_TREND_WINDOW,
  },
  health: {
    criticalThreshold: env.ERROR_HEALTH_CRITICAL_THRESHOLD,
    warningThreshold: env.ERROR_HEALTH_WARNING_THRESHOLD,
    healthCheckInterval: env.ERROR_HEALTH_CHECK_INTERVAL,
    historyRetention: env.ERROR_HEALTH_HISTORY_RETENTION,
  },
  aiServices: {
    timeoutMs: env.ERROR_AI_TIMEOUT_MS,
    rateLimitWindow: env.ERROR_AI_RATE_LIMIT_WINDOW,
    costThresholdWarning: env.ERROR_AI_COST_WARNING,
    costThresholdCritical: env.ERROR_AI_COST_CRITICAL,
    fallbackDelay: env.ERROR_AI_FALLBACK_DELAY,
  },
  reporting: {
    enableErrorTracking: env.ERROR_REPORTING_TRACKING,
    enableMetrics: env.ERROR_REPORTING_METRICS,
    enableAnalytics: env.ERROR_REPORTING_ANALYTICS,
    batchSize: env.ERROR_REPORTING_BATCH_SIZE,
    flushInterval: env.ERROR_REPORTING_FLUSH_INTERVAL,
  },
  development: {
    enableConsoleLogging: env.ERROR_DEV_CONSOLE,
    enableDetailedErrors: env.ERROR_DEV_DETAILED,
    enableMockErrors: env.ERROR_DEV_MOCK_ERRORS,
    verboseLogging: env.ERROR_DEV_VERBOSE,
  },
} as const

// Development helper to check if required environment variables are set
export function checkRequiredEnvVars() {
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ]

  const missing = requiredVars.filter((varName) => !process.env[varName])

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing)
    return false
  }

  return true
}
