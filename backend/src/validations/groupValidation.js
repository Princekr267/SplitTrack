import { z } from 'zod';

export const createGroupSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Group name is required').max(100),
    date: z.string().datetime({ offset: true }).optional().or(z.string().optional()),
    description: z.string().trim().max(500).optional().default(''),
  }),
};

export const updateGroupSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Group name cannot be empty').max(100).optional(),
    date: z.string().optional(),
    description: z.string().trim().max(500).optional(),
  }),
};

export const groupIdParamSchema = {
  params: z.object({
    groupId: z.string().uuid('Invalid group ID format'),
  }),
};
