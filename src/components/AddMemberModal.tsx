/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Add / Manage Members Modal
 * Specification 3: Add friends via contact list, phone number, shareable link & QR code
 */

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  QrCode,
  Link2,
  Copy,
  Check,
  Search,
  Phone,
  Mail,
  Users,
} from 'lucide-react';
import { Group, User } from '../models/types.ts';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  availableUsers: User[];
  onAddMember: (groupId: string, user: User) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  group,
  availableUsers,
  onAddMember,
}) => {
  const [tab, setTab] = useState<'contacts' | 'new' | 'share'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  if (!isOpen) return null;

  const currentMemberIds = group.members.map((m) => m.id);
  const eligibleContacts = availableUsers.filter(
    (u) =>
      !currentMemberIds.includes(u.id) &&
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery))
  );

  const handleCopyInviteLink = () => {
    navigator.clipboard?.writeText(`https://equalpay.dev/join/${group.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newName.trim(),
      phone: newPhone.trim() || '+1 555 000 0000',
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@equalpay.dev`,
      baseCurrency: group.defaultCurrency,
      avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + (Date.now() % 1000000)}?w=150&auto=format&fit=crop&q=80`,
      createdAt: new Date().toISOString(),
    };

    onAddMember(group.id, newUser);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Members to {group.name}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {group.members.length} members currently in group
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 text-xs">
          <button
            onClick={() => setTab('contacts')}
            className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
              tab === 'contacts'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Contacts ({eligibleContacts.length})
          </button>
          <button
            onClick={() => setTab('new')}
            className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
              tab === 'new'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New Friend
          </button>
          <button
            onClick={() => setTab('share')}
            className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
              tab === 'share'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Invite Link / QR
          </button>
        </div>

        {/* Tab 1: Existing Contacts */}
        {tab === 'contacts' && (
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {eligibleContacts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                  No matching contacts available to add.
                </div>
              ) : (
                eligibleContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={contact.avatarUrl}
                        alt={contact.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {contact.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {contact.phone} • {contact.email}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onAddMember(group.id, contact)}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: New Friend Form */}
        {tab === 'new' && (
          <form onSubmit={handleCreateAndAdd} className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. David Kim"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="+1 (415) 555-0199"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="david.kim@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!newName.trim()}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md mt-2"
            >
              Create & Add Member
            </button>
          </form>
        )}

        {/* Tab 3: Shareable Invite Link & QR */}
        {tab === 'share' && (
          <div className="p-4 space-y-4 text-center">
            <div className="w-36 h-36 mx-auto bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              <QrCode className="w-28 h-28 text-slate-900 dark:text-white" />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share this QR code or invite link. Anyone who opens it can join{' '}
              <strong className="text-slate-900 dark:text-white">{group.name}</strong> instantly.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="text"
                readOnly
                value={`https://equalpay.dev/join/${group.id}`}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-300 flex-1 font-mono focus:outline-none px-1"
              />
              <button
                onClick={handleCopyInviteLink}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
