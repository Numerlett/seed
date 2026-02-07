'use client';

import { Building2Icon, CheckIcon, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AddNewBusiness from './AddNewBusiness';
import { useBusiness } from '@/providers/BusinessProvider';
import { Badge } from '../ui/badge';

export default function BusinessSwitcher({ expanded }: { expanded: boolean }) {
  const {
    businessMembershipId,
    switchBusinessMembershipId,
    businessMemberships,
    currentBusinessMembership,
  } = useBusiness();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={cn(
            'group-hover:bg-muted relative flex cursor-pointer flex-row items-center gap-4 rounded-xl p-2',
            expanded ? 'bg-muted' : '',
          )}
        >
          <Avatar className="size-10">
            <AvatarImage
              src={currentBusinessMembership?.business.logoImage || ''}
              alt={currentBusinessMembership?.business.name || ''}
            />
            <AvatarFallback
              className={cn('text-background bg-primary text-xs')}
            >
              {currentBusinessMembership?.business.name
                ?.slice(0, 2)
                .toUpperCase() || 'NA'}
            </AvatarFallback>
          </Avatar>

          <span
            className={cn(
              `text-foreground pointer-events-none w-max truncate opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100`,
              expanded ? 'pointer-events-auto opacity-100' : '',
            )}
          >
            {currentBusinessMembership?.business.name || 'Select Business'}
          </span>

          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="flex flex-col gap-1">
          {businessMemberships?.map((membership) => (
            <DropdownMenuItem
              key={membership.id}
              onSelect={async () => {
                await switchBusinessMembershipId({ id: membership.id });
              }}
              className={cn(
                'cursor-pointer py-2',
                businessMembershipId === membership.id &&
                  'border-primary border-2',
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage
                      src={membership.business.logoImage || ''}
                      alt={membership.business.name}
                    />
                    <AvatarFallback
                      className={cn('text-background bg-primary text-xs')}
                    >
                      {membership.business.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{membership.business.name}</span>
                </div>
                {businessMembershipId === membership.id && (
                  <CheckIcon className="text-primary shrink-0" />
                )}
                <Badge className="ml-2">{membership.role}</Badge>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
        <Separator className="my-1" />
        <div className="flex flex-col space-y-1">
          <AddNewBusiness />
          <Link href={'/businesses'} className="w-full">
            <Button className="w-full">
              <Building2Icon className="h-4 w-4" />
              Manage Businesses
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
