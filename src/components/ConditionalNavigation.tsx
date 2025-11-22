'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Don't show navigation on login page or when not authenticated
  if (pathname === '/login' || !session) {
    return null;
  }
  
  return <Navigation />;
}