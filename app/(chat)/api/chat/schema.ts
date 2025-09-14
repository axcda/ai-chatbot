import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.enum(['image/jpeg', 'image/png']),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(['user']),
    parts: z.array(partSchema),
  }),
  // For guest sessions, the client may include the full prior messages
  // so the server can preserve context without database reads.
  previousMessages: z
    .array(
      z.object({
        id: z.string().uuid(),
        role: z.enum(['user', 'assistant', 'system']),
        parts: z.array(partSchema),
      }),
    )
    .optional(),
  // Allow dynamic model ids (e.g., "dash:qwen-plus" from DashScope)
  selectedChatModel: z.string().min(1),
  selectedVisibilityType: z.enum(['public', 'private']),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
