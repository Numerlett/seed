import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {number}
      </div>
      <p className="text-muted-foreground pt-0.5 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 mb-3 text-base font-semibold">{children}</h3>;
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/60 border-primary/20 rounded-lg border-l-4 px-4 py-3 text-sm leading-relaxed">
      {children}
    </div>
  );
}

export function FieldTable({
  rows,
}: {
  rows: { field: string; required?: boolean; description: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">Field</th>
            <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">Required</th>
            <th className="px-4 py-2.5 text-left font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2.5 font-mono text-xs font-semibold whitespace-nowrap">{row.field}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                {row.required === true ? (
                  <Badge variant="destructive" className="text-xs">Yes</Badge>
                ) : row.required === false ? (
                  <span className="text-muted-foreground text-xs">No</span>
                ) : null}
              </td>
              <td className="text-muted-foreground px-4 py-2.5">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              {row.map((cell, j) => (
                <td key={j} className={cn('px-4 py-2.5', j === 0 ? 'font-medium' : 'text-muted-foreground')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>;
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">{children}</code>;
}
