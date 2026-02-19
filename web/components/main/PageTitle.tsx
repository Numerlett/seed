'use client';

import { usePathname } from 'next/navigation';
import RevealHero from '../animations/RevealHero';
import { getTitleFromSlug } from '@/utils';

export default function PageTitle({ title }: { title?: string }) {
  const pathname = usePathname();
  const pageTitle = title || getTitleFromSlug(pathname.split('/').pop() || '');

  return (
    <RevealHero className="text-foreground text-3xl font-extrabold">
      {pageTitle}
    </RevealHero>
  );
}
