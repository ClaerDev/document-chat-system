import { Metadata } from 'next';
import { AppLayout } from '@/components/layout/app-layout';
import { LogsPageClient } from './logs-page-client';

export const metadata: Metadata = {
  title: 'Activity Logs | Document Chat',
  description: 'View your activity history and track actions over time',
};

export default function LogsPage() {
  return (
    <AppLayout>
      <LogsPageClient />
    </AppLayout>
  );
}
