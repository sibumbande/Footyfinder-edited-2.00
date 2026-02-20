
import React, { useState } from 'react';
import { Search, UserPlus, Users, ShieldCheck, Heart, UserMinus, MessageSquare, Flame } from 'lucide-react';
import { SoccerProfile } from '../../../types';

interface SocialUIProps {
  friends: SoccerProfile[];
  onAddFriend: (profile: SoccerProfile) => void;
  onRemoveFriend: (id: string) => void;
  allProfiles: SoccerProfile[];
}

export const SocialUI: React.FC<SocialUIProps> = ({ friends, onAddFriend, onRemoveFriend, allProfiles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'friends'>('discover');

  const friendIds = friends.map(f => f.id);

  const discoverProfiles = allProfiles.filter(p =>
    !friendIds.includes(p.id) &&
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const myFriends = friends.filter(p =>
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-[48px] p-10 md:p-12 shadow-sm border border-slate-100 mb-10">
         <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Social Network</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Grow your connections & find potential recruits</p>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-[20px] gap-1">
               <button
                onClick={() => setActiveTab('discover')}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'discover' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Discover
               </button>
               <button
                onClick={() => setActiveTab('friends')}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Friend List ({friends.length})
               </button>
            </div>
         </div>

         <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search profiles by name..."
              className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-slate-50 rounded-[32px] focus:bg-white focus:border-blue-600 outline-none font-bold text-slate-900 shadow-inner transition-all"
            />
         </div>
      </div>

      {activeTab === 'discover' ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {discoverProfiles.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[48px] border border-slate-100">
                 <Users className="mx-auto text-slate-200 mb-4" size={64} />
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">No new profiles found in your area.</p>
              </div>
            ) : (
              discoverProfiles.map(profile => (
                <div key={profile.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                   <div className="flex flex-col items-center text-center">
                      <div className="relative mb-6">
                         <img src={profile.avatar} alt="" className="w-24 h-24 rounded-[32px] object-cover shadow-2xl group-hover:scale-105 transition-transform" />
                         <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-4 border-white">
                            <ShieldCheck size={16} />
                         </div>
                      </div>
                      <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight leading-none mb-2">{profile.fullName}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{profile.position}</p>

                      <div className="grid grid-cols-1 gap-2 w-full">
                        <button
                          onClick={() => onAddFriend(profile)}
                          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                        >
                           <UserPlus size={16} /> Add Friend
                        </button>
                      </div>
                   </div>
                   {/* Decorative background element */}
                   <div className="absolute -top-10 -left-10 w-24 h-24 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              ))
            )}
         </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
           {myFriends.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[48px] border border-slate-100">
                 <Heart className="mx-auto text-slate-200 mb-4" size={64} />
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed px-12">You haven't added any friends yet.<br/>Head to Discovery to build your network.</p>
              </div>
            ) : (
              myFriends.map(friend => (
                <div key={friend.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                   <div className="flex items-center gap-6">
                      <img src={friend.avatar} alt="" className="w-20 h-20 rounded-[24px] object-cover shadow-lg border-2 border-slate-50" />
                      <div className="flex-1 min-w-0">
                         <h3 className="text-base font-black uppercase text-slate-900 tracking-tight leading-none mb-1 truncate">{friend.fullName}</h3>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{friend.position}</p>
                         <div className="flex gap-2">
                            <button className="flex-1 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center">
                              <MessageSquare size={14}/>
                            </button>
                            <button
                              onClick={() => onRemoveFriend(friend.id)}
                              className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            >
                              <UserMinus size={14}/>
                            </button>
                         </div>
                      </div>
                   </div>
                   <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-blue-600/5 rounded-full blur-2xl"></div>
                </div>
              ))
            )}
        </div>
      )}
    </div>
  );
};
