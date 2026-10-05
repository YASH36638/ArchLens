export function projectCategory(languages: string[] | undefined, topSmellKinds: string[]): string {
  const langs = (languages ?? []).map((l) => l.toLowerCase());
  if (langs.some((l) => l.includes('python'))) return 'ML';
  if (topSmellKinds.some((k) => /ai|agent|llm/i.test(k))) return 'Agentic';
  if (langs.some((l) => l.includes('java'))) return 'RPA';
  if (langs.some((l) => l.includes('typescript') || l.includes('javascript'))) return 'Gen AI';
  return 'Software';
}
