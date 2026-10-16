import { z } from 'zod';

export const pollOptionSchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  tool_slug: z.string().nullable(),
  sort: z.number().int().min(0),
});

export const pollSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  question: z.string().min(1),
  status: z.enum(['active', 'closed', 'draft']),
  options: z.array(pollOptionSchema).min(2),
});

export type Poll = z.infer<typeof pollSchema>;
export type PollOption = z.infer<typeof pollOptionSchema>;
