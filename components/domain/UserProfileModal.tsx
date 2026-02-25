
import React, { useEffect, useState } from 'react';
import { X, MapPin, Zap, Shield, Loader2, User } from 'lucide-react';
import { getUserById } from '../../frontend/api';

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose }) => {
  const [user, setUser] = useState<{
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    position: string | null;
    fitnessLevel: string | null;
    city: string | null;
    bio: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setUser(null); return; }
    setLoading(true);
    getUserById(userId)
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-3xl animate-scale-in relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-3 bg-blue-600"></div>
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <X size={20} className="text-slate-400" />
        </button>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={40} className="animate-spin text-blue-500" />
          </div>
        ) : user ? (
          <div>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-24 h-24 rounded-[28px] overflow-hidden border-4 border-slate-50 shadow-xl bg-slate-100 mb-4">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={40} className="text-slate-300" />
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">
                {user.fullName}
              </h2>
              {user.username && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">@{user.username}</p>
              )}
            </div>

            <div className="space-y-3">
              {user.position && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <Shield size={16} className="text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Position</p>
                    <p className="text-sm font-black text-slate-900">{user.position}</p>
                  </div>
                </div>
              )}
              {user.fitnessLevel && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <Zap size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Fitness Level</p>
                    <p className="text-sm font-black text-slate-900">{user.fitnessLevel}</p>
                  </div>
                </div>
              )}
              {user.city && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <MapPin size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">City</p>
                    <p className="text-sm font-black text-slate-900">{user.city}</p>
                  </div>
                </div>
              )}
              {user.bio && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">About</p>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{user.bio}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <User size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Profile not found</p>
          </div>
        )}
      </div>
    </div>
  );
};
