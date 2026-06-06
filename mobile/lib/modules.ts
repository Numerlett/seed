import type { LucideIcon } from 'lucide-react-native';
import {
  Banknote,
  BookOpen,
  Boxes,
  Calculator,
  ClipboardList,
  Factory,
  FileText,
  Mail,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react-native';

export interface ModuleEntry {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** A fully built route, or undefined to fall back to the generic scaffold. */
  route?: string;
}

// Fully implemented modules link straight to their screens; the rest open the
// generic "/module/[key]" scaffold (wired to the same backend, UI coming next).
export const MODULES: ModuleEntry[] = [
  { key: 'parties', title: 'Parties', description: 'Customers & suppliers', icon: Users, route: '/parties' },
  { key: 'warehouses', title: 'Warehouses', description: 'Stock locations', icon: Warehouse, route: '/warehouses' },
  { key: 'returns', title: 'Returns', description: 'Sales & purchase returns', icon: RotateCcw },
  { key: 'stockops', title: 'Stock Ops', description: 'Transfers & adjustments', icon: ClipboardList },
  { key: 'batches', title: 'Batches', description: 'Batch & expiry tracking', icon: Boxes },
  { key: 'accounting', title: 'Accounting', description: 'Ledgers & statements', icon: BookOpen },
  { key: 'payments', title: 'Payments', description: 'Receipts & payments', icon: Banknote },
  { key: 'tax', title: 'Tax & GST', description: 'e-Invoice, GSTR', icon: Calculator },
  { key: 'reports', title: 'Reports', description: 'Registers & summaries', icon: FileText },
  { key: 'crm', title: 'CRM', description: 'Leads & tasks', icon: Receipt },
  { key: 'manufacturing', title: 'Manufacturing', description: 'BOMs & work orders', icon: Factory },
  { key: 'communications', title: 'Communications', description: 'Templates & logs', icon: Mail },
  { key: 'admin', title: 'Admin', description: 'Platform administration', icon: ShieldCheck },
  { key: 'logistics', title: 'Logistics', description: 'Shipments & delivery', icon: Truck },
];

export function findModule(key: string): ModuleEntry | undefined {
  return MODULES.find((m) => m.key === key);
}
