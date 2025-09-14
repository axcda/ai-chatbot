export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Qwen Plus',
    description: 'DashScope OpenAI-compatible qwen-plus (text & multimodal)',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Qwen Plus (Reasoning)',
    description: 'Same endpoint with reasoning-style responses when enabled',
  },
];
