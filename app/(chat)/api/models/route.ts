import { ChatSDKError } from '@/lib/errors';

export const revalidate = 0; // always fetch fresh in dev
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeModels(data: any): Array<{ id: string; name: string; description: string }>
{
  const candidates: any[] = [];
  if (Array.isArray(data)) candidates.push(...data);
  if (Array.isArray(data?.data)) candidates.push(...data.data);
  if (Array.isArray(data?.items)) candidates.push(...data.items);
  if (Array.isArray(data?.models)) candidates.push(...data.models);
  if (Array.isArray(data?.data?.items)) candidates.push(...data.data.items);

  const seen = new Set<string>();
  const models = candidates
    .map((m) => {
      const name = m?.model || m?.name || m?.model_name || m?.id;
      if (!name || typeof name !== 'string') return null;
      const id = `dash:${name}`;
      if (seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        name,
        description: m?.description || 'DashScope model',
      };
    })
    .filter(Boolean) as Array<{ id: string; name: string; description: string }>;
  return models;
}

export async function GET() {
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return Response.json({ models: [] }, { status: 200 });
    }

    // 1) Primary: DashScope deployments API
    const primary = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/deployments/models?page_no=1&page_size=100',
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
    );

    let models: Array<{ id: string; name: string; description: string }> = [];
    if (primary.ok) {
      const json = await primary.json();
      models = normalizeModels(json);
    }

    // 2) Fallback: OpenAI-compatible models endpoint
    if (models.length === 0) {
      const fallback = await fetch(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        },
      );
      if (fallback.ok) {
        const json = await fallback.json();
        models = normalizeModels(json);
      }
    }

    return Response.json({ models });
  } catch (error) {
    return new ChatSDKError('offline:chat', 'Failed to fetch models').toResponse();
  }
}
