'use client';

import React, { useState, useEffect } from 'react';
import { useAI, useAIFeatures, useAIUsage, useAIModels } from '@/stores/document-chat-store';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelSelectionModal } from './model-selection-modal';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Zap, 
  DollarSign, 
  Activity, 
  RefreshCw, 
  Sparkles,
  BarChart3,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface AISettingsPanelProps {
  className?: string;
}

export function AISettingsPanel({ className }: AISettingsPanelProps) {
  const ai = useAI();
  const features = useAIFeatures();
  const usage = useAIUsage();
  const models = useAIModels();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [modalMode, setModalMode] = useState<'text' | 'media'>('text');

  // Calculate usage percentages (assuming limits)
  const tokenLimit = 50000; // Example limit
  const costLimit = 10.0; // Example limit
  const requestLimit = 1000; // Example limit

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatTokens = (tokens: number) => tokens.toLocaleString();


  const handleFeatureToggle = (feature: keyof typeof features, enabled: boolean) => {
    ai.toggleFeature(feature, enabled);
  };

  const handleModelSelect = (modelId: string) => {
    ai.setSelectedModel(modelId);
  };

  const handleForceRefreshModels = async () => {
    await ai.forceRefreshModels();
  };

  const handleResetUsage = () => {
    ai.resetUsage();
  };

  return (
    <div className={className}>
      <div className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Settings className="h-5 w-5" />
            AI Settings
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Error Display */}
        {ai.error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{ai.error}</AlertDescription>
          </Alert>
        )}

        {/* Model Selection */}
        <div className="space-y-2">
          <Label>Selected Model</Label>
          <div className="flex gap-2">
            <ModelSelectionModal
              selectedProvider="openrouter"
              selectedModel={ai.selectedModel || ''}
              onModelSelect={handleModelSelect}
              mode={modalMode}
              onModeChange={setModalMode}
              trigger={
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {ai.selectedModel ? 
                      models.find(m => m.name === ai.selectedModel)?.displayName || ai.selectedModel :
                      'Select a model'
                    }
                  </span>
                  <div className="flex items-center gap-2">
                    {ai.selectedModel && (
                      <Badge variant={
                        models.find(m => m.name === ai.selectedModel)?.tier === 'powerful' ? 'default' : 'secondary'
                      }>
                        {models.find(m => m.name === ai.selectedModel)?.tier || 'unknown'}
                      </Badge>
                    )}
                  </div>
                </Button>
              }
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleForceRefreshModels}
              disabled={ai.loading}
              title="Refresh models"
            >
              <RefreshCw className={`h-4 w-4 ${ai.loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Core Features */}
        <div className="space-y-3">
          <Label>Core Features</Label>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">OpenRouter Integration</span>
            </div>
            <Switch
              checked={features.openRouterEnabled}
              onCheckedChange={(checked) => handleFeatureToggle('openRouterEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Cost Optimization</span>
            </div>
            <Switch
              checked={features.costOptimization}
              onCheckedChange={(checked) => handleFeatureToggle('costOptimization', checked)}
              disabled={!features.openRouterEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Real-time Metrics</span>
            </div>
            <Switch
              checked={features.realTimeMetrics}
              onCheckedChange={(checked) => handleFeatureToggle('realTimeMetrics', checked)}
              disabled={!features.openRouterEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Advanced Settings</span>
            </div>
            <Switch
              checked={features.advancedSettings}
              onCheckedChange={(checked) => handleFeatureToggle('advancedSettings', checked)}
            />
          </div>
        </div>

        {isExpanded && (
          <>
            <Separator />
            
            {/* Usage Statistics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Usage Statistics</Label>
                <Button variant="outline" size="sm" onClick={handleResetUsage}>
                  Reset
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Tokens</span>
                  </div>
                  <div className="text-sm font-medium">{formatTokens(usage.tokensUsed)}</div>
                  <Progress value={(usage.tokensUsed / tokenLimit) * 100} className="h-1" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">Cost</span>
                  </div>
                  <div className="text-sm font-medium">{formatCost(usage.totalCost)}</div>
                  <Progress value={(usage.totalCost / costLimit) * 100} className="h-1" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Requests</span>
                  </div>
                  <div className="text-sm font-medium">{usage.requestsCount}</div>
                  <Progress value={(usage.requestsCount / requestLimit) * 100} className="h-1" />
                </div>
              </div>
            </div>


          </>
        )}
      </div>
    </div>
  );
}