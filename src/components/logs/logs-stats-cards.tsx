'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Calendar,
  Eye,
  User,
  Shield,
  FileText
} from 'lucide-react';

interface LogsStatsCardsProps {
  data: {
    totalActions: number;
    actionsByCategory: Record<string, number>;
    actionsByType: Record<string, number>;
    recentActivity: any[];
  };
}

export function LogsStatsCards({ data }: LogsStatsCardsProps) {
  const getTopAction = () => {
    const entries = Object.entries(data.actionsByType);
    if (entries.length === 0) return null;
    
    const [topAction, count] = entries.reduce((a, b) => 
      a[1] > b[1] ? a : b
    );
    
    return { action: topAction, count };
  };

  const getActivityTrend = () => {
    // Simple trend calculation based on recent activity
    const now = new Date();
    const last24h = data.recentActivity.filter(log => {
      try {
        const logTime = new Date(log.createdAt || log.timestamp);
        if (isNaN(logTime.getTime())) {
          console.warn('Invalid date in getActivityTrend:', log.createdAt || log.timestamp);
          return false;
        }
        return (now.getTime() - logTime.getTime()) < 24 * 60 * 60 * 1000;
      } catch (error) {
        console.warn('Error processing activity trend date:', log, error);
        return false;
      }
    }).length;
    
    const prev24h = data.recentActivity.filter(log => {
      try {
        const logTime = new Date(log.createdAt || log.timestamp);
        if (isNaN(logTime.getTime())) {
          console.warn('Invalid date in getActivityTrend:', log.createdAt || log.timestamp);
          return false;
        }
        const timeDiff = now.getTime() - logTime.getTime();
        return timeDiff >= 24 * 60 * 60 * 1000 && timeDiff < 48 * 60 * 60 * 1000;
      } catch (error) {
        console.warn('Error processing activity trend date:', log, error);
        return false;
      }
    }).length;

    const percentChange = prev24h > 0 ? ((last24h - prev24h) / prev24h) * 100 : 0;
    return { current: last24h, change: percentChange };
  };

  const topAction = getTopAction();
  const activityTrend = getActivityTrend();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalActions.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            All your activities
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activityTrend.current}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {activityTrend.change > 0 ? '+' : ''}{activityTrend.change.toFixed(0)}% from yesterday
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Common Action</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{topAction?.count || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {topAction?.action.replace(/_/g, ' ').toLowerCase() || 'No actions yet'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Security Events</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.actionsByCategory.SECURITY || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Login, logout, and security actions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}