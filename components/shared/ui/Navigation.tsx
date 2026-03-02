
import React from 'react';
import { Home, User, Target, LogOut, LayoutDashboard, Dumbbell, Users, Bell } from 'lucide-react';
import { Logo } from './Logo';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='100' r='45' fill='%23CBD5E1'/%3E%3Ccircle cx='50' cy='35' r='22' fill='%23CBD5E1'/%3E%3C/svg%3E";

interface NavigationProps {
  activeTab: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userAvatar?: string;
  notificationCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onNavigate, onLogout, userAvatar, notificationCount = 0 }) => {
  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="hidden md:flex fixed top-0 w-full bg-white border-b border-gray-200 z-50 px-8 py-3 justify-between items-center shadow-sm">
        <div className="cursor-pointer" onClick={() => onNavigate('home')}>
          <Logo className="h-10" />
        </div>
        
        <div className="flex gap-8">
          <button 
            onClick={() => onNavigate('home')} 
            className={`${activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-gray-500'} hover:text-blue-600 transition-colors text-sm font-black uppercase tracking-widest`}
          >
            Home
          </button>
          <button 
            onClick={() => onNavigate('matchmaking')} 
            className={`${activeTab === 'matchmaking' ? 'text-blue-600 font-bold' : 'text-gray-500'} hover:text-blue-600 transition-colors text-sm font-black uppercase tracking-widest`}
          >
            Matchmaking
          </button>
          <button 
            onClick={() => onNavigate('training')} 
            className={`${activeTab === 'training' ? 'text-blue-600 font-bold' : 'text-gray-500'} hover:text-blue-600 transition-colors text-sm font-black uppercase tracking-widest`}
          >
            Training
          </button>
          <button 
            onClick={() => onNavigate('social')} 
            className={`${activeTab === 'social' ? 'text-blue-600 font-bold' : 'text-gray-500'} hover:text-blue-600 transition-colors text-sm font-black uppercase tracking-widest`}
          >
            Social
          </button>
          <button 
            onClick={() => onNavigate('dashboard')} 
            className={`${activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-gray-500'} hover:text-blue-600 transition-colors text-sm font-black uppercase tracking-widest`}
          >
            Teams
          </button>
        </div>

        <div className="flex items-center gap-4">
           <button
            onClick={() => onNavigate('notifications')}
            className={`relative ${activeTab === 'notifications' ? 'text-blue-600' : 'text-gray-500'} hover:text-blue-600 transition-colors`}
            title="Notifications"
           >
             <Bell size={22} />
             {notificationCount > 0 && (
               <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                 {notificationCount > 99 ? '99+' : notificationCount}
               </span>
             )}
           </button>
           <button
            onClick={() => onNavigate('profile')}
            className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:text-blue-600 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-700'}`}
           >
             <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border-2 border-transparent group-hover:border-blue-500">
               <img src={userAvatar || DEFAULT_AVATAR} alt="Profile" className="w-full h-full object-cover" />
             </div>
             Profile
           </button>
           <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition-colors">
             <LogOut size={20} />
           </button>
        </div>
      </nav>

      {/* Mobile Bottom Navbar */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 px-6 py-3 flex justify-between items-center pb-safe shadow-lg">
        <button 
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
        </button>
        
        <button 
          onClick={() => onNavigate('matchmaking')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'matchmaking' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Target size={22} strokeWidth={activeTab === 'matchmaking' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Play</span>
        </button>

        <button 
          onClick={() => onNavigate('social')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'social' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Users size={22} strokeWidth={activeTab === 'social' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Social</span>
        </button>

        <button 
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <LayoutDashboard size={22} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Teams</span>
        </button>

        <button
          onClick={() => onNavigate('notifications')}
          className={`relative flex flex-col items-center gap-1 ${activeTab === 'notifications' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Bell size={22} strokeWidth={activeTab === 'notifications' ? 2.5 : 2} />
          {notificationCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
          <span className="text-[9px] font-black uppercase tracking-tighter">Alerts</span>
        </button>
        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <User size={22} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Profile</span>
        </button>
      </nav>
    </>
  );
};
