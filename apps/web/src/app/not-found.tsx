import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg rounded-2xl">
        <CardHeader>
          <p className="text-metadata font-semibold text-muted-foreground">404</p>
          <CardTitle className="text-section-title">Page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-body text-muted-foreground">
            The requested page may have moved or is no longer available.
          </p>
          <Button asChild variant="outline">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
              Return to projects
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
