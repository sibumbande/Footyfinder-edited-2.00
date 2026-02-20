
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ChevronRight, Calendar, X, Loader2, AlertCircle } from 'lucide-react';
import { FieldListing, BookingStatus, MatchLobby, TimeSlot } from '../../../types';
import { FieldCard } from '../../../components/domain/FieldCard';
import { getFields, getFieldById, getLobbies, ApiError } from '../../../frontend/api';

interface ApiField {
  id: string;
  name: string;
  location: string;
  city: string;
  imageUrl: string | null;
  pricePerSlot: number;
  surfaceType: string | null;
  capacity: number;
}

interface HomeProps {
  onNavigate?: (page: any, params?: any) => void;
  activeLobbies?: MatchLobby[];
  fields?: FieldListing[];
}

export const Home: React.FC<HomeProps> = ({ onNavigate, activeLobbies: propLobbies = [], fields: propFields = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFieldForTimetable, setSelectedFieldForTimetable] = useState<FieldListing | null>(null);

  // API-fetched state
  const [apiFields, setApiFields] = useState<FieldListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableSlots, setTimetableSlots] = useState<TimeSlot[]>([]);

  // Map API field to FieldListing shape
  const mapApiField = useCallback((f: ApiField): FieldListing => ({
    id: f.id,
    name: f.name,
    location: f.location,
    pricePerPlayer: f.pricePerSlot,
    imageUrl: f.imageUrl || 'https://picsum.photos/seed/' + f.id + '/600/400',
    rating: 4.5,
    nextMatchTime: '',
    playersJoined: 0,
    maxPlayers: f.capacity || 10,
    amenities: [],
  }), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFields();
      setApiFields(data.fields.map(mapApiField));
    } catch (err) {
      // Fall back to prop data silently
      setApiFields([]);
      setError(err instanceof ApiError ? err.message : 'Failed to load fields. Showing cached data.');
    } finally {
      setLoading(false);
    }
  }, [mapApiField]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Use API fields if available, otherwise fall back to props
  const fields = apiFields.length > 0 ? apiFields : propFields;

  const filteredFields = fields.filter(field =>
    field.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuickJoin = () => {
    if (onNavigate) {
      const sortedLobbies = [...propLobbies].sort((a, b) =>
        (b.joinedCount / b.totalSlots) - (a.joinedCount / a.totalSlots)
      );
      const bestLobby = sortedLobbies[0];
      onNavigate('matchmaking', { autoJoinLobby: bestLobby });
    }
  };

  const handleShowTimetable = async (field: FieldListing) => {
    setSelectedFieldForTimetable(field);
    setTimetableSlots([]);
    setTimetableLoading(true);

    try {
      const data = await getFieldById(field.id);
      const slots: TimeSlot[] = data.timetable.map(t => ({
        time: t.timeSlot,
        status: t.status === 'AVAILABLE' ? BookingStatus.AVAILABLE :
                t.status === 'BOOKED' ? BookingStatus.CONFIRMED :
                BookingStatus.PENDING,
        pendingLobbiesCount: t.lobbyId ? 1 : 0,
      }));
      setTimetableSlots(slots);
    } catch {
      // Fall back to local timetable from field props
      if (field.timetable) {
        setTimetableSlots(field.timetable);
      }
    } finally {
      setTimetableLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pt-20">
      <div className="sticky top-0 md:top-20 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search location (e.g., Sandton)"
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2.5 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700"><Filter size={20} /></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight uppercase">Ready to play?</h1>
            <p className="text-blue-100 mb-6 max-w-md">Join an arena now. The fastest squad to pay secures the slot!</p>
            <button onClick={handleQuickJoin} className="bg-white text-blue-700 px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-50 transition-all shadow-lg active:scale-95 text-sm uppercase tracking-widest">
              Join Quick Match <ChevronRight size={18} />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Available Fields</h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs font-bold text-amber-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-blue-500" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading fields...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFields.map((field) => (
              <FieldCard key={field.id} field={field} onShowTimetable={() => handleShowTimetable(field)} />
            ))}
            {filteredFields.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No fields found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedFieldForTimetable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
           <div className="bg-white rounded-[56px] p-10 max-w-2xl w-full shadow-3xl animate-scale-in relative max-h-[90vh] overflow-y-auto border border-white">
              <div className="flex justify-between items-start mb-8 sticky top-0 bg-white z-10 pb-4">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedFieldForTimetable.name}</h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                       <Calendar size={14} className="text-blue-500" /> Daily Availability Board
                    </p>
                 </div>
                 <button onClick={() => setSelectedFieldForTimetable(null)} className="text-slate-300 hover:text-slate-900 p-2"><X size={32}/></button>
              </div>

              {timetableLoading ? (
                <div className="py-16 flex justify-center"><Loader2 size={32} className="animate-spin text-slate-300" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                   {timetableSlots.map((slot, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          slot.status === BookingStatus.AVAILABLE ? 'bg-emerald-50 border-emerald-100' :
                          slot.status === BookingStatus.PENDING ? 'bg-amber-50 border-amber-100 shadow-lg shadow-amber-500/10' :
                          'bg-slate-100 border-slate-200'
                      }`}>
                         <span className="text-sm font-black text-slate-900">{slot.time}</span>
                         <span className={`text-[8px] font-black uppercase tracking-widest text-center ${
                            slot.status === BookingStatus.AVAILABLE ? 'text-emerald-600' :
                            slot.status === BookingStatus.PENDING ? 'text-amber-600' : 'text-slate-500'
                         }`}>
                            {slot.status === BookingStatus.PENDING && slot.pendingLobbiesCount > 0
                              ? `${slot.pendingLobbiesCount} Game${slot.pendingLobbiesCount > 1 ? 's' : ''} Recruiting`
                              : slot.status}
                         </span>
                      </div>
                   ))}
                   {timetableSlots.length === 0 && (
                     <div className="col-span-full py-8 text-center">
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No timetable data available.</p>
                     </div>
                   )}
                </div>
              )}

              <div className="bg-slate-50 rounded-3xl p-8 flex flex-wrap gap-6 items-center border border-slate-100">
                 <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-emerald-500"></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Available</span></div>
                 <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-amber-500"></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Race in Progress</span></div>
                 <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-slate-900"></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secured</span></div>
                 <div className="flex-1 flex justify-end text-[9px] font-bold text-slate-400 uppercase italic">Match is secured when the first full squad pays.</div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
