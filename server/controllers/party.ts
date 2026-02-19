import { prisma } from '@seed/database';
import { protectedProcedure } from '../trpc/procedures';
import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import { handleControllerError } from '../helpers/controllerErrorHandler';

// Zod schema for party creation/update
const partySchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  businessId: z.string(),
});

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

export const getPartiesByBusinessId = protectedProcedure
  .input(
    z.object({
      businessId: z.string(),
      pageSize: z.number().min(1).max(100).optional().default(50),
      pageNumber: z.number().min(1).optional().default(1),
      order: z.enum(['asc', 'desc']).optional().default('asc'),
      orderBy: z
        .enum(['createdAt', 'name', 'partyType'])
        .optional()
        .default('name'),
      search: z.string().optional(),
      partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).optional(),
    }),
  )
  .query(
    async ({
      ctx: { userId },
      input: {
        businessId,
        pageSize,
        pageNumber,
        order,
        orderBy,
        search,
        partyType,
      },
    }) => {
      try {
        const where: any = { businessId };

        // Search filter
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ];
        }

        // Party type filter
        if (partyType) {
          where.partyType = partyType;
        }

        const [parties, totalCount] = await prisma.$transaction([
          prisma.party.findMany({
            where,
            take: pageSize,
            skip: (pageNumber - 1) * pageSize,
            orderBy: [{ [orderBy]: order }, { id: 'asc' }],
            include: {
              addresses: true,
              _count: {
                select: { addresses: true },
              },
            },
          }),
          prisma.party.count({ where }),
        ]);

        return { parties, totalCount };
      } catch (error: unknown) {
        handleControllerError(error, {
          operation: 'fetch parties by business id',
          userId,
        });
      }
    },
  );

export const getPartyCount = protectedProcedure
  .input(
    z.object({
      businessId: z.string(),
      partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    try {
      const where: any = { businessId: input.businessId };

      if (input.partyType) {
        where.partyType = input.partyType;
      }

      const count = await prisma.party.count({ where });
      return count;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'get party count',
        userId: ctx.userId,
      });
    }
  });

export const getPartyById = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const party = await prisma.party.findUnique({
        where: { id: input.id },
        include: {
          addresses: true,
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!party) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Party not found',
        });
      }

      return party;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'fetch party',
        userId: ctx.userId,
      });
    }
  });

export const createParty = protectedProcedure
  .input(
    partySchema.extend({
      addresses: z.array(addressSchema).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const { addresses, ...partyData } = input;

      const newParty = await prisma.party.create({
        data: {
          ...partyData,
          addresses: addresses
            ? {
                create: addresses,
              }
            : undefined,
        },
        include: {
          addresses: true,
        },
      });

      return newParty;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'create party',
        fallbackMessage: 'Failed to create party',
        userId: ctx.userId,
      });
    }
  });

export const updateParty = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      data: partySchema.partial().omit({ businessId: true }),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const updatedParty = await prisma.party.update({
        where: { id: input.id },
        data: input.data,
        include: {
          addresses: true,
        },
      });

      return updatedParty;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update party',
        userId: ctx.userId,
      });
    }
  });

export const deleteParty = protectedProcedure
  .input(z.object({ id: z.string(), businessId: z.string() }))
  .mutation(async ({ input: { id, businessId }, ctx }) => {
    try {
      // Verify party belongs to the business
      const party = await prisma.party.findFirst({
        where: { id, businessId },
      });

      if (!party) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this party',
        });
      }

      await prisma.party.delete({
        where: { id },
      });

      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete party',
        userId: ctx.userId,
      });
    }
  });

export const bulkDeleteParties = protectedProcedure
  .input(z.object({ ids: z.array(z.string()), businessId: z.string() }))
  .mutation(async ({ input: { ids, businessId }, ctx }) => {
    try {
      const result = await prisma.party.deleteMany({
        where: {
          id: { in: ids },
          businessId,
        },
      });

      return { success: true, count: result.count };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'bulk delete parties',
        userId: ctx.userId,
      });
    }
  });

// Address management for parties
export const addAddressToParty = protectedProcedure
  .input(
    z.object({
      partyId: z.string(),
      address: addressSchema,
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const newAddress = await prisma.address.create({
        data: {
          ...input.address,
          partyId: input.partyId,
        },
      });

      return newAddress;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'add address to party',
        userId: ctx.userId,
      });
    }
  });

export const updateAddress = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      data: addressSchema.partial(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const updatedAddress = await prisma.address.update({
        where: { id: input.id },
        data: input.data,
      });

      return updatedAddress;
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'update address',
        userId: ctx.userId,
      });
    }
  });

export const deleteAddress = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    try {
      await prisma.address.delete({
        where: { id: input.id },
      });

      return { success: true };
    } catch (error: unknown) {
      handleControllerError(error, {
        operation: 'delete address',
        userId: ctx.userId,
      });
    }
  });
