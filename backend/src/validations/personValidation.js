import { z } from 'zod';

export const addPersonSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    phone: z.string().trim().max(50).optional().default(''),
    note: z.string().trim().max(500).optional().default(''),
  }),
};

export const updatePersonSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
    personId: z.string().uuid('Invalid person ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
    phone: z.string().trim().max(50).optional(),
    note: z.string().trim().max(500).optional(),
  }),
};

export const personParamsSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
    personId: z.string().uuid('Invalid person ID format'),
  }),
};

export const personPermissionsSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
    personId: z.string().uuid('Invalid person ID format'),
  }),
  body: z.object({
    canViewAllBills: z.boolean(),
  }),
};

export const bulkViewAllSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
  body: z.object({
    enabled: z.boolean(),
  }),
};
