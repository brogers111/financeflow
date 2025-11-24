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

  return (
    <nav className="sticky top-6 border-2 border-[#E8ECED] ml-4 my-6 p-3 rounded-2xl h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex flex-col items-center mb-6">
        {session?.user && (
          <div className="my-4">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                width={50}
                height={50}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold">
                {session.user.name?.[0] || session.user.email?.[0] || 'U'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-4 flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-2 py-2 rounded-md flex justify-center items-center transition cursor-pointer ${
              pathname === item.href
                ? 'border-2 border-gray-200'
                : 'hover:bg-gray-100'
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

      <div className="flex items-center justify-center mt-6">
        {session?.user && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="my-2 px-3 py-2 rounded-md hover:bg-red-900 transition cursor-pointer"
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
    </nav>
  );
}