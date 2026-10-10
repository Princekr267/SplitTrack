import { z } from 'zod';

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'system',
  'help',
  'api',
  'me',
  'owner',
  'host',
  'staff',
  'moderator',
  'splittrack',
  'null',
  'undefined',
]);

export function isReservedUsername(username) {
  if (!username) return false;
  return RESERVED_USERNAMES.has(username.toLowerCase().trim());
}

/**
 * Validates password length in UTF-8 bytes (8 to 72 bytes) and ensures password != username.
 */
export function validatePasswordBytes(password, username = '') {
  if (!password || typeof password !== 'string') return false;
  const bytes = Buffer.byteLength(password, 'utf8');
  if (bytes < 8 || bytes > 72) return false;
  if (username && password.toLowerCase() === username.toLowerCase()) return false;
  return true;
}

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(
    /^[a-z][a-z0-9_]{2,19}$/,
    'Username must start with a lowercase letter and contain only lowercase letters, digits, and underscores'
  );

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (pwd) => Buffer.byteLength(pwd, 'utf8') <= 72,
    'Password must not exceed 72 bytes'
  );

export const optionalEmailSchema = z
  .string()
  .trim()
  .max(254, 'Email must not exceed 254 characters')
  .email('Invalid email address')
  .optional()
  .or(z.literal(''));

export const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, 'Phone number must be 10 to 15 digits with optional leading +')
  .optional()
  .or(z.literal(''));

export const registerSchema = {
  body: z
    .object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
      username: usernameSchema,
      password: passwordSchema,
      email: optionalEmailSchema,
      phone: optionalPhoneSchema,
      inviteCode: z.string().trim().optional(),
    })
    .refine((data) => data.password.toLowerCase() !== data.username.toLowerCase(), {
      message: 'Password cannot be equal to your username',
      path: ['password'],
    }),
};

export const loginSchema = {
  body: z.object({
    username: z.string().trim().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
};

export const recoverSchema = {
  body: z
    .object({
      username: z.string().trim().min(1, 'Username is required'),
      recoveryCode: z.string().trim().optional(),
      code: z.string().trim().optional(),
      newPassword: passwordSchema,
    })
    .refine((data) => data.recoveryCode || data.code, {
      message: 'Recovery code is required',
      path: ['recoveryCode'],
    })
    .refine((data) => data.newPassword.toLowerCase() !== data.username.toLowerCase(), {
      message: 'Password cannot be equal to your username',
      path: ['newPassword'],
    }),
};

export const resetRequestSchema = {
  body: z.object({
    username: z.string().trim().min(1, 'Username is required'),
    contactChannel: z.string().trim().optional(),
    userNote: z.string().trim().max(300, 'Note must not exceed 300 characters').optional(),
    note: z.string().trim().max(300, 'Note must not exceed 300 characters').optional(),
  }),
};

export const resetPasswordSchema = {
  body: z
    .object({
      token: z.string().trim().optional(),
      username: z.string().trim().optional(),
      code: z.string().trim().optional(),
      resetCode: z.string().trim().optional(),
      newPassword: passwordSchema,
    })
    .refine((data) => data.token || (data.username && (data.code || data.resetCode)), {
      message: 'Must provide either token or both username and code',
      path: ['token'],
    })
    .refine(
      (data) => {
        if (data.username && data.newPassword.toLowerCase() === data.username.toLowerCase()) {
          return false;
        }
        return true;
      },
      {
        message: 'Password cannot be equal to username',
        path: ['newPassword'],
      }
    ),
};
