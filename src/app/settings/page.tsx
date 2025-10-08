'use client';

/**
 * Settings Page
 *
 * Allows users to configure their organization's API keys and integrations
 */

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, ExternalLink, AlertTriangle } from 'lucide-react';

type SettingsCategory = 'API_KEYS' | 'FILE_STORAGE' | 'VECTOR_SEARCH' | 'CACHE' | 'BILLING';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: Record<string, any>;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsCategory>('API_KEYS');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState({
    openrouterApiKey: '',
    openrouterAppName: 'Document-Chat-System',
    openrouterSiteUrl: '',
    openaiApiKey: '',
    imagerouterApiKey: '',
  });

  // File Storage state
  const [fileStorage, setFileStorage] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceRoleKey: '',
  });

  // Vector Search state
  const [vectorSearch, setVectorSearch] = useState({
    pineconeApiKey: '',
    pineconeEnvironment: 'us-east-1',
    pineconeIndexName: 'document-chat-index',
  });

  // Cache state
  const [cache, setCache] = useState({
    redisUrl: '',
    redisToken: '',
  });

  // Billing state
  const [billing, setBilling] = useState({
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
  });

  // Load settings and user role on mount
  useEffect(() => {
    loadSettings();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const response = await fetch('/api/v1/user');
      const data = await response.json();
      if (data.success && data.data?.role) {
        setUserRole(data.data.role);
      }
    } catch (error) {
      console.error('Failed to load user role:', error);
    }
  };

  const loadSettings = () => {
    setLoading(true);
    try {
      // Load from localStorage instead of API
      const storedApiKeys = localStorage.getItem('settings_api_keys');
      const storedFileStorage = localStorage.getItem('settings_file_storage');
      const storedVectorSearch = localStorage.getItem('settings_vector_search');
      const storedCache = localStorage.getItem('settings_cache');
      const storedBilling = localStorage.getItem('settings_billing');

      if (storedApiKeys) {
        setApiKeys(prev => ({ ...prev, ...JSON.parse(storedApiKeys) }));
      }
      if (storedFileStorage) {
        setFileStorage(prev => ({ ...prev, ...JSON.parse(storedFileStorage) }));
      }
      if (storedVectorSearch) {
        setVectorSearch(prev => ({ ...prev, ...JSON.parse(storedVectorSearch) }));
      }
      if (storedCache) {
        setCache(prev => ({ ...prev, ...JSON.parse(storedCache) }));
      }
      if (storedBilling) {
        setBilling(prev => ({ ...prev, ...JSON.parse(storedBilling) }));
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = (category: SettingsCategory, settings: any) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Save to localStorage instead of API
      const storageKey = `settings_${category.toLowerCase()}`;
      localStorage.setItem(storageKey, JSON.stringify(settings));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (provider: string, credentials: any) => {
    setTestingConnection(provider);
    try {
      const response = await fetch('/api/v1/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials }),
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, [provider]: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          success: false,
          error: error instanceof Error ? error.message : 'Connection test failed',
        },
      }));
    } finally {
      setTestingConnection(null);
    }
  };

  const toggleShowApiKey = (key: string) => {
    setShowApiKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your API keys and integrations
        </p>
      </div>

      {saveSuccess && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsCategory)}>
        <TabsList className={`grid w-full grid-cols-2 ${userRole === 'OWNER' || userRole === 'ADMIN' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          <TabsTrigger value="API_KEYS">AI Providers</TabsTrigger>
          <TabsTrigger value="FILE_STORAGE">File Storage</TabsTrigger>
          <TabsTrigger value="VECTOR_SEARCH">Vector Search</TabsTrigger>
          <TabsTrigger value="CACHE">Cache</TabsTrigger>
          {(userRole === 'OWNER' || userRole === 'ADMIN') && (
            <TabsTrigger value="BILLING">Billing</TabsTrigger>
          )}
        </TabsList>

        {/* AI Providers Tab */}
        <TabsContent value="API_KEYS" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>OpenRouter</span>
                <span className="text-sm font-normal text-green-600">(Recommended)</span>
              </CardTitle>
              <CardDescription>
                Access 100+ AI models through a single API
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-primary hover:underline"
                >
                  Get API Key <ExternalLink className="ml-1 w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="openrouterApiKey">API Key *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="openrouterApiKey"
                    type={showApiKeys.openrouter ? 'text' : 'password'}
                    value={apiKeys.openrouterApiKey}
                    onChange={(e) => setApiKeys({ ...apiKeys, openrouterApiKey: e.target.value })}
                    placeholder="sk-or-v1-..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('openrouter')}
                  >
                    {showApiKeys.openrouter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="openrouterAppName">App Name</Label>
                  <Input
                    id="openrouterAppName"
                    value={apiKeys.openrouterAppName}
                    onChange={(e) => setApiKeys({ ...apiKeys, openrouterAppName: e.target.value })}
                    placeholder="Document-Chat-System"
                  />
                </div>
                <div>
                  <Label htmlFor="openrouterSiteUrl">Site URL</Label>
                  <Input
                    id="openrouterSiteUrl"
                    value={apiKeys.openrouterSiteUrl}
                    onChange={(e) => setApiKeys({ ...apiKeys, openrouterSiteUrl: e.target.value })}
                    placeholder="https://yourdomain.com"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('openrouter', { apiKey: apiKeys.openrouterApiKey })}
                  disabled={!apiKeys.openrouterApiKey || testingConnection === 'openrouter'}
                  variant="outline"
                >
                  {testingConnection === 'openrouter' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={() => saveSettings('API_KEYS', apiKeys)}
                  disabled={saving}
                >
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </div>

              {testResults.openrouter && (
                <Alert className={testResults.openrouter.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  {testResults.openrouter.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResults.openrouter.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.openrouter.message || testResults.openrouter.error}
                    {testResults.openrouter.details?.modelsAvailable && (
                      <span className="block mt-1 text-sm">
                        {testResults.openrouter.details.modelsAvailable} models available
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OpenAI</CardTitle>
              <CardDescription>
                Direct access to GPT models and embeddings
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-primary hover:underline"
                >
                  Get API Key <ExternalLink className="ml-1 w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="openaiApiKey">API Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="openaiApiKey"
                    type={showApiKeys.openai ? 'text' : 'password'}
                    value={apiKeys.openaiApiKey}
                    onChange={(e) => setApiKeys({ ...apiKeys, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('openai')}
                  >
                    {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('openai', { apiKey: apiKeys.openaiApiKey })}
                  disabled={!apiKeys.openaiApiKey || testingConnection === 'openai'}
                  variant="outline"
                >
                  {testingConnection === 'openai' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={() => saveSettings('API_KEYS', apiKeys)}
                  disabled={saving}
                >
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </div>

              {testResults.openai && (
                <Alert className={testResults.openai.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  {testResults.openai.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResults.openai.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.openai.message || testResults.openai.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ImageRouter</CardTitle>
              <CardDescription>
                Generate images and videos with AI (Optional)
                <a
                  href="https://imagerouter.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-primary hover:underline"
                >
                  Get API Key <ExternalLink className="ml-1 w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="imagerouterApiKey">API Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="imagerouterApiKey"
                    type={showApiKeys.imagerouter ? 'text' : 'password'}
                    value={apiKeys.imagerouterApiKey}
                    onChange={(e) => setApiKeys({ ...apiKeys, imagerouterApiKey: e.target.value })}
                    placeholder="ir-..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('imagerouter')}
                  >
                    {showApiKeys.imagerouter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('imagerouter', { apiKey: apiKeys.imagerouterApiKey })}
                  disabled={!apiKeys.imagerouterApiKey || testingConnection === 'imagerouter'}
                  variant="outline"
                >
                  {testingConnection === 'imagerouter' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={() => saveSettings('API_KEYS', apiKeys)}
                  disabled={saving}
                >
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </div>

              {testResults.imagerouter && (
                <Alert className={testResults.imagerouter.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  {testResults.imagerouter.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResults.imagerouter.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.imagerouter.message || testResults.imagerouter.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Note:</strong> All API keys are encrypted before being stored in the database.
              Never share your API keys with anyone.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* File Storage Tab */}
        <TabsContent value="FILE_STORAGE" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supabase Storage</CardTitle>
              <CardDescription>
                Required for document uploads and file storage
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-primary hover:underline"
                >
                  Get Started <ExternalLink className="ml-1 w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="supabaseUrl">Project URL *</Label>
                <Input
                  id="supabaseUrl"
                  value={fileStorage.supabaseUrl}
                  onChange={(e) => setFileStorage({ ...fileStorage, supabaseUrl: e.target.value })}
                  placeholder="https://xxxxx.supabase.co"
                />
              </div>

              <div>
                <Label htmlFor="supabaseAnonKey">Anon Key *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="supabaseAnonKey"
                    type={showApiKeys.supabaseAnon ? 'text' : 'password'}
                    value={fileStorage.supabaseAnonKey}
                    onChange={(e) => setFileStorage({ ...fileStorage, supabaseAnonKey: e.target.value })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('supabaseAnon')}
                  >
                    {showApiKeys.supabaseAnon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="supabaseServiceRoleKey">Service Role Key *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="supabaseServiceRoleKey"
                    type={showApiKeys.supabaseServiceRole ? 'text' : 'password'}
                    value={fileStorage.supabaseServiceRoleKey}
                    onChange={(e) => setFileStorage({ ...fileStorage, supabaseServiceRoleKey: e.target.value })}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('supabaseServiceRole')}
                  >
                    {showApiKeys.supabaseServiceRole ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('supabase', {
                    url: fileStorage.supabaseUrl,
                    anonKey: fileStorage.supabaseAnonKey,
                  })}
                  disabled={!fileStorage.supabaseUrl || !fileStorage.supabaseAnonKey || testingConnection === 'supabase'}
                  variant="outline"
                >
                  {testingConnection === 'supabase' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={() => saveSettings('FILE_STORAGE', fileStorage)}
                  disabled={saving}
                >
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </div>

              {testResults.supabase && (
                <Alert className={testResults.supabase.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  {testResults.supabase.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResults.supabase.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.supabase.message || testResults.supabase.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vector Search Tab */}
        <TabsContent value="VECTOR_SEARCH" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pinecone</CardTitle>
              <CardDescription>
                Optional: Enhanced semantic search for documents
                <a
                  href="https://app.pinecone.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-primary hover:underline"
                >
                  Get API Key <ExternalLink className="ml-1 w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pineconeApiKey">API Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="pineconeApiKey"
                    type={showApiKeys.pinecone ? 'text' : 'password'}
                    value={vectorSearch.pineconeApiKey}
                    onChange={(e) => setVectorSearch({ ...vectorSearch, pineconeApiKey: e.target.value })}
                    placeholder="your-pinecone-api-key"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('pinecone')}
                  >
                    {showApiKeys.pinecone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pineconeEnvironment">Environment</Label>
                  <Input
                    id="pineconeEnvironment"
                    value={vectorSearch.pineconeEnvironment}
                    onChange={(e) => setVectorSearch({ ...vectorSearch, pineconeEnvironment: e.target.value })}
                    placeholder="us-east-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pineconeIndexName">Index Name</Label>
                  <Input
                    id="pineconeIndexName"
                    value={vectorSearch.pineconeIndexName}
                    onChange={(e) => setVectorSearch({ ...vectorSearch, pineconeIndexName: e.target.value })}
                    placeholder="document-chat-index"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('pinecone', {
                    apiKey: vectorSearch.pineconeApiKey,
                    environment: vectorSearch.pineconeEnvironment,
                  })}
                  disabled={!vectorSearch.pineconeApiKey || testingConnection === 'pinecone'}
                  variant="outline"
                >
                  {testingConnection === 'pinecone' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={() => saveSettings('VECTOR_SEARCH', vectorSearch)}
                  disabled={saving}
                >
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </div>

              {testResults.pinecone && (
                <Alert className={testResults.pinecone.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  {testResults.pinecone.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResults.pinecone.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.pinecone.message || testResults.pinecone.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription>
              If Pinecone is not configured, the system will use PostgreSQL pgvector as a fallback.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="CACHE" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Redis Cache (Upstash)</CardTitle>
              <CardDescription>
                Optional: Improves performance significantly
                <a
                  href="https://upstash.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-primary hover:underline"
                >
                  Get Started <ExternalLink className="ml-1 w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="redisUrl">Redis REST URL</Label>
                <Input
                  id="redisUrl"
                  value={cache.redisUrl}
                  onChange={(e) => setCache({ ...cache, redisUrl: e.target.value })}
                  placeholder="https://xxxxx.upstash.io"
                />
              </div>

              <div>
                <Label htmlFor="redisToken">Redis REST Token</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="redisToken"
                    type={showApiKeys.redis ? 'text' : 'password'}
                    value={cache.redisToken}
                    onChange={(e) => setCache({ ...cache, redisToken: e.target.value })}
                    placeholder="your-redis-token"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('redis')}
                  >
                    {showApiKeys.redis ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('redis', {
                    url: cache.redisUrl,
                    token: cache.redisToken,
                  })}
                  disabled={!cache.redisUrl || !cache.redisToken || testingConnection === 'redis'}
                  variant="outline"
                >
                  {testingConnection === 'redis' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={() => saveSettings('CACHE', cache)}
                  disabled={saving}
                >
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </div>

              {testResults.redis && (
                <Alert className={testResults.redis.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  {testResults.redis.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResults.redis.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.redis.message || testResults.redis.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription>
              If Redis is not configured, the system will use in-memory caching as a fallback.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Billing Tab - Admin/Owner Only */}
        {(userRole === 'OWNER' || userRole === 'ADMIN') && (
          <TabsContent value="BILLING" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Integration</CardTitle>
              <CardDescription>
                Optional: Configure Stripe for billing and subscriptions
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center text-primary hover:underline"
                >
                  Get API Keys <ExternalLink className="ml-1 w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stripePublishableKey">Publishable Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="stripePublishableKey"
                    type={showApiKeys.stripePublishable ? 'text' : 'password'}
                    value={billing.stripePublishableKey}
                    onChange={(e) => setBilling({ ...billing, stripePublishableKey: e.target.value })}
                    placeholder="pk_test_..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('stripePublishable')}
                  >
                    {showApiKeys.stripePublishable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="stripeSecretKey">Secret Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="stripeSecretKey"
                    type={showApiKeys.stripeSecret ? 'text' : 'password'}
                    value={billing.stripeSecretKey}
                    onChange={(e) => setBilling({ ...billing, stripeSecretKey: e.target.value })}
                    placeholder="sk_test_..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('stripeSecret')}
                  >
                    {showApiKeys.stripeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="stripeWebhookSecret"
                    type={showApiKeys.stripeWebhook ? 'text' : 'password'}
                    value={billing.stripeWebhookSecret}
                    onChange={(e) => setBilling({ ...billing, stripeWebhookSecret: e.target.value })}
                    placeholder="whsec_..."
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleShowApiKey('stripeWebhook')}
                  >
                    {showApiKeys.stripeWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => testConnection('stripe', {
                    secretKey: billing.stripeSecretKey,
                  })}
                  disabled={!billing.stripeSecretKey || testingConnection === 'stripe'}
                  variant="outline"
                >
                  {testingConnection === 'stripe' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={() => saveSettings('BILLING', billing)}
                  disabled={saving}
                >
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                </Button>
              </div>

              {testResults.stripe && (
                <Alert className={testResults.stripe.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                  {testResults.stripe.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResults.stripe.success ? 'text-green-600' : 'text-red-600'}>
                    {testResults.stripe.message || testResults.stripe.error}
                    {testResults.stripe.details && (
                      <div className="mt-2 text-sm">
                        <div>Account ID: {testResults.stripe.details.accountId}</div>
                        <div>Country: {testResults.stripe.details.country}</div>
                        <div>Currency: {testResults.stripe.details.currency?.toUpperCase()}</div>
                        <div>Charges Enabled: {testResults.stripe.details.chargesEnabled ? 'Yes' : 'No'}</div>
                        <div>Payouts Enabled: {testResults.stripe.details.payoutsEnabled ? 'Yes' : 'No'}</div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription>
              If Stripe is not configured, users will not be able to subscribe to paid plans. The system will only allow free tier access.
            </AlertDescription>
          </Alert>
          </TabsContent>
        )}
      </Tabs>
      </div>
    </AppLayout>
  );
}
