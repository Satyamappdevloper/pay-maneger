/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pay Manager: Robust User Avatar Component
 * Guarantees no empty string ("") is ever passed to the src attribute (React 19 safe),
 * with initials fallback and load-error handling.
 */

import React, { useState } from 'react';

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  title?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User',
  className = 'w-8 h-8 rounded-full object-cover',
  title,
}) => {
  const [imageError, setImageError] = useState(false);
  const trimmed = typeof src === 'string' ? src.trim() : '';
  const validSrc = trimmed.length > 0 ? trimmed : null;

  if (!validSrc || imageError) {
    const initial = (name && name.trim().length > 0) ? name.trim().charAt(0).toUpperCase() : '?';
    return (
      <div
        className={`${className} flex items-center justify-center font-bold text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-900/60 select-none border border-teal-500/20 shrink-0`}
        title={title || name}
      >
        <span className="text-[10px] leading-none">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={validSrc}
      alt={name || 'User'}
      title={title || name}
      className={className}
      onError={() => setImageError(true)}
    />
  );
};
