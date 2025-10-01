'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Usage {
  period: {
    start: string;
    end: string;
  };
  totals: {
    OPPORTUNITY_MATCH: number;
    AI_QUERY: number;
    DOCUMENT_PROCESSING: number;
    API_CALL: number;
    EXPORT: number;
    MATCH_SCORE_CALCULATION: number;
    SAVED_SEARCH: number;
  };
  limits: {
    seats: number;
    savedSearches: number;
    aiCreditsPerMonth: number;
    matchScoreCalculations: number;
  };
  percentUsed: {
    matches: number;
    aiQueries: number;
    documents: number;
    matchScoreCalculations: number;
    savedSearches: number;
  };
}

interface UsageChartProps {
  usage: Usage;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export function UsageChart({ usage }: UsageChartProps) {
  const chartData = [
    {
      name: 'Match Scores',
      value: usage.totals.MATCH_SCORE_CALCULATION,
      limit: usage.limits.matchScoreCalculations === -1 ? 'Unlimited' : usage.limits.matchScoreCalculations,
      color: '#8884d8'
    },
    {
      name: 'AI Queries',
      value: usage.totals.AI_QUERY,
      limit: usage.limits.aiCreditsPerMonth === -1 ? 'Unlimited' : usage.limits.aiCreditsPerMonth,
      color: '#82ca9d'
    },
    {
      name: 'Document Processing',
      value: usage.totals.DOCUMENT_PROCESSING,
      limit: 'No limit',
      color: '#ffc658'
    },
    {
      name: 'Saved Searches',
      value: usage.totals.SAVED_SEARCH,
      limit: usage.limits.savedSearches === -1 ? 'Unlimited' : usage.limits.savedSearches,
      color: '#ff7c7c'
    },
    {
      name: 'Exports',
      value: usage.totals.EXPORT,
      limit: 'No limit',
      color: '#8dd1e1'
    },
  ];

  const pieData = chartData.filter(item => item.value > 0);

  const periodStart = new Date(usage.period.start).toLocaleDateString();
  const periodEnd = new Date(usage.period.end).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>
              Current billing period: {periodStart} - {periodEnd}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Distribution</CardTitle>
            <CardDescription>
              Breakdown of your activity this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No usage data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chartData.map((item, index) => (
          <Card key={item.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{item.value}</span>
                  <span className="text-sm text-muted-foreground">
                    / {item.limit}
                  </span>
                </div>
                {typeof item.limit === 'number' && item.limit > 0 && (
                  <Progress 
                    value={(item.value / item.limit) * 100} 
                    className="h-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}