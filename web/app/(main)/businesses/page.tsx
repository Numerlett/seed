'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AddNewBusiness from '@/components/main/AddNewBusiness';
import BusinessCard from '@/components/main/BusinessCard';
import { useBusiness } from '@/providers/BusinessProvider';
import PageTitle from '@/components/main/PageTitle';
import { Separator } from '@/components/ui/separator';

export default function BusinessesPage() {
  const { businessMemberships, error } = useBusiness();

  if (error?.message) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Businesses
            </CardTitle>
            <CardDescription>
              There was an error loading your businesses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{error.message}</p>
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link href="/businesses">Retry</Link>
              </Button>
              <AddNewBusiness className="text-sm" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-row items-center justify-between px-3">
        <PageTitle />
        <AddNewBusiness className="ml-auto w-max" />
      </div>
      <Separator />
      {!businessMemberships || businessMemberships.length == 0 ? (
        <div className="flex w-full">
          <span className="text-muted-foreground mx-auto mt-5 text-2xl">
            No businesses yet
          </span>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-6 p-4 sm:grid-cols-2 md:grid-cols-3">
          {businessMemberships.map((businessMembership) => (
            <BusinessCard
              key={businessMembership.id}
              businessMembership={businessMembership}
            />
          ))}
        </div>
      )}
    </>
  );
}
