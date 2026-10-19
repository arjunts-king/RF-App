import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';

interface AuthContextType {
  currentUser: User;
  users: User[];
  switchUserRole: (role: UserRole) => void;
  inviteUser: (email: string, role: UserRole, name?: string) => { success: boolean; message: string };
  permissions: {
    isOwnerAdmin: boolean;
    isMasterAccountant: boolean;
    isJuniorAccountant: boolean;
    isViewer: boolean;
    canPermanentlyDelete: boolean;
    canVoid: boolean;
    canManageMasterData: boolean;
    canManagePayments: boolean;
    canCreateEditPurchases: boolean;
    canViewAuditLog: boolean;
    canInviteUsers: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('seafood_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedRole = localStorage.getItem('seafood_current_role') as UserRole;
    if (savedRole) {
      const match = users.find((u) => u.role === savedRole);
      if (match) return match;
    }
    return users[0]; // Default: Owner/Admin
  });

  useEffect(() => {
    localStorage.setItem('seafood_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('seafood_current_role', currentUser.role);
  }, [currentUser]);

  const switchUserRole = (targetRole: UserRole) => {
    const matchedUser = users.find((u) => u.role === targetRole);
    if (matchedUser) {
      setCurrentUser(matchedUser);
    } else {
      // Create a temporary user object with that role
      const newUser: User = {
        id: `usr-${Date.now()}`,
        email: `${targetRole}@coastalmarine.com`,
        name:
          targetRole === 'admin'
            ? 'Captain Rajesh Nair (Admin)'
            : targetRole === 'master_accountant'
            ? 'Suresh Menon (Master Acct)'
            : targetRole === 'junior_accountant'
            ? 'Arun Kumar (Jr Acct)'
            : 'Priya Sharma (Management)',
        role: targetRole,
        designation:
          targetRole === 'admin'
            ? 'Managing Director & Owner'
            : targetRole === 'master_accountant'
            ? 'Chief Financial Officer'
            : targetRole === 'junior_accountant'
            ? 'Field Purchase Officer'
            : 'Operations Director',
        createdAt: new Date().toISOString()
      };
      setCurrentUser(newUser);
    }
  };

  const inviteUser = (email: string, role: UserRole, name?: string): { success: boolean; message: string } => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Unauthorized: Only Owner/Admin can invite users and assign roles.' };
    }

    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }

    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { success: false, message: `A user with email ${email} already exists.` };
    }

    const designationMap: Record<UserRole, string> = {
      admin: 'Managing Partner / Admin',
      master_accountant: 'Senior Finance Manager',
      junior_accountant: 'Harbour Purchase Officer',
      viewer: 'Executive Observer'
    };

    const newUser: User = {
      id: `usr-${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: name?.trim() || email.split('@')[0],
      role,
      designation: designationMap[role],
      createdAt: new Date().toISOString()
    };

    setUsers((prev) => [...prev, newUser]);
    return { success: true, message: `Invitation email dispatched to ${email} with designation ${designationMap[role]}.` };
  };

  const permissions = {
    isOwnerAdmin: currentUser.role === 'admin',
    isMasterAccountant: currentUser.role === 'master_accountant',
    isJuniorAccountant: currentUser.role === 'junior_accountant',
    isViewer: currentUser.role === 'viewer',

    // Strict authority constraints defined in Prompt Section 3:
    canPermanentlyDelete: currentUser.role === 'admin', // ONLY Owner/Admin can permanently delete
    canVoid: currentUser.role === 'admin' || currentUser.role === 'master_accountant', // Master Accountant may void
    canManageMasterData: currentUser.role === 'admin' || currentUser.role === 'master_accountant',
    canManagePayments: currentUser.role === 'admin' || currentUser.role === 'master_accountant',
    canCreateEditPurchases: currentUser.role === 'admin' || currentUser.role === 'master_accountant' || currentUser.role === 'junior_accountant',
    canViewAuditLog: currentUser.role === 'admin', // EXCLUSIVE Owner/Admin surveillance view
    canInviteUsers: currentUser.role === 'admin'
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        switchUserRole,
        inviteUser,
        permissions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
