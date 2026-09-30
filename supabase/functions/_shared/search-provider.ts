export interface SearchResult { title: string; url: string; snippet: string }
export interface SearchProvider { search(query: string, limit: number): Promise<SearchResult[]> }

export class TavilySearchProvider implements SearchProvider {
  constructor(private apiKey: string) {}
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const response = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: this.apiKey, query, max_results: Math.min(limit, 20), search_depth: 'basic', include_answer: false }) });
    if (!response.ok) throw new Error(`Tavily ${response.status}`);
    const payload = await response.json();
    return (payload.results || []).map((item: any) => ({ title: item.title || '', url: item.url, snippet: item.content || '' }));
  }
}

// Adapter predisposto ma non esposto da alcuna Edge Function in questa fase.
export function configuredSearchProvider(): SearchProvider {
  const provider = Deno.env.get('SEARCH_PROVIDER') || 'tavily';
  if (provider !== 'tavily') throw new Error(`Provider di ricerca non supportato: ${provider}`);
  const apiKey = Deno.env.get('TAVILY_API_KEY');
  if (!apiKey) throw new Error('TAVILY_API_KEY non configurata');
  return new TavilySearchProvider(apiKey);
}
