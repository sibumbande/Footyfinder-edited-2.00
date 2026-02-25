
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ChevronRight, Calendar, X, Loader2, AlertCircle, ChevronLeft, MapPin } from 'lucide-react';
import { FieldListing, BookingStatus, MatchLobby } from '../../../types';
import { FieldCard } from '../../../components/domain/FieldCard';
import { getFields, getFieldById, ApiError } from '../../../frontend/api';

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

interface TimetableEntry {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  lobbyId: string | null;
}

interface HomeProps {
  onNavigate?: (page: any, params?: any) => void;
  activeLobbies?: MatchLobby[];
  fields?: FieldListing[];
}

const CITY_ORDER = ['Cape Town', 'Johannesburg', 'Port Elizabeth'];

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    dayShort: d.toLocaleDateString('en-ZA', { weekday: 'short' }),
    dayNum: d.getDate(),
    monthShort: d.toLocaleDateString('en-ZA', { month: 'short' }),
    monthYear: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
    full: d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

function dayAvailabilityClass(slots: TimetableEntry[]) {
  const available = slots.filter(s => s.status === 'AVAILABLE').length;
  if (available === 0) return 'full';
  if (available < slots.length) return 'partial';
  return 'open';
}

export const Home: React.FC<HomeProps> = ({ onNavigate, activeLobbies: propLobbies = [], fields: propFields = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFieldForTimetable, setSelectedFieldForTimetable] = useState<FieldListing | null>(null);

  const [apiFields, setApiFields] = useState<FieldListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [rawTimetable, setRawTimetable] = useState<TimetableEntry[]>([]);
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null);

  const mapApiField = useCallback((f: ApiField): FieldListing => ({
    id: f.id,
    name: f.name,
    location: f.location,
    city: f.city,
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
      setApiFields([]);
      setError(err instanceof ApiError ? err.message : 'Failed to load fields. Showing cached data.');
    } finally {
      setLoading(false);
    }
  }, [mapApiField]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fields = apiFields.length > 0 ? apiFields : propFields;

  const filteredFields = fields.filter(field =>
    field.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered fields by city
  const fieldsByCity: Record<string, FieldListing[]> = {};
  for (const city of CITY_ORDER) {
    const cityFields = filteredFields.filter(f =>
      (f.city || '').toLowerCase() === city.toLowerCase()
    );
    if (cityFields.length > 0) fieldsByCity[city] = cityFields;
  }
  // Any fields not matching the 3 known cities
  const otherFields = filteredFields.filter(f =>
    !CITY_ORDER.some(c => c.toLowerCase() === (f.city || '').toLowerCase())
  );
  if (otherFields.length > 0) fieldsByCity['Other'] = otherFields;

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
    setRawTimetable([]);
    setCalSelectedDate(null);
    setTimetableLoading(true);

    try {
      const data = await getFieldById(field.id);
      setRawTimetable(data.timetable);
      // Auto-select the first available date
      const dates = [...new Set(data.timetable.map(t => t.date))].sort();
      if (dates.length > 0) setCalSelectedDate(dates[0]);
    } catch {
      if (field.timetable) {
        // Fallback: create mock entries for today only
        const today = new Date().toISOString().split('T')[0];
        setRawTimetable(field.timetable.map((s, i) => ({
          id: `s-${i}`,
          date: today,
          timeSlot: s.time,
          status: s.status === BookingStatus.AVAILABLE ? 'AVAILABLE' :
                  s.status === BookingStatus.CONFIRMED ? 'BOOKED' : 'PENDING',
          lobbyId: null,
        })));
        setCalSelectedDate(today);
      }
    } finally {
      setTimetableLoading(false);
    }
  };

  // Calendar helpers derived from rawTimetable
  const dateGroups = rawTimetable.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const sortedDates = Object.keys(dateGroups).sort();

  // Group dates by "Month Year"
  const monthGroups = sortedDates.reduce((acc, date) => {
    const label = formatDayLabel(date).monthYear;
    if (!acc[label]) acc[label] = [];
    acc[label].push(date);
    return acc;
  }, {} as Record<string, string[]>);

  const selectedSlots = calSelectedDate ? (dateGroups[calSelectedDate] || []) : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pt-20">
      <div className="sticky top-0 md:top-20 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search location or field name"
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

      {/* ── Fields Grouped by City ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Available Fields</h2>
        </div>

        {error && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs font-bold text-amber-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-blue-500" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading fields...</p>
          </div>
        ) : Object.keys(fieldsByCity).length > 0 ? (
          Object.entries(fieldsByCity).map(([city, cityFields]) => (
            <div key={city}>
              {/* City heading */}
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-600 p-2 rounded-xl">
                  <MapPin size={16} className="text-white" />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{city}</h3>
                <div className="flex-1 h-px bg-slate-100"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cityFields.length} field{cityFields.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cityFields.map((field) => (
                  <FieldCard key={field.id} field={field} onShowTimetable={() => handleShowTimetable(field)} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No fields found.</p>
          </div>
        )}
      </div>

      {/* ── Availability Calendar Modal ─────────────────────────────────────── */}
      {selectedFieldForTimetable && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[48px] p-8 max-w-2xl w-full shadow-3xl animate-scale-in relative max-h-[90vh] overflow-y-auto border border-white">

            {/* Modal header */}
            <div className="flex justify-between items-start mb-8 sticky top-0 bg-white z-10 pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedFieldForTimetable.name}</h2>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                  <Calendar size={12} className="text-blue-500" /> Availability Calendar
                </p>
              </div>
              <button
                onClick={() => { setSelectedFieldForTimetable(null); setCalSelectedDate(null); }}
                className="text-slate-300 hover:text-slate-900 p-2"
              >
                <X size={28} />
              </button>
            </div>

            {timetableLoading ? (
              <div className="py-16 flex justify-center"><Loader2 size={32} className="animate-spin text-slate-300" /></div>
            ) : sortedDates.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No availability data for this field.</p>
              </div>
            ) : (
              <>
                {/* ── Zoomed-in day view ──────────────────────────────────── */}
                {calSelectedDate ? (
                  <div className="animate-fade-in">
                    {/* Day header + back button */}
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        onClick={() => setCalSelectedDate(null)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        <ChevronLeft size={18} className="text-slate-700" />
                      </button>
                      <div>
                        <p className="text-base font-black text-slate-900 uppercase tracking-tight">
                          {formatDayLabel(calSelectedDate).full}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {selectedSlots.filter(s => s.status === 'AVAILABLE').length} of {selectedSlots.length} slots available
                        </p>
                      </div>
                    </div>

                    {/* Time slots grid for selected day */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                      {selectedSlots.map((slot, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            slot.status === 'AVAILABLE'
                              ? 'bg-emerald-50 border-emerald-100 hover:shadow-md cursor-pointer'
                              : slot.lobbyId
                              ? 'bg-amber-50 border-amber-100 shadow-sm shadow-amber-500/10'
                              : 'bg-slate-100 border-slate-200'
                          }`}
                        >
                          <span className="text-sm font-black text-slate-900">{slot.timeSlot}</span>
                          <span className={`text-[8px] font-black uppercase tracking-widest text-center ${
                            slot.status === 'AVAILABLE' ? 'text-emerald-600' :
                            slot.lobbyId ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            {slot.status === 'AVAILABLE' ? 'Available' :
                             slot.lobbyId ? 'Race in Progress' : 'Secured'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Day switcher row */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                      {sortedDates.map(date => {
                        const avClass = dayAvailabilityClass(dateGroups[date]);
                        const lbl = formatDayLabel(date);
                        const isActive = date === calSelectedDate;
                        return (
                          <button
                            key={date}
                            onClick={() => setCalSelectedDate(date)}
                            className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl transition-all text-center min-w-[52px] ${
                              isActive ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase">{lbl.dayShort}</span>
                            <span className="text-lg font-black leading-tight">{lbl.dayNum}</span>
                            <div className={`w-2 h-2 rounded-full mt-1 ${
                              avClass === 'open' ? 'bg-emerald-500' :
                              avClass === 'partial' ? 'bg-amber-500' : 'bg-slate-400'
                            } ${isActive ? 'opacity-60' : ''}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ── Calendar month view ──────────────────────────────── */
                  <div className="animate-fade-in space-y-8">
                    {Object.entries(monthGroups).map(([monthLabel, dates]) => (
                      <div key={monthLabel}>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{monthLabel}</h3>
                        <div className="flex flex-wrap gap-3">
                          {dates.map(date => {
                            const avClass = dayAvailabilityClass(dateGroups[date]);
                            const lbl = formatDayLabel(date);
                            const availCount = dateGroups[date].filter(s => s.status === 'AVAILABLE').length;
                            return (
                              <button
                                key={date}
                                onClick={() => setCalSelectedDate(date)}
                                className={`flex flex-col items-center p-4 rounded-3xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 min-w-[72px] ${
                                  avClass === 'open'
                                    ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400'
                                    : avClass === 'partial'
                                    ? 'border-amber-200 bg-amber-50 hover:border-amber-400'
                                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{lbl.dayShort}</span>
                                <span className="text-2xl font-black text-slate-900 leading-tight">{lbl.dayNum}</span>
                                <span className="text-[8px] font-black uppercase text-slate-400">{lbl.monthShort}</span>
                                <div className={`mt-2 text-[8px] font-black uppercase tracking-wider ${
                                  avClass === 'open' ? 'text-emerald-600' :
                                  avClass === 'partial' ? 'text-amber-600' : 'text-slate-400'
                                }`}>
                                  {avClass === 'full' ? 'Full' : `${availCount} slot${availCount !== 1 ? 's' : ''}`}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <p className="text-[9px] font-bold text-center text-slate-400 uppercase tracking-widest pt-2">
                      Tap a day to see available time slots
                    </p>
                  </div>
                )}

                {/* Legend */}
                <div className="mt-6 bg-slate-50 rounded-3xl p-5 flex flex-wrap gap-5 items-center border border-slate-100">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Available</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Race in Progress</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Secured</span></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
