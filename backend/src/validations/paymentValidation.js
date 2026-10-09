import { z } from 'zod';

export const createHostPaymentSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
  body: z.object({
    fromPersonId: z.string().uuid('Invalid fromPersonId format'),
    toPersonId: z.string().uuid('Invalid toPersonId format'),
    amount: z.number().int().positive('Payment amount must be a positive integer in paise'),
    date: z.string().optional(),
    mode: z.enum(['cash', 'online']),
    description: z.string().trim().max(1000).optional().default(''),
    reference: z.string().trim().max(255).optional().default(''),
  }),
};

export const paymentParamsSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
    paymentId: z.string().uuid('Invalid payment ID format'),
  }),
};

export const createFriendPaymentSchema = {
  body: z.object({
    personId: z.string().uuid('Invalid personId').optional(),
    groupId: z.string().uuid('Invalid groupId'),
    amount: z.number().int().positive('Payment amount must be a positive integer in paise'),
    date: z.string().optional(),
    mode: z.enum(['cash', 'online']),
    description: z.string().trim().max(1000).optional().default(''),
    reference: z.string().trim().max(255).optional().default(''),
  }),
};

export const resubmitFriendPaymentSchema = {
  params: z.object({ paymentId: z.string().uuid() }),
  body: z.object({
    amount: z.number().int().positive().optional(),
    date: z.string().optional(),
    mode: z.enum(['cash', 'online']).optional(),
    description: z.string().trim().max(1000).optional(),
    reference: z.string().trim().max(255).optional(),
  }),
};

