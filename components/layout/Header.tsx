'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, User, LogOut, ArrowLeft, Settings, Lock, UserCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { ProfilePicture } from '@/components/profile/ProfilePicture'

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [userRole, setUserRole] = useState<string>('user')
  const [accountData, setAccountData] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch user role and account data
  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        try {
          // Get user role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select(`
              roles!inner(role_name)
            `)
            .eq('user_id', user.id)
            .single();
          
          if (roleData?.roles && typeof roleData.roles === 'object' && 'role_name' in roleData.roles) {
            setUserRole(roleData.roles.role_name as string);
          }

          // Get account data
          const { data: accountInfo } = await supabase
            .from('accounts')
            .select('name, status, phone_number')
            .eq('id', user.id)
            .single();
          
          if (accountInfo) {
            setAccountData(accountInfo);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    }
    
    fetchUserData();
  }, [user])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive" className="text-xs bg-purple-100 text-purple-800">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Admin</Badge>;
      case 'user':
      default:
        return <Badge variant="outline" className="text-xs">User</Badge>;
    }
  }

  const getUserInitials = () => {
    if (accountData?.name) {
      return accountData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Hamburger menu for mobile */}
          <button
            className="md:hidden mr-3 p-2 rounded focus:outline-none hover:bg-slate-100"
            onClick={onMenuClick}
            aria-label="Open sidebar menu"
            type="button"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu h-7 w-7"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
          </button>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              className="pl-10 w-96"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                <ProfilePicture
                  name={accountData?.name}
                  email={user?.email}
                  pictureUrl={accountData?.picture_url}
                  size="sm"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {isMounted ? (
                <>
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <ProfilePicture
                          name={accountData?.name}
                          email={user?.email}
                          pictureUrl={accountData?.picture_url}
                          size="sm"
                        />
                        <div className="flex flex-col">
                          <p className="text-sm font-medium">
                            {accountData?.name || 'User'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user?.auth_method === 'phone' ? user?.phone : user?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {getRoleBadge(userRole)}
                        {user?.auth_method && (
                          <p className="text-xs text-slate-400 capitalize">
                            via {user.auth_method}
                          </p>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Profile Management Options */}
                  <DropdownMenuItem onSelect={() => router.push('/portal/profile')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push('/portal/profile?tab=password')}>
                    <Lock className="mr-2 h-4 w-4" />
                    <span>Change Password</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push('/portal/profile?tab=preferences')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Preferences</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Navigation Options */}
                  <DropdownMenuItem onSelect={() => router.push('/')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <span>Back to Website</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Sign Out */}
                  <DropdownMenuItem onSelect={signOut} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Loading...</p>
                  </div>
                </DropdownMenuLabel>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}