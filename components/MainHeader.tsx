'use client'

import Link from 'next/link'
import { LogOut, Settings, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { signOutAction } from "@/app/actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function MainHeader({ isLoggedIn, companyName, logoUrl }: { isLoggedIn: boolean; companyName?: string; logoUrl?: string }) {
  const pathname = usePathname()
  const isCategoryPage = pathname?.startsWith('/category')
  const isBoilerPage = pathname?.startsWith('/boiler')

  if (isCategoryPage || isBoilerPage) {
    return null
  }

  return (
    <>
      <header className="bg-white -sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-4 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center">
              <span className="text-blue-600 font-semibold text-xl">Quote AI</span>
            </Link>
            
            {/* Company name with profile picture dropdown or sign in button */}
            <div>
              {isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">
                    {companyName || 'Company'}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors overflow-hidden">
                        {logoUrl ? (
                          <img 
                            src={logoUrl} 
                            alt="Profile"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <User className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/partner/profile" className="w-full flex items-center text-gray-600 hover:text-gray-700 cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <form action={signOutAction} className="w-full">
                          <button
                            type="submit"
                            className="w-full flex items-center text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                          </button>
                        </form>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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