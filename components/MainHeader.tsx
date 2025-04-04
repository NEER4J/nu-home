'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function MainHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname()
  const isCategoryPage = pathname?.startsWith('/category')

  if (isCategoryPage) {
    return null
  }

  return (
    <>
      <header className="bg-white -sm border-b border-gray-200">
        <div className="px-4 sm:px-4 lg:px-4">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center">
              <span className="text-blue-600 font-bold text-xl">Nu-Home</span>
            </Link>
            
            {/* Sign in/out button */}
            <div>
              {isLoggedIn ? (
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </button>
                </form>
              ) : (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

   
    </>
  )
} 