import { z } from 'zod';

export function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const analyticsQuerySchema = {
  query: z.object({
    tz: z
      .string()
      .optional()
      .default('Asia/Kolkata')
      .refine(isValidTimezone, {
        message: 'Invalid IANA timezone name.',
      }),
  }),
};

export const adminAnalyticsQuerySchema = {
  query: z.object({
    days: z
      .enum(['14', '30', '90'], {
        errorMap: () => ({ message: 'Days parameter must be 14, 30, or 90.' }),
      })
      .default('14'),
  }),
};
