import * as z from 'zod';

// Address schema for forms
export const addressFormSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

// Party form schema
export const partyFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number is too long').optional(),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH'], {
    required_error: 'Party type is required',
  }),
  addresses: z
    .array(addressFormSchema)
    .min(0)
    .max(5, 'Maximum 5 addresses allowed')
    .optional(),
});

export type PartyFormData = z.infer<typeof partyFormSchema>;
export type AddressFormData = z.infer<typeof addressFormSchema>;
