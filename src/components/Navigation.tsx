'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const mainNavItems = [
    { href: '/', label: 'Dashboard', icon: '/dashboard.svg' },
    { href: '/transactions', label: 'Transactions', icon: '/transactions.svg' },
    { href: '/budget', label: 'Budget', icon: '/budget.svg' },
  ];

  const secondaryNavItems = [
    { href: '/upload', label: 'Upload', icon: '/upload.svg' },
    { href: '/edit', label: 'Edit', icon: '/edit.svg' },
  ];

  return (
    <>
      {/* Desktop Navigation - Sidebar */}
      <nav className="hidden md:sticky md:top-6 md:bg-[#EEEBD9] md:ml-4 md:my-6 md:p-1 md:rounded-2xl md:h-[calc(100vh-3rem)] md:flex md:flex-col">
        <div className="flex flex-col items-center mb-6">
          {session?.user && (
            <div className="my-2">
              {session.user.image ? (
                <Link href="/">
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </Link>
              ) : (
                <Link href="/">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-semibold">
                    {session.user.name?.[0] || session.user.email?.[0] || 'U'}
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-4 flex-1 overflow-y-auto">
          {[...mainNavItems, ...secondaryNavItems].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-1 py-2 rounded-md flex justify-center items-center transition cursor-pointer border-2 ${
                pathname === item.href
                  ? 'border-gray-400'
                  : 'border-transparent hover:border-gray-300'
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
              className="my-2 px-3 py-2 rounded-md border-2 border-transparent hover:border-2 hover:border-red-600 transition cursor-pointer"
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

      {/* Mobile Navigation - Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#EEEBD9] p-4 rounded-tl-2xl rounded-tr-2xl z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`p-2 rounded-md flex justify-center items-center transition cursor-pointer border-2 ${
                pathname === item.href
                  ? 'border-gray-400'
                  : 'border-transparent active:border-gray-300'
              }`}
              title={item.label}
            >
              <Image
                src={item.icon}
                alt={item.label}
                width={28}
                height={28}
              />
            </Link>
          ))}
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2 rounded-md border-2 border-transparent active:border-red-600 transition cursor-pointer"
              title="Sign Out"
            >
              <Image
                src="/logout.svg"
                alt="Logout"
                width={28}
                height={28}
              />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Navigation - Top Right Floating Actions */}
      <nav className="md:hidden fixed top-4 right-4 bg-[#EEEBD9] px-2 rounded-3xl z-50 flex gap-2">
        {secondaryNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`p-2 rounded-full flex justify-center items-center transition cursor-pointer border-2 ${
              pathname === item.href
                ? 'border-gray-400'
                : 'border-transparent active:border-gray-300'
            }`}
            title={item.label}
          >
            <Image
              src={item.icon}
              alt={item.label}
              width={24}
              height={24}
            />
          </Link>
        ))}
      </nav>
    </>
  );
}