import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { 
  User, 
  LogOut, 
  Settings, 
  Mail, 
  Calendar, 
  Users, 
  ChevronDown,
  Bell
} from 'lucide-react'

export const UserMenu = () => {
  const { user, userProfile, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return '?'
    
    const parts = user.email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return user.email.substring(0, 2).toUpperCase()
  }
  
  const handleSignOut = async () => {
    await signOut()
  }
  
  if (!user) return null
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
          {getUserInitials()}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User info */}
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.email}
            </p>
            <p className="text-xs text-gray-500">
              {userProfile?.role === 'admin' ? 'Family Admin' : 'Family Member'}
            </p>
          </div>
          
          {/* Menu items */}
          <div className="py-1">
            <Link
              to="/dashboard"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <Calendar className="h-4 w-4 mr-3 text-gray-500" />
              Dashboard
            </Link>
            
            {userProfile?.role === 'admin' && (
              <Link
                to="/dashboard"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  // Open family management modal
                  setIsOpen(false)
                }}
              >
                <Users className="h-4 w-4 mr-3 text-gray-500" />
                Manage Family
              </Link>
            )}
            
            <Link
              to="/notification-preferences"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <Bell className="h-4 w-4 mr-3 text-gray-500" />
              Notification Settings
            </Link>
            
            <Link
              to="/email-preferences"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <Mail className="h-4 w-4 mr-3 text-gray-500" />
              Email Preferences
            </Link>
            
            <Link
              to="/account-settings"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4 mr-3 text-gray-500" />
              Account Settings
            </Link>
          </div>
          
          {/* Sign out */}
          <div className="py-1 border-t border-gray-100">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-3 text-gray-500" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}