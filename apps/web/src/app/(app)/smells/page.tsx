import { redirect } from 'next/navigation';

export default function SmellsRedirectPage() {
  redirect('/glossary?tab=smells');
}
