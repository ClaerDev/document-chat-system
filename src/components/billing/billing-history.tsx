'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Calendar, CreditCard, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { useCSRF } from '@/hooks/useCSRF';

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  invoiceUrl: string | null;
  pdfUrl: string | null;
  customerName: string;
  customerEmail: string;
  number: string | null;
  subtotal: number;
  tax: number;
  amountPaid: number;
  amountDue: number;
}

export function BillingHistory() {
  const { user } = useUser();
  const { addToHeaders } = useCSRF();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoices() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/v1/billing/invoices', {
          headers: addToHeaders({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Please sign in to view your billing history');
            return;
          }
          
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch invoices`);
        }

        const data = await response.json();
        setInvoices(data.invoices || []);

      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError(err instanceof Error ? err.message : 'Failed to load billing history');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [user, addToHeaders]);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'open':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Open</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Draft</Badge>;
      case 'void':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Void</Badge>;
      case 'uncollectible':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Uncollectible</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status}</Badge>;
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.pdfUrl) {
      // Open PDF directly
      window.open(invoice.pdfUrl, '_blank');
    } else if (invoice.invoiceUrl) {
      // Open hosted invoice page
      window.open(invoice.invoiceUrl, '_blank');
    } else {
      console.warn('No download URL available for invoice:', invoice.id);
    }
  };

  const handleManagePaymentMethod = async () => {
    try {
      const response = await fetch('/api/v1/billing/portal', {
        method: 'POST',
        headers: addToHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to open customer portal');
      }

      const data = await response.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } catch (err) {
      console.error('Error opening customer portal:', err);
      setError('Unable to open billing portal. Please try again later.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>
              Download your invoices and view payment history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading billing history...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>
              Download your invoices and view payment history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            Download your invoices and view payment history
            {invoices.length > 0 && (
              <span className="ml-2 text-sm">
                ({invoices.length} invoice{invoices.length !== 1 ? 's' : ''})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {invoice.number || invoice.id}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.description}
                          </div>
                          {invoice.id !== invoice.number && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {invoice.id}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(invoice.date)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{formatCurrency(invoice.amount, invoice.currency)}</div>
                          {invoice.tax > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Tax: {formatCurrency(invoice.tax, invoice.currency)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(invoice.pdfUrl || invoice.invoiceUrl) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadInvoice(invoice)}
                              title={invoice.pdfUrl ? "Download PDF" : "View Invoice"}
                            >
                              {invoice.pdfUrl ? (
                                <Download className="h-4 w-4" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No billing history available</p>
              <p className="text-sm">Invoices will appear here once you have an active subscription</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Manage your payment method through the customer portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline"
            onClick={handleManagePaymentMethod}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Manage Payment Method
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}