import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SECTIONS } from '@/components/user-guide/sections';
import { SECTION_CONTENT } from '@/components/user-guide/content';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.id }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const meta = SECTIONS.find((s) => s.id === section);
  if (!meta) notFound();

  const Content = SECTION_CONTENT[section];
  if (!Content) notFound();

  const currentIndex = SECTIONS.findIndex((s) => s.id === section);
  const prev = SECTIONS[currentIndex - 1];
  const next = SECTIONS[currentIndex + 1];
  const Icon = meta.icon;

  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 md:px-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/user-guide/getting-started" className="hover:text-foreground transition-colors">
          User Guide
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{meta.title}</span>
      </nav>

      {/* Page header */}
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="bg-primary/10 rounded-xl p-2.5">
            <Icon className="text-primary h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{meta.title}</h1>
        </div>
        <p className="text-muted-foreground text-base leading-relaxed">
          {meta.description}
        </p>
      </header>

      <hr className="mb-10" />

      {/* Content */}
      <div className="space-y-2">
        <Content />
      </div>

      {/* Prev / Next */}
      <nav className="mt-14 pt-8 border-t flex items-stretch justify-between gap-4">
        {prev ? (
          <Link
            href={`/user-guide/${prev.id}`}
            className="group flex flex-1 flex-col gap-1 rounded-lg border p-4 text-sm transition-colors hover:border-primary/50 hover:bg-muted/40"
          >
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" />
              Previous
            </span>
            <span className="font-medium group-hover:text-primary transition-colors">
              {prev.title}
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/user-guide/${next.id}`}
            className="group flex flex-1 flex-col gap-1 rounded-lg border p-4 text-right text-sm transition-colors hover:border-primary/50 hover:bg-muted/40"
          >
            <span className="text-muted-foreground text-xs flex items-center justify-end gap-1">
              Next
              <ChevronRight className="h-3 w-3" />
            </span>
            <span className="font-medium group-hover:text-primary transition-colors">
              {next.title}
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </article>
  );
}
