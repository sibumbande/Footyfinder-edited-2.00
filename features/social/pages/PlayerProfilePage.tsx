
import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Shield, Zap, Calendar, Trophy, Target, CheckCheck, ShieldCheck, Users, Activity, User } from 'lucide-react';
import { getUserById, getPlayerMatchStats, getTrainingStats } from '../../../frontend/api';

interface PlayerProfilePageProps {
  userId: string;
  onBack: () => void;
}

const positionAbbr: Record<string, string> = {
  'Goalkeeper': 'GK',
  'Defender': 'DEF',
  'Midfielder': 'MID',
  'Forward': 'FWD',
};

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

export const PlayerProfilePage: React.FC<PlayerProfilePageProps> = ({ userId, onBack }) => {
  const [player, setPlayer] = useState<{
    id: string; username: string; fullName: string; avatarUrl: string | null;
    position: string | null; fitnessLevel: string | null; city: string | null;
    bio: string | null; dateOfBirth: string | null; isVerified: boolean; yearsPlaying: number;
  } | null>(null);
  const [stats, setStats] = useState<{
    totalMatches: number; totalGoals: number; totalAssists: number;
    wins: number; losses: number; draws: number; cleanSheets: number; averageRating: number | null;
  } | null>(null);
  const [trainingCount, setTrainingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [userData, statsData, trainingData] = await Promise.all([
          getUserById(userId),
          getPlayerMatchStats(userId),
          getTrainingStats(userId),
        ]);
        setPlayer(userData.user as any);
        setStats(statsData);
        setTrainingCount(trainingData.trainingSessions);
      } catch {
        // silently fail — show what we have
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-24 md:pt-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 md:pt-20">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Player not found.</p>
          <button onClick={onBack} className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest">Go Back</button>
        </div>
      </div>
    );
  }

  const age = player.dateOfBirth ? calcAge(player.dateOfBirth) : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20">
      {/* Banner */}
      <div className="bg-blue-900 h-28 md:h-40 relative">
        <div className="max-w-3xl mx-auto px-4 relative h-full flex items-start pt-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-xs font-black uppercase tracking-wider transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Player card */}
        <div className="relative -mt-10 md:-mt-14 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-200 shrink-0">
              {player.avatarUrl ? (
                <img src={player.avatarUrl} alt={player.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={36} className="text-slate-300" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">{player.fullName}</h1>
                {player.isVerified ? (
                  <CheckCheck size={20} className="text-blue-600 shrink-0" title="Identity Verified" />
                ) : (
                  <ShieldCheck size={20} className="text-slate-300 shrink-0" />
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                {player.username && <span>@{player.username}</span>}
                {player.city && <span className="flex items-center gap-1"><MapPin size={11} /> {player.city}</span>}
                {age !== null && <span className="flex items-center gap-1"><Calendar size={11} /> {age} yrs</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 mb-8">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6">On-Pitch Metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-5 bg-emerald-50 rounded-[24px] border border-emerald-100 text-center">
                <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mb-2">Matches</p>
                <p className="text-2xl font-black text-slate-900">{stats.totalMatches}</p>
              </div>
              <div className="p-5 bg-amber-50 rounded-[24px] border border-amber-100 text-center">
                <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest mb-2">Goals</p>
                <p className="text-2xl font-black text-slate-900">{stats.totalGoals}</p>
              </div>
              <div className="p-5 bg-rose-50 rounded-[24px] border border-rose-100 text-center">
                <p className="text-[9px] text-rose-600 font-black uppercase tracking-widest mb-2">Assists</p>
                <p className="text-2xl font-black text-slate-900">{stats.totalAssists}</p>
              </div>
              <div className="p-5 bg-teal-50 rounded-[24px] border border-teal-100 text-center">
                <p className="text-[9px] text-teal-600 font-black uppercase tracking-widest mb-2">Clean Sheets</p>
                <p className="text-2xl font-black text-slate-900">{stats.cleanSheets}</p>
              </div>
              <div className="p-5 bg-purple-50 rounded-[24px] border border-purple-100 text-center">
                <p className="text-[9px] text-purple-600 font-black uppercase tracking-widest mb-2">Training</p>
                <p className="text-2xl font-black text-slate-900">{trainingCount}</p>
              </div>
            </div>
            {/* W/D/L */}
            <div className="flex gap-4 mt-6 pt-6 border-t border-slate-100">
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Wins</p>
                <p className="text-xl font-black text-slate-900">{stats.wins}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Draws</p>
                <p className="text-xl font-black text-slate-900">{stats.draws}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Losses</p>
                <p className="text-xl font-black text-slate-900">{stats.losses}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bio sidebar info */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6">Player Bio</h2>
          <div className="space-y-3">
            {player.position && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <Shield size={14} className="text-blue-600 shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Position</p>
                  <p className="text-sm font-black text-slate-900">{player.position}</p>
                </div>
              </div>
            )}
            {player.fitnessLevel && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <Zap size={14} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Fitness Level</p>
                  <p className="text-sm font-black text-slate-900">{player.fitnessLevel}</p>
                </div>
              </div>
            )}
            {player.city && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">City</p>
                  <p className="text-sm font-black text-slate-900">{player.city}</p>
                </div>
              </div>
            )}
            {(player.dateOfBirth || player.yearsPlaying > 0) && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <div>
                  {player.dateOfBirth && calcAge(player.dateOfBirth) !== null && (
                    <div className="mb-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Age</p>
                      <p className="text-sm font-black text-slate-900">{calcAge(player.dateOfBirth)} years old</p>
                    </div>
                  )}
                  {player.yearsPlaying > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Experience</p>
                      <p className="text-sm font-black text-slate-900">{player.yearsPlaying} {player.yearsPlaying === 1 ? 'year' : 'years'} playing</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {player.bio && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">About</p>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">{player.bio}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
