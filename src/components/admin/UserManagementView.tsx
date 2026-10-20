import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { User, UserRole } from '../../types';
import { RoleBadge } from '../common/RoleBadge';
import { Modal } from '../common/Modal';
import { UserPlus, Users, Lock, Trash2, Pencil, AlertTriangle, ShieldCheck } from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { users, inviteUser, deleteUser, updateUser, currentUser, permissions } = useAuth();
  const { logAudit } = useData();
  const { showToast } = useToast();

  // Invite Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('junior_accountant');

  // Delete Modal State
  const [targetUserToDelete, setTargetUserToDelete] = useState<User | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Edit Modal State
  const [targetUserToEdit, setTargetUserToEdit] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('junior_accountant');
  const [editDesignation, setEditDesignation] = useState('');

  if (!permissions.canInviteUsers && !permissions.canManageStaff) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xs border border-rose-200 space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-ink-900">Staff Management Restricted</h3>
        <p className="text-xs text-ink-500 leading-relaxed">
          Security Policy: User provisioning, role assignments, and staff decommissioning are strictly reserved for Owner / Admin accounts. Non-admin users cannot alter staff records.
        </p>
      </div>
    );
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const res = inviteUser(email, role, name);
    if (res.success) {
      if (res.newUser) {
        logAudit('CREATE', 'Staff Member', res.newUser.email, {
          newValues: res.newUser,
          changeReason: 'Staff invited by Owner/Admin'
        });
      }
      showToast(res.message, 'success');
      setEmail('');
      setName('');
      setRole('junior_accountant');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleConfirmDelete = () => {
    if (!targetUserToDelete) return;

    const res = deleteUser(targetUserToDelete.id);
    if (res.success) {
      logAudit('DELETE', 'Staff Member', targetUserToDelete.email, {
        oldValues: targetUserToDelete,
        changeReason: deleteReason.trim() || 'Staff account removed and decommissioned by Owner/Admin'
      });
      showToast(res.message, 'success');
      setTargetUserToDelete(null);
      setDeleteReason('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleOpenEdit = (u: User) => {
    setTargetUserToEdit(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditDesignation(u.designation);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserToEdit) return;

    const res = updateUser(targetUserToEdit.id, {
      name: editName,
      role: editRole,
      designation: editDesignation
    });

    if (res.success) {
      logAudit('EDIT', 'Staff Member', targetUserToEdit.email, {
        oldValues: targetUserToEdit,
        newValues: res.updatedUser || { name: editName, role: editRole, designation: editDesignation },
        changeReason: 'Staff designation / role updated by Owner/Admin'
      });
      showToast(res.message, 'success');
      setTargetUserToEdit(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-600" />
            Staff User Provisioning &amp; Role Management
          </h2>
          <p className="text-xs text-ink-500">
            Full Owner/Admin control: Invite new personnel, update designations, and remove or decommission staff members at any time.
          </p>
        </div>

        <div className="text-xs text-ink-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
          Provisioned Staff: <strong>{users.length} active accounts</strong>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Invite / Provision New Staff Member
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
              Assigned Security Role <span className="text-rose-600">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-rose-600 outline-none"
            >
              <option value="junior_accountant">3. Junior Accountant (Harbour Field Entry)</option>
              <option value="master_accountant">2. Master Accountant (Full, No Delete)</option>
              <option value="viewer">4. Management / Viewer (Read-Only Observer)</option>
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
                <th className="py-2.5 px-4">Email Address</th>
                <th className="py-2.5 px-4">Designation</th>
                <th className="py-2.5 px-4">Security Role</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-ink-900">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-rose-50/20 transition">
                    <td className="py-3 px-4 font-bold text-ink-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="ml-2 text-[10px] text-rose-600 font-semibold">(Current User)</span>
                        )}
                      </div>
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
                    <td className="py-3 px-4 text-center">
                      {isSelf ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200"
                          title="Active session cannot remove itself"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Active Session
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title={`Edit designation or role for ${u.name}`}
                            className="p-1.5 text-ink-600 hover:text-ink-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setTargetUserToDelete(u);
                              setDeleteReason('');
                            }}
                            title={`Remove and decommission ${u.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELETE / REMOVE STAFF MODAL */}
      {targetUserToDelete && (
        <Modal
          isOpen={!!targetUserToDelete}
          onClose={() => {
            setTargetUserToDelete(null);
            setDeleteReason('');
          }}
          title="Remove Staff Member"
          subtitle="Owner/Admin Security Authorization"
          maxWidth="max-w-md"
        >
          <div className="p-6 space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-rose-900">Revoke Staff Access</p>
                <p className="mt-1 text-rose-800 leading-relaxed">
                  Are you sure you want to permanently remove <strong>{targetUserToDelete.name}</strong> (
                  <span className="font-mono">{targetUserToDelete.email}</span>)?
                </p>
                <div className="mt-2 text-[11px] text-rose-700 bg-white/60 p-2 rounded-lg border border-rose-200/60">
                  <p>Designation: <strong>{targetUserToDelete.designation}</strong></p>
                  <p>Security Role: <strong className="capitalize">{targetUserToDelete.role.replace('_', ' ')}</strong></p>
                </div>
                <p className="mt-2 text-rose-800">
                  This user will immediately lose system credentials and access rights. This action is permanently logged to the Surveillance Audit Trail.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">
                Reason for Removal <span className="text-ink-400 font-normal">(Optional for audit trail)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Employee resigned, Role decommissioned"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setTargetUserToDelete(null);
                  setDeleteReason('');
                }}
                className="px-4 py-2 font-semibold text-ink-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Remove Staff
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT STAFF MODAL */}
      {targetUserToEdit && (
        <Modal
          isOpen={!!targetUserToEdit}
          onClose={() => setTargetUserToEdit(null)}
          title={`Edit Staff: ${targetUserToEdit.name}`}
          subtitle="Update Designation & Security Role"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Email Address (Read-only)</label>
              <input
                type="text"
                value={targetUserToEdit.email}
                disabled
                className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-ink-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Staff Member Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Designation Label (Profile title)</label>
              <input
                type="text"
                placeholder="e.g. Managing Partner, Senior Buyer"
                value={editDesignation}
                onChange={(e) => setEditDesignation(e.target.value)}
                required
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-rose-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Security Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-rose-600 outline-none"
              >
                <option value="junior_accountant">3. Junior Accountant (Harbour Field Entry)</option>
                <option value="master_accountant">2. Master Accountant (Full, No Delete)</option>
                <option value="viewer">4. Management / Viewer (Read-Only Observer)</option>
                <option value="admin">1. Owner / Admin (Full Access &amp; Surveillance)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTargetUserToEdit(null)}
                className="px-4 py-2 font-semibold text-ink-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
