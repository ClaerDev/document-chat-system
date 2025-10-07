'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Crown, Building2, Building, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/stripe';
import { ContactSalesModal } from '@/components/contact/contact-sales-modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePricingPlans, PricingPlan } from '@/hooks/usePricingPlans';

// PricingPlan interface now imported from usePricingPlans hook

interface PlanSelectionCardsProps {
  currentPlan?: string;
  onSelectPlan: (planType: string) => void;
  disabled?: boolean;
  billingInterval?: 'monthly' | 'yearly';
  showLoadingState?: boolean;
}

export function PlanSelectionCards({ 
  currentPlan, 
  onSelectPlan, 
  disabled = false, 
  billingInterval = 'monthly',
  showLoadingState = true 
}: PlanSelectionCardsProps) {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedPlanForContact, setSelectedPlanForContact] = useState<string>('');
  // Use the custom pricing hook
  const { 
    plans, 
    loading, 
    error, 
    dataSource, 
    retry,
    formatPrice: hookFormatPrice,
    formatLimit: hookFormatLimit
  } = usePricingPlans({
    format: 'detailed',
    retryAttempts: 2,
    retryDelay: 1000
  });

  const handleContactSales = (planName: string) => {
    setSelectedPlanForContact(planName);
    setIsContactModalOpen(true);
  };

  const planIcons: Record<string, React.ReactNode> = {
    STARTER: <Zap className="w-6 h-6 text-blue-500" />,
    PROFESSIONAL: <Crown className="w-6 h-6 text-blue-500" />,
    AGENCY: <Building2 className="w-6 h-6 text-purple-500" />,
    ENTERPRISE: <Building className="w-6 h-6 text-emerald-500" />
  };
  
  const getPlanIcon = (planType: string) => {
    return planIcons[planType] || <Zap className="w-6 h-6 text-blue-500" />;
  };

  const getPlanBadge = (plan: PricingPlan) => {
    if (plan.isPopular) {
      return <Badge className="bg-blue-500 text-white">Most Popular</Badge>;
    }
    if (plan.planType === 'AGENCY') {
      return <Badge className="bg-purple-500 text-white">Best Value</Badge>;
    }
    return null;
  };

  const isCurrentPlan = (planType: string) => currentPlan === planType;
  
  const getPriceForInterval = (plan: PricingPlan) => {
    if (billingInterval === 'yearly' && plan.yearlyPrice) {
      return plan.yearlyPrice;
    }
    return plan.monthlyPrice;
  };
  
  // Use the hook's format function
  const formatPrice = hookFormatPrice;
  
  // Loading state
  if (loading && showLoadingState) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="relative transition-all duration-200">
            <CardHeader className="text-center space-y-2">
              <div className="animate-pulse">
                <div className="h-6 w-16 bg-gray-200 rounded mx-auto mb-2" />
                <div className="h-8 w-24 bg-gray-200 rounded mx-auto mb-2" />
                <div className="h-4 w-32 bg-gray-200 rounded mx-auto mb-4" />
                <div className="h-8 w-20 bg-gray-200 rounded mx-auto" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="animate-pulse space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded" />
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full h-10 bg-gray-200 rounded animate-pulse" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="space-y-2">
            <div className="font-medium">Failed to load pricing plans</div>
            <div className="text-sm">{error}</div>
            <Button 
              onClick={retry}
              variant="outline"
              size="sm"
              className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  // No plans found
  if (!plans || plans.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">No pricing plans available</div>
            <div className="text-sm">Please try again later or contact support.</div>
            <Button 
              onClick={retry}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Data Source Indicator */}
      {dataSource === 'fallback' && (
        <Alert className="border-yellow-200 bg-yellow-50 mb-6">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="font-medium">Using fallback pricing data</div>
            <div className="text-sm mt-1">Database is temporarily unavailable. Pricing information may not be current.</div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`relative transition-all duration-200 hover:shadow-lg ${
            plan.isPopular ? 'ring-2 ring-blue-500 scale-105' : ''
          } ${isCurrentPlan(plan.planType) ? 'ring-2 ring-green-500' : ''}`}
        >
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              {getPlanBadge(plan)}
            </div>
            <div className="flex justify-center mb-2">
              {getPlanIcon(plan.planType)}
            </div>
            <CardTitle className="text-xl">{plan.displayName}</CardTitle>
            <CardDescription className="text-sm">{plan.description}</CardDescription>
            <div className="space-y-1">
              {getPriceForInterval(plan) > 0 ? (
                <>
                  <div className="text-3xl font-bold">
                    {formatPrice(getPriceForInterval(plan))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per {billingInterval === 'yearly' ? 'year' : 'month'}
                  </div>
                  {billingInterval === 'yearly' && plan.yearlyPrice && plan.monthlyPrice > 0 && (
                    <div className="text-xs text-green-600">
                      Save {formatCurrency(((plan.monthlyPrice * 12) - plan.yearlyPrice) / 100)}/year
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold">Custom</div>
                  <div className="text-sm text-muted-foreground">Contact sales</div>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {plan.features.list.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="border-t pt-4 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Usage Limits:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Seats:</span>
                  <span className="font-medium">
                    {plan.limits.seats === -1 ? 'Unlimited' : plan.limits.seats}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Saved Searches:</span>
                  <span className="font-medium">
                    {plan.limits.documentsPerMonth === -1 ? 'Unlimited' : plan.limits.documentsPerMonth}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>AI Credits:</span>
                  <span className="font-medium flex items-center gap-1">
                    {plan.limits.aiCreditsPerMonth === -1 ? 'Unlimited' : plan.limits.aiCreditsPerMonth}
                    {plan.limits.aiCreditsPerMonth > 0 && <Zap className="h-3 w-3 text-orange-500" />}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Match Scores:</span>
                  <span className="font-medium">
                    {plan.limits.matchScoreCalculations === -1 ? 'Unlimited' : `${plan.limits.matchScoreCalculations}/${billingInterval === 'yearly' ? 'year' : 'month'}`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            {isCurrentPlan(plan.planType) ? (
              <Button disabled className="w-full">
                Current Plan
              </Button>
            ) : plan.planType === 'ENTERPRISE' ? (
              <Button 
                variant="outline" 
                className="w-full"
                disabled={disabled}
                onClick={() => handleContactSales(plan.displayName)}
              >
                {disabled ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Contact Sales'
                )}
              </Button>
            ) : (
              <Button 
                className={`w-full ${
                  plan.planType === 'PROFESSIONAL' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : plan.planType === 'AGENCY'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : ''
                }`}
                disabled={disabled}
                onClick={() => onSelectPlan(plan.planType)}
              >
                {disabled ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  currentPlan ? 'Switch to ' + plan.displayName : 'Get Started'
                )}
                {plan.isPopular && !disabled && <Star className="h-4 w-4 ml-2" />}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
      </div>

      {dataSource === 'fallback' && (
        <div className="text-center text-sm text-yellow-600 mt-4">
          * Pricing shown from fallback data - actual pricing may vary
        </div>
      )}

      <ContactSalesModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        context="pricing"
        planName={selectedPlanForContact}
      />
    </>
  );
}