import { prisma } from '@seed/database';
import { businessMemberProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { handleControllerError } from '../helpers/controllerErrorHandler';

export const getDashboardData = businessMemberProcedure
  .input(
    z.object({
      businessId: z.string(),
    }),
  )
  .query(async ({ ctx: { userId }, input: { businessId } }) => {
    try {
      const [customerCount, supplierCount, productCount] =
        await prisma.$transaction([
          prisma.party.count({
            where: {
              businessId,
              partyType: { in: ['CUSTOMER', 'BOTH'] },
            },
          }),
          prisma.party.count({
            where: {
              businessId,
              partyType: { in: ['SUPPLIER', 'BOTH'] },
            },
          }),
          prisma.product.count({
            where: {
              businessId,
            },
          }),
        ]);

      return {
        customerCount,
        supplierCount,
        productCount,
      };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch dashboard data by business id',
        userId,
      });
    }
  });
