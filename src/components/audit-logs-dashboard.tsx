'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  Filter, 
  Search, 
  RefreshCw, 
  Eye, 
  Calendar,
  AlertTriangle,
  Shield,
  Activity,
  Users
} from 'lucide-react';
import { DateTimePicker, DateRange } from '@/components/ui/date-time-picker';
import { AuditEventType, AuditCategory, AuditSeverity } from '@prisma/client';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  createdAt: string;
  eventType: AuditEventType;
  category: AuditCategory;
  severity: AuditSeverity;
  userEmail?: string;
  resourceType?: string;
  resourceId?: string;
  description: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  searchTerm?: string;
  userId?: string;
}

export function AuditLogsDashboard() {
  const [filters, setFilters] = useState<AuditLogFilter>({});
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
        ...(filters.eventTypes?.length && { eventTypes: filters.eventTypes.join(',') }),
        ...(filters.categories?.length && { categories: filters.categories.join(',') }),
        ...(filters.severities?.length && { severities: filters.severities.join(',') }),
        ...(filters.searchTerm && { searchTerm: filters.searchTerm }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const response = await fetch(`/api/v1/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: summaryData } = useQuery({
    queryKey: ['audit-summary', filters.startDate, filters.endDate],
    queryFn: async () => {
      const startDate = filters.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = filters.endDate || new Date();
      
      const params = new URLSearchParams({
        type: 'system',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/v1/audit-logs/summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      return response.json();
    },
    enabled: true,
  });

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/v1/audit-logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...filters, format }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case AuditSeverity.CRITICAL: return 'destructive';
      case AuditSeverity.ERROR: return 'destructive';
      case AuditSeverity.WARNING: return 'secondary';
      case AuditSeverity.INFO: return 'default';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: AuditCategory) => {
    switch (category) {
      case AuditCategory.SECURITY: return <Shield className="h-4 w-4" />;
      case AuditCategory.USER_MANAGEMENT: return <Users className="h-4 w-4" />;
      case AuditCategory.SYSTEM_ADMINISTRATION: return <Activity className="h-4 w-4" />;
      case AuditCategory.DATA_ACCESS: return <Eye className="h-4 w-4" />;
      case AuditCategory.COMPLIANCE: return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summaryData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.data.totalEvents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {summaryData.data.errorCount}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <Shield className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {summaryData.data.warningCount}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryData.data.errorRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search logs..."
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={filters.categories?.[0] || ''}
                onValueChange={(value) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    categories: value ? [value as AuditCategory] : undefined 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {Object.values(AuditCategory).map(category => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select
                value={filters.severities?.[0] || ''}
                onValueChange={(value) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    severities: value ? [value as AuditSeverity] : undefined 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  {Object.values(AuditSeverity).map(severity => (
                    <SelectItem key={severity} value={severity}>
                      {severity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DateTimePicker
                mode="range"
                fromLabel="Start Date"
                toLabel="End Date"
                fromPlaceholder="Select start date"
                toPlaceholder="Select end date"
                value={{
                  from: filters.startDate,
                  to: filters.endDate
                } as DateRange}
                onChange={(dateRange) => {
                  const range = dateRange as DateRange
                  setFilters(prev => ({ 
                    ...prev, 
                    startDate: range?.from, 
                    endDate: range?.to 
                  }))
                }}
                compact={true}
                toDate={new Date()} // No future dates allowed
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => refetch()} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logsData?.logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logsData?.logs?.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {safeFormatDate(log.createdAt, 'MMM dd, HH:mm:ss', 'Invalid Date')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(log.category)}
                        {log.category.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.eventType}
                    </TableCell>
                    <TableCell>{log.userEmail || 'System'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.description}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Audit Log Details</DialogTitle>
                          </DialogHeader>
                          {selectedLog && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Timestamp</label>
                                  <div className="font-mono text-sm">
                                    {safeFormatDate(selectedLog.createdAt, 'PPpp', 'Invalid Date')}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Event Type</label>
                                  <div className="font-mono text-sm">{selectedLog.eventType}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Category</label>
                                  <div>{selectedLog.category}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Severity</label>
                                  <Badge variant={getSeverityColor(selectedLog.severity)}>
                                    {selectedLog.severity}
                                  </Badge>
                                </div>
                                {selectedLog.userEmail && (
                                  <div>
                                    <label className="text-sm font-medium">User</label>
                                    <div>{selectedLog.userEmail}</div>
                                  </div>
                                )}
                                {selectedLog.ipAddress && (
                                  <div>
                                    <label className="text-sm font-medium">IP Address</label>
                                    <div className="font-mono text-sm">{selectedLog.ipAddress}</div>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="text-sm font-medium">Description</label>
                                <div className="mt-1 p-3 bg-muted rounded text-sm">
                                  {selectedLog.description}
                                </div>
                              </div>
                              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                  <label className="text-sm font-medium">Metadata</label>
                                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto">
                                    {JSON.stringify(selectedLog.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {logsData && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {logsData.logs?.length || 0} of {logsData.total} logs
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(prev => prev - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!logsData.hasNext}
                  onClick={() => setPage(prev => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}