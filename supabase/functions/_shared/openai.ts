import { requireEnv } from './http.ts';

export async function structuredAI(name: string, schema: Record<string, unknown>, instructions: string, input: unknown) {
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireEnv('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      instructions,
      input: JSON.stringify(input),
      text: { format: { type: 'json_schema', name, strict: true, schema } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  const outputText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
  if (!outputText) throw new Error('OpenAI non ha restituito un output strutturato');
  return { result: JSON.parse(outputText), model, responseId: payload.id };
}
