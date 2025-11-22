'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '/dashboard.svg' },
    { href: '/transactions', label: 'Transactions', icon: '/transactions.svg' },
    { href: '/upload', label: 'Upload', icon: '/upload.svg' },
    { href: '/create', label: 'Create', icon: '/create.svg' },
  ];

  // Don't render navigation if no session or on login page
  if (!session || pathname === '/login') {
    return null;
  }

  return (
    <nav className="bg-black shadow-md ml-4 my-6 p-3 rounded-2xl">
      <div className="flex flex-col justify-between h-full">
        {/* Top Section - Logo/Profile */}
        <div className="flex flex-col items-center mb-6">
          {session?.user && (
            <div className="mb-4">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-gray-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {session.user.name?.[0] || session.user.email?.[0] || 'U'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav Items */}
        <div className="flex flex-col space-y-4 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md transition ${
                pathname === item.href
                  ? 'bg-gray-800'
                  : 'hover:bg-gray-700'
              }`}
              title={item.label}
            >
              <Image
                src={item.icon}
                alt={item.label}
                width={30}
                height={30}
              />
            </Link>
          ))}
        </div>

        {/* Bottom Section - Logout */}
        <div className="flex items-center justify-center mt-6">
          {session?.user && (
            <button
              onClick={() => signOut()}
              className="px-3 py-2 rounded-md hover:bg-red-800 transition"
              title="Sign Out"
            >
              <Image 
                src="/logout.svg" 
                alt="Logout" 
                width={24} 
                height={24} 
              />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}