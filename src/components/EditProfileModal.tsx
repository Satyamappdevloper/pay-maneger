/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pay Manager: Profile Editor & Persona Customization Modal
 */

import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Phone, DollarSign, Image, Check, RotateCcw } from 'lucide-react';
import { User } from '../models/types.ts';
import { SUPPORTED_CURRENCIES } from '../engines/currency.ts';
import { UserAvatar, DEFAULT_AVATAR } from './UserAvatar.tsx';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave: (updated: Partial<User>) => void;
}

const PRESET_AVATARS = [
  {
    label: 'Warm Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    label: 'Modern Minimal',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    label: 'Creative Professional',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    label: 'Tech Specialist',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    label: 'Designer Stylist',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const [name, setName] = useState<string>(currentUser.name || '');
  const [email, setEmail] = useState<string>(currentUser.email || '');
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [baseCurrency, setBaseCurrency] = useState<string>(currentUser.baseCurrency || 'USD');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser.avatarUrl || PRESET_AVATARS[0].url);
  const [showCustomAvatar, setShowCustomAvatar] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setBaseCurrency(currentUser.baseCurrency || 'USD');
      setAvatarUrl(currentUser.avatarUrl || PRESET_AVATARS[0].url);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      baseCurrency,
      avatarUrl,
    });
    onClose();
  };

  const handleApplyPresetSatyam = () => {
    setName('Satyam (You)');
    setEmail('satyamthumbnaidesigner@gmail.com');
    setPhone('+1 (415) 555-0192');
    setBaseCurrency('USD');
    setAvatarUrl(PRESET_AVATARS[0].url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Customize Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your display name, email, and preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick Preset Buttons */}
          <div className="flex items-center justify-between gap-2 p-3 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 rounded-2xl">
            <div className="text-xs">
              <span className="font-bold text-teal-900 dark:text-teal-200">Preferred Preset:</span>
              <p className="text-[11px] text-teal-700 dark:text-teal-400">Satyam (satyamthumbnaidesigner@gmail.com)</p>
            </div>
            <button
              type="button"
              onClick={handleApplyPresetSatyam}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Apply Preset</span>
            </button>
          </div>

          {/* Avatar Preview & Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Profile Avatar
            </label>
            <div className="flex items-center gap-4">
              <UserAvatar
                src={avatarUrl || DEFAULT_AVATAR}
                name={name || 'Avatar'}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-teal-500 shadow-md shadow-teal-500/10 shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_AVATARS.map((avatar, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        setAvatarUrl(avatar.url);
                        setShowCustomAvatar(false);
                      }}
                      className={`relative w-8 h-8 rounded-xl overflow-hidden border-2 transition-all ${
                        avatarUrl === avatar.url && !showCustomAvatar
                          ? 'border-teal-500 ring-2 ring-teal-500/30 scale-105'
                          : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                      {avatarUrl === avatar.url && !showCustomAvatar && (
                        <div className="absolute inset-0 bg-teal-600/40 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowCustomAvatar(!showCustomAvatar)}
                    className={`px-2.5 py-1 text-xs rounded-xl border font-semibold transition-colors flex items-center gap-1 ${
                      showCustomAvatar
                        ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    <Image className="w-3 h-3" />
                    <span>Custom URL</span>
                  </button>
                </div>

                {showCustomAvatar && (
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="mt-2 w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Display Name *
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Satyam (You)"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-white transition-colors"
              />
            </div>
          </div>

          {/* Email Address Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. satyamthumbnaidesigner@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-white transition-colors"
              />
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (415) 555-0192"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-white transition-colors"
              />
            </div>
          </div>

          {/* Base Currency Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Default Base Currency
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-white transition-colors cursor-pointer"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900">
                    {c.flag} {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
