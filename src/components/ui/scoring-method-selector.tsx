'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calculator, Brain, Zap, Info } from 'lucide-react';

interface ScoringMethodSelectorProps {
  value: 'calculation' | 'llm' | 'hybrid';
  onChange: (method: 'calculation' | 'llm' | 'hybrid') => void;
  disabled?: boolean;
}

export function ScoringMethodSelector({ 
  value, 
  onChange, 
  disabled = false 
}: ScoringMethodSelectorProps) {
  return (
    <div className="flex items-center space-x-3">
      <Label htmlFor="scoring-method" className="text-sm font-medium whitespace-nowrap">
        Scoring Method:
      </Label>
      
      <Select 
        value={value} 
        onValueChange={(val) => onChange(val as any)}
        disabled={disabled}
      >
        <SelectTrigger className="w-44" id="scoring-method">
          <SelectValue placeholder="Select method..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="calculation">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>Fast</span>
              <Badge variant="secondary" className="text-xs">Standard</Badge>
            </div>
          </SelectItem>
          <SelectItem value="llm">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <span>Intelligent</span>
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">AI</Badge>
            </div>
          </SelectItem>
          <SelectItem value="hybrid">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span>Balanced</span>
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Hybrid</Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-blue-600">Fast:</span>
                <span className="ml-1">Traditional calculation (instant, free)</span>
              </div>
              <div>
                <span className="font-medium text-purple-600">Intelligent:</span>
                <span className="ml-1">AI analysis with strategic insights (3-5s, premium)</span>
              </div>
              <div>
                <span className="font-medium text-green-600">Balanced:</span>
                <span className="ml-1">Best of both methods (5-8s, premium)</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}