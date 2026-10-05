import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: { metric?: string };
}

export default function MetricsRedirectPage({ searchParams }: PageProps) {
  const params = new URLSearchParams({ tab: 'metrics' });
  if (searchParams?.metric) params.set('metric', searchParams.metric);
  redirect(`/glossary?${params.toString()}`);
}
