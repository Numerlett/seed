'use client';
import Link from 'next/link';
import PageTitle from '@/components/main/PageTitle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText, History, BellRing } from 'lucide-react';

const tiles = [
  {
    title: 'Templates',
    description: 'Reusable message templates for invoices, reminders, and alerts',
    href: '/communications/templates',
    icon: FileText,
  },
  {
    title: 'Message Log',
    description: 'History of every email, SMS, and WhatsApp message sent',
    href: '/communications/logs',
    icon: History,
  },
  {
    title: 'My Preferences',
    description: 'Choose which notifications you receive and on which channels',
    href: '/communications/preferences',
    icon: BellRing,
  },
];

export default function CommunicationsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageTitle
        title="Communications"
        subtitle="Templates, message log, and notification preferences"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.href} href={tile.href}>
              <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="text-primary h-5 w-5" />
                    <CardTitle className="text-base">{tile.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{tile.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
