'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay } from 'date-fns';
import { Clock } from 'lucide-react';
import { AuditEventType, AuditCategory, AuditSeverity } from '@prisma/client';

interface AuditLog {
  id: string;
  createdAt: string;
  eventType: AuditEventType;
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  resourceType?: string;
  resourceId?: string;
}

interface LogsTimelineProps {
  logs: AuditLog[];
  isLoading: boolean;
  getCategoryIcon: (category: AuditCategory) => React.ReactNode;
  getSeverityColor: (severity: AuditSeverity) => string;
}

export function LogsTimeline({
  logs,
  isLoading,
  getCategoryIcon,
  getSeverityColor,
}: LogsTimelineProps) {
  const formatEventType = (eventType: AuditEventType) => {
    return eventType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const safeFormatDate = (dateString: string, formatStr: string, fallback: string = 'Invalid Date') => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateString);
        return fallback;
      }
      return format(date, formatStr);
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return fallback;
    }
  };

  const safeGetTime = (dateString: string): number => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date for sorting:', dateString);
        return 0;
      }
      return date.getTime();
    } catch (error) {
      console.warn('Error parsing date for sorting:', dateString, error);
      return 0;
    }
  };

  const sortedLogs = [...logs].sort((a, b) => 
    safeGetTime(b.createdAt) - safeGetTime(a.createdAt)
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading timeline...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Timeline Data</h3>
            <p className="text-muted-foreground">
              No activity found for the selected time period.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[800px] p-6">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
            
            <div className="space-y-6">
              {sortedLogs.map((log, index) => {
                const currentDate = new Date(log.createdAt);
                const prevDate = index > 0 ? new Date(sortedLogs[index - 1].createdAt) : null;
                const showDate = index === 0 || 
                  !prevDate || 
                  isNaN(currentDate.getTime()) || 
                  isNaN(prevDate.getTime()) || 
                  !isSameDay(currentDate, prevDate);
                
                return (
                  <div key={log.id} className="relative">
                    {showDate && (
                      <div className="mb-4">
                        <div className="relative">
                          <div className="absolute left-6 -translate-x-1/2 w-4 h-4 bg-primary rounded-full border-4 border-background"></div>
                          <div className="ml-16">
                            <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                              {safeFormatDate(log.createdAt, 'MMMM dd, yyyy', 'Unknown Date')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="relative ml-16">
                      {/* Timeline dot */}
                      <div className="absolute -left-10 top-3 w-3 h-3 bg-background border-2 border-primary rounded-full"></div>
                      
                      <div className="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                {getCategoryIcon(log.category)}
                              </div>
                              <h4 className="font-medium text-sm">
                                {formatEventType(log.eventType)}
                              </h4>
                              <Badge variant={getSeverityColor(log.severity)} className="text-xs">
                                {log.severity}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {log.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{safeFormatDate(log.createdAt, 'HH:mm:ss', '--:--:--')}</span>
                              {log.resourceType && <span>Resource: {log.resourceType}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}