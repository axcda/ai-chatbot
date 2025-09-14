import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { isTestEnvironment } from '../constants';

function createDashscopeModel() {
  try {
    // Dynamically import to avoid hard dependency when not used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');
    const dashscope = createOpenAICompatible({
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: process.env.DASHSCOPE_API_KEY,
    });
    return dashscope;
  } catch {
    return null;
  }
}

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require('./models.mock');
      return customProvider({
        languageModels: {
          'chat-model': chatModel,
          'chat-model-reasoning': reasoningModel,
          'title-model': titleModel,
          'artifact-model': artifactModel,
        },
      });
    })()
  : (() => {
      const dashscope = createDashscopeModel();
      const useDash = Boolean(dashscope && process.env.DASHSCOPE_API_KEY);
      return customProvider({
        languageModels: useDash
          ? {
              // Map all internal IDs to DashScope Qwen models
              'chat-model': dashscope('qwen-plus'),
              'chat-model-reasoning': dashscope('qwen-plus'),
              'title-model': dashscope('qwen-plus'),
              'artifact-model': dashscope('qwen-plus'),
            }
          : {
              // Fallback to Vercel AI Gateway (default)
              'chat-model': gateway.languageModel('xai/grok-2-vision-1212'),
              'chat-model-reasoning': wrapLanguageModel({
                model: gateway.languageModel('xai/grok-3-mini'),
                middleware: extractReasoningMiddleware({ tagName: 'think' }),
              }),
              'title-model': gateway.languageModel('xai/grok-2-1212'),
              'artifact-model': gateway.languageModel('xai/grok-2-1212'),
            },
      });
    })();

export function getLanguageModel(id: string) {
  // DashScope dynamic id: "dash:<modelName>"
  if (id?.startsWith('dash:')) {
    const modelName = id.slice('dash:'.length);
    const dashscope = createDashscopeModel();
    if (dashscope && process.env.DASHSCOPE_API_KEY) {
      return dashscope(modelName);
    }
  }
  // Fallback to configured provider mappings
  return myProvider.languageModel(id);
}
