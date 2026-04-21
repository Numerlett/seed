'use client';

import { usePathname } from 'next/navigation';
import RevealHero from '../animations/RevealHero';
import { getTitleFromSlug } from '@/utils';

export default function PageTitle({ title, subtitle }: { title?: string; subtitle?: string }) {
  const pathname = usePathname();
  const pageTitle = title || getTitleFromSlug(pathname.split('/').pop() || '');

  return (
    <div className="flex flex-col gap-0.5">
      <RevealHero className="text-foreground text-3xl font-extrabold">
        {pageTitle}
      </RevealHero>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );
}
