import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import { RoleBadge } from '../common/RoleBadge';
import { UserPlus, Users, Lock } from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { users, inviteUser, permissions } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('junior_accountant');

  if (!permissions.canInviteUsers) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xs border border-rose-200 space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-ink-900">User Provisioning Restricted</h3>
        <p className="text-xs text-ink-500 leading-relaxed">
          Security Policy (Section 3): User provisioning is invite-by-email and Owner/Admin-only. Public self sign-up is disabled, and only Owner/Admin can assign or alter staff designations.
        </p>
      </div>
    );
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const res = inviteUser(email, role, name);
    if (res.success) {
      showToast(res.message, 'success');
      setEmail('');
      setName('');
      setRole('junior_accountant');
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-600" />
            Staff User Provisioning &amp; Role Assignments
          </h2>
          <p className="text-xs text-ink-500">
            Invite-only by Owner/Admin. Non-admin users see only a fixed read-only designation label on their profile.
          </p>
        </div>

        <div className="text-xs text-ink-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
          Provisioned Staff: <strong>{users.length} authenticated users</strong>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Staff Member via Email
        </h3>

        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Email Address <span className="text-rose-600">*</span>
            </label>
            <input
              type="email"
              placeholder="e.g. buyer@coastalmarine.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Staff Member Name</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Nair"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">
              Assigned Role (Owner/Admin Control) <span className="text-rose-600">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-rose-600 outline-none"
            >
              <option value="junior_accountant">3. Junior Accountant (Harbour Entry)</option>
              <option value="master_accountant">2. Master Accountant (Full, No Delete)</option>
              <option value="viewer">4. Management / Viewer (Read-Only)</option>
              <option value="admin">1. Owner / Admin (Full Access &amp; Surveillance)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition"
            >
              Send Invite
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-ink-500 uppercase border-b border-gray-200">
                <th className="py-2.5 px-4">Staff Member</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Designation (Visible on Profile)</th>
                <th className="py-2.5 px-4">Security Role</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-900">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-rose-50/20">
                  <td className="py-3 px-4 font-bold text-ink-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-xs">
                      {u.name.charAt(0)}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3 px-4 text-ink-500">{u.email}</td>
                  <td className="py-3 px-4 font-semibold text-ink-700">{u.designation}</td>
                  <td className="py-3 px-4">
                    <RoleBadge role={u.role} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
