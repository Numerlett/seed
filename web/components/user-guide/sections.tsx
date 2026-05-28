import type { ElementType } from 'react';
import {
  LogIn,
  LayoutDashboard,
  Building,
  Package,
  Warehouse,
  ShoppingCart,
  Receipt,
  Users,
  RotateCcw,
  ArrowLeftRight,
  Layers,
  BookOpen,
  Wallet,
  Building2,
  Factory,
  UserCheck,
  FileText,
  BarChart3,
  MessageSquare,
  User,
  Zap,
} from 'lucide-react';

export interface GuideSection {
  id: string;
  title: string;
  icon: ElementType;
  description: string;
}

export const SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: LogIn,
    description: 'Create your account and log in for the first time.',
  },
  {
    id: 'navigation',
    title: 'Navigation',
    icon: LayoutDashboard,
    description: 'Finding your way around the app.',
  },
  {
    id: 'businesses',
    title: 'Business Management',
    icon: Building,
    description: 'Create and switch between multiple businesses.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Your business overview at a glance.',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: Package,
    description: 'Manage your product catalogue and categories.',
  },
  {
    id: 'warehouses',
    title: 'Warehouses',
    icon: Warehouse,
    description: 'Manage storage locations for your stock.',
  },
  {
    id: 'purchases',
    title: 'Purchases',
    icon: ShoppingCart,
    description: 'Purchase orders and goods receipt notes.',
  },
  {
    id: 'sales',
    title: 'Sales',
    icon: Receipt,
    description: 'Create and manage sale invoices.',
  },
  {
    id: 'parties',
    title: 'Parties',
    icon: Users,
    description: 'Manage customers and suppliers.',
  },
  {
    id: 'returns',
    title: 'Returns',
    icon: RotateCcw,
    description: 'Sales returns and purchase returns.',
  },
  {
    id: 'stock-ops',
    title: 'Stock Operations',
    icon: ArrowLeftRight,
    description: 'Adjustments, transfers, and damage reports.',
  },
  {
    id: 'batches',
    title: 'Batch Management',
    icon: Layers,
    description: 'Lot tracking and expiry date monitoring.',
  },
  {
    id: 'accounting',
    title: 'Accounting',
    icon: BookOpen,
    description: 'Double-entry ledger and financial statements.',
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: Wallet,
    description: 'Recording money in and money out.',
  },
  {
    id: 'banking',
    title: 'Banking',
    icon: Building2,
    description: 'Bank accounts and running balances.',
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing',
    icon: Factory,
    description: 'Bills of materials and work orders.',
  },
  {
    id: 'crm',
    title: 'CRM',
    icon: UserCheck,
    description: 'Leads pipeline and follow-up tasks.',
  },
  {
    id: 'tax',
    title: 'Tax & GST',
    icon: FileText,
    description: 'E-invoicing, e-way bills, and GST return previews.',
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: BarChart3,
    description: 'Pre-built operational and financial reports.',
  },
  {
    id: 'communications',
    title: 'Communications',
    icon: MessageSquare,
    description: 'Templates, message log, and notification preferences.',
  },
  {
    id: 'account',
    title: 'Account Settings',
    icon: User,
    description: 'Manage your profile and active sessions.',
  },
  {
    id: 'quick-reference',
    title: 'Quick Reference',
    icon: Zap,
    description: 'Common tasks and where to find them.',
  },
];
