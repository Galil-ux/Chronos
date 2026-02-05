
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PlusIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  Cog6ToothIcon, 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  EnvelopeIcon,
  SparklesIcon,
  TrashIcon,
  Bars3Icon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO,
  addMinutes
} from 'date-fns';
import { CalendarEvent, UserAccount, EventType, UserSettings } from './types';
import { EVENT_COLORS, STORAGE_KEY, DEFAULT_SETTINGS } from './constants';
import { smartParseEvent } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSmartMode, setIsSmartMode] = useState(false);
  const [smartPrompt, setSmartPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setEvents(data.events || []);
        setAccounts(data.accounts || []);
        setSettings(data.settings || DEFAULT_SETTINGS);
      } catch (e) {
        console.error("Error loading saved data", e);
      }
    } else {
      setAccounts([{
        id: 'default',
        name: 'My Calendar',
        email: 'primary@example.com',
        provider: 'personal',
        active: true
      }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events, accounts, settings }));
  }, [events, accounts, settings]);

  // --- Handlers ---
  const handleAddAccount = () => {
    const trimmed = newEmail.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    const newAcc: UserAccount = {
      id: Math.random().toString(36).substr(2, 9),
      name: trimmed.split('@')[0],
      email: trimmed,
      provider: 'personal',
      active: true
    };
    setAccounts(prev => [...prev, newAcc]);
    setNewEmail('');
  };

  const handleBackup = () => {
    const data = JSON.stringify({ events, accounts, settings }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronos_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.events && data.accounts) {
          setEvents(data.events);
          setAccounts(data.accounts);
          setSettings(data.settings || DEFAULT_SETTINGS);
          alert("Restore successful!");
        }
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
    if (editingEvent?.id) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventData } as CalendarEvent : e));
    } else {
      const newEv: CalendarEvent = {
        id: Math.random().toString(36).substr(2, 9),
        title: eventData.title || 'New Event',
        description: eventData.description || '',
        startTime: eventData.startTime || new Date().toISOString(),
        endTime: eventData.endTime || addMinutes(new Date(eventData.startTime || new Date()), settings.defaultDuration).toISOString(),
        type: eventData.type || EventType.EVENT,
        accountId: eventData.accountId || accounts.find(a => a.active)?.id || 'default',
        color: eventData.color || EVENT_COLORS[0].value,
      };
      setEvents(prev => [...prev, newEv]);
    }
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSmartAdd = async () => {
    if (!smartPrompt) return;
    setIsAIProcessing(true);
    const parsed = await smartParseEvent(smartPrompt);
    setIsAIProcessing(false);
    if (parsed) {
      handleSaveEvent({
        ...parsed,
        color: parsed.type === 'BIRTHDAY' ? '#f43f5e' : EVENT_COLORS[0].value
      });
      setSmartPrompt('');
      setIsSmartMode(false);
    } else {
      alert("AI couldn't parse that. Try something simpler like 'Lunch with John next Friday at 2pm'");
    }
  };

  // --- UI Components ---
  const renderHeader = () => {
    return (
      <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center space-x-2 md:space-x-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 md:hidden hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="flex flex-col md:flex-row md:items-baseline md:space-x-2">
            <h2 className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight leading-none">
              {format(currentDate, 'MMMM')}
            </h2>
            <span className="text-sm md:text-lg text-slate-400 font-medium">{format(currentDate, 'yyyy')}</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1 ml-2">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setSelectedDate(now);
              }}
              className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {settings.enableAI && (
            <button 
              onClick={() => { setIsSmartMode(true); setIsModalOpen(true); }}
              className="flex items-center justify-center w-9 h-9 md:w-auto md:px-4 md:py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-medium border border-indigo-100"
              title="AI Smart Add"
            >
              <SparklesIcon className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Smart Add</span>
            </button>
          )}
          <button 
            onClick={() => { 
              setIsSmartMode(false); 
              setEditingEvent(null);
              setIsModalOpen(true); 
            }}
            className="flex items-center justify-center w-9 h-9 md:w-auto md:px-4 md:py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-md shadow-indigo-200"
            title="New Event"
          >
            <PlusIcon className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">New Event</span>
          </button>
        </div>
      </header>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: settings.startOfWeek as any });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: settings.startOfWeek as any });

    const rows = [];
    let days = [];
    let day = startDate;

    const activeAccountIds = accounts.filter(a => a.active).map(a => a.id);

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const formattedDate = format(day, 'd');
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        
        const dayEvents = events.filter(e => 
          isSameDay(parseISO(e.startTime), cloneDay) && 
          activeAccountIds.includes(e.accountId)
        );

        if (!settings.showWeekends && isWeekend) {
           // Skip if settings say hide weekends
        } else {
            days.push(
              <div
                key={day.toString()}
                className={`min-h-[50px] md:min-h-[120px] p-0.5 md:p-2 border-r border-b border-slate-100 relative group transition-all cursor-pointer flex flex-col ${
                  !isCurrentMonth ? 'bg-slate-50/40 opacity-40' : 'bg-white'
                } ${isSelected ? 'bg-indigo-50/50 z-10 ring-2 ring-inset ring-indigo-500/20' : 'hover:bg-slate-50/30'}`}
                onClick={() => setSelectedDate(cloneDay)}
              >
                <div className="flex flex-col items-center md:items-start h-full">
                  <span className={`inline-flex items-center justify-center w-6 h-6 md:w-7 md:h-7 text-[10px] md:text-sm font-bold rounded-full transition-colors ${
                    isToday 
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-100' 
                      : isSelected
                        ? 'bg-indigo-100 text-indigo-700'
                        : isCurrentMonth 
                          ? 'text-slate-700' 
                          : 'text-slate-300'
                  }`}>
                    {formattedDate}
                  </span>
                  
                  {/* Desktop View: Labels */}
                  <div className="hidden md:block space-y-1 w-full mt-1 overflow-y-auto max-h-[85px] scrollbar-hide">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(event);
                          setIsModalOpen(true);
                        }}
                        style={{ borderLeftColor: event.color }}
                        className="px-2 py-0.5 text-[9px] bg-white border border-slate-100 border-l-[3px] rounded shadow-sm hover:shadow-md transition-shadow truncate flex items-center group/item"
                      >
                        <span className="font-bold text-slate-700 truncate">{event.title}</span>
                      </div>
                    ))}
                  </div>

                  {/* Mobile View: Minimal Indicators */}
                  <div className="md:hidden flex flex-wrap justify-center gap-0.5 mt-auto pb-1 w-full max-w-full overflow-hidden px-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div 
                        key={event.id}
                        className="w-1.5 h-1.5 rounded-full shadow-xs"
                        style={{ backgroundColor: event.color }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                    )}
                  </div>
                </div>
              </div>
            );
        }
        day = addDays(day, 1);
      }
      rows.push(<div className={`grid ${settings.showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`} key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="flex-1 overflow-y-auto bg-slate-100/30">{rows}</div>;
  };

  const selectedDayEvents = useMemo(() => {
    const activeAccountIds = accounts.filter(a => a.active).map(a => a.id);
    return events
      .filter(e => isSameDay(parseISO(e.startTime), selectedDate) && activeAccountIds.includes(e.accountId))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, selectedDate, accounts]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative font-sans text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Responsive Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl transition-all duration-300 ease-in-out transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex border-r border-slate-800
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Chronos</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500 hover:text-white transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-8 scrollbar-hide">
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Accounts</h3>
              <UserGroupIcon className="w-4 h-4 text-slate-600" />
            </div>
            <div className="space-y-1.5 mb-4">
              {accounts.length === 0 && (
                <p className="px-2 text-xs text-slate-500 italic">No accounts added yet.</p>
              )}
              {accounts.map(acc => (
                <div 
                  key={acc.id} 
                  className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all ${acc.active ? 'bg-slate-800 text-white shadow-lg' : 'hover:bg-slate-800/40'}`}
                  onClick={() => setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, active: !a.active } : a))}
                >
                  <EnvelopeIcon className={`w-4 h-4 mr-3 ${acc.active ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <div className="flex-1 truncate">
                    <p className="text-sm font-bold truncate leading-tight">{acc.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{acc.email}</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ml-2 shadow-sm ${acc.active ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
                </div>
              ))}
            </div>
            <div className="px-2">
              <div className="relative group">
                <input 
                  type="email" 
                  placeholder="Connect email..."
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                  className="w-full bg-slate-800 border-none rounded-xl py-2.5 pl-3 pr-10 text-xs focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 transition-all text-white shadow-inner"
                />
                <button 
                  onClick={handleAddAccount}
                  className="absolute right-2 top-1.5 p-1 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg"
                >
                  <PlusIcon className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Data Tools</h3>
            <div className="space-y-1.5">
              <button 
                onClick={handleBackup}
                className="w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all text-left"
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-3 text-slate-600" />
                Export Backup
              </button>
              <label className="w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all cursor-pointer">
                <ArrowDownTrayIcon className="w-4 h-4 mr-3 text-slate-600" />
                Import Data
                <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
              </label>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center px-4 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all group"
          >
            <Cog6ToothIcon className="w-5 h-5 mr-3 group-hover:rotate-45 transition-transform duration-500" />
            App Settings
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderHeader()}
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
          {/* Calendar Grid Container */}
          <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-slate-200">
            <div className={`grid ${settings.showWeekends ? 'grid-cols-7' : 'grid-cols-5'} border-b border-slate-100 bg-slate-50/50`}>
              {(settings.showWeekends ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']).map((day, idx) => (
                <div key={idx} className="py-2 text-center text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>
            {renderCells()}
          </div>

          {/* Selected Day View (Sidebar) */}
          <div className="h-72 md:h-auto md:w-[340px] flex flex-col bg-white shadow-2xl z-10">
            <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  {format(selectedDate, 'EEEE')}
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{format(selectedDate, 'MMMM d, yyyy')}</p>
              </div>
              <button 
                onClick={() => {
                  setEditingEvent({
                    id: '',
                    title: '',
                    description: '',
                    startTime: selectedDate.toISOString(),
                    endTime: addMinutes(selectedDate, settings.defaultDuration).toISOString(),
                    type: EventType.EVENT,
                    accountId: accounts.find(a => a.active)?.id || 'default',
                    color: EVENT_COLORS[0].value
                  });
                  setIsModalOpen(true);
                }}
                className="w-10 h-10 flex items-center justify-center bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <PlusIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <CalendarIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  <h5 className="text-sm font-bold text-slate-700 mb-1">Clear Schedule</h5>
                  <p className="text-xs text-slate-400 font-medium">No events found for this day. Tap the + icon to add one.</p>
                </div>
              ) : (
                selectedDayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => {
                      setEditingEvent(event);
                      setIsModalOpen(true);
                    }}
                    className="group relative flex items-stretch bg-white border border-slate-100 rounded-2xl transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
                  >
                    <div 
                      className="w-1.5" 
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1 p-4 min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate mb-0.5">{event.title}</p>
                      <div className="flex items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider space-x-2">
                        <span>{format(parseISO(event.startTime), 'h:mm a')}</span>
                        <span className="text-slate-300">•</span>
                        <span>{event.type}</span>
                      </div>
                      {event.description && (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">{event.description}</p>
                      )}
                    </div>
                    <div className="pr-3 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEvents(prev => prev.filter(ev => ev.id !== event.id));
                          }}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-3xl overflow-hidden border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center">
                  <Cog6ToothIcon className="w-6 h-6 mr-3 text-indigo-600" />
                  App Settings
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Show Weekends</h4>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">Toggle weekend visibility on the calendar grid</p>
                      </div>
                      <button 
                        onClick={() => setSettings({...settings, showWeekends: !settings.showWeekends})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.showWeekends ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showWeekends ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                   </div>
                   
                   <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Enable AI Assistant</h4>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">Unlock natural language event parsing with Gemini</p>
                      </div>
                      <button 
                        onClick={() => setSettings({...settings, enableAI: !settings.enableAI})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableAI ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableAI ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                   </div>

                   <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-slate-800">Default Duration</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 60, 90].map(duration => (
                          <button 
                            key={duration}
                            onClick={() => setSettings({...settings, defaultDuration: duration})}
                            className={`py-2 text-xs font-bold rounded-xl border transition-all ${settings.defaultDuration === duration ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                          >
                            {duration}m
                          </button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-slate-800">Start of Week</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setSettings({...settings, startOfWeek: 0})}
                          className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${settings.startOfWeek === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                          Sunday
                        </button>
                        <button 
                          onClick={() => setSettings({...settings, startOfWeek: 1})}
                          className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${settings.startOfWeek === 1 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                          Monday
                        </button>
                      </div>
                   </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] text-center mb-2">Chronos Calendar v2.1.0</p>
                 <button 
                   onClick={() => setIsSettingsOpen(false)}
                   className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                 >
                   Save & Close
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full h-full md:h-auto md:max-w-xl md:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center">
                {isSmartMode ? <SparklesIcon className="w-6 h-6 mr-3 text-indigo-600" /> : <PlusIcon className="w-6 h-6 mr-3 text-indigo-600" />}
                {isSmartMode ? 'Smart Event AI' : (editingEvent?.id ? 'Modify Event' : 'Create Event')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 md:max-h-[80vh] scrollbar-hide">
              {isSmartMode ? (
                <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <p className="text-xs text-indigo-700 font-bold uppercase tracking-widest mb-1">How it works</p>
                    <p className="text-sm text-indigo-900 leading-relaxed font-medium">
                      Tell Chronos what's happening. Try: <span className="italic">"Team lunch at 1pm next Tuesday"</span> or <span className="italic">"Mom's birthday July 15th"</span>.
                    </p>
                  </div>
                  <div className="relative">
                    <textarea 
                      placeholder="Type your event details..."
                      value={smartPrompt}
                      onChange={(e) => setSmartPrompt(e.target.value)}
                      className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-base font-medium resize-none transition-all"
                      autoFocus
                    />
                    {isAIProcessing && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                         <div className="flex flex-col items-center">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
                            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest animate-pulse">Processing Event...</p>
                         </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <button 
                      onClick={handleSmartAdd}
                      disabled={isAIProcessing || !smartPrompt.trim()}
                      className="flex items-center justify-center w-full py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black uppercase tracking-widest text-xs disabled:opacity-40 shadow-xl shadow-indigo-100 active:scale-[0.98]"
                    >
                      {isAIProcessing ? 'Analyzing...' : 'Generate with AI'}
                    </button>
                    <button 
                      onClick={() => setIsSmartMode(false)}
                      className="w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
                    >
                      Wait, let me enter manually
                    </button>
                  </div>
                </div>
              ) : (
                <EventForm 
                  initialData={editingEvent || undefined} 
                  accounts={accounts}
                  defaultDuration={settings.defaultDuration}
                  onSave={handleSaveEvent} 
                  onCancel={() => setIsModalOpen(false)} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Component: Event Form ---
interface EventFormProps {
  initialData?: CalendarEvent;
  accounts: UserAccount[];
  defaultDuration: number;
  onSave: (data: Partial<CalendarEvent>) => void;
  onCancel: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ initialData, accounts, defaultDuration, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<CalendarEvent>>(
    initialData || {
      title: '',
      description: '',
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(addMinutes(new Date(), defaultDuration), "yyyy-MM-dd'T'HH:mm"),
      type: EventType.EVENT,
      color: EVENT_COLORS[0].value,
      accountId: accounts.find(a => a.active)?.id || accounts[0]?.id || 'default'
    }
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Event Title</label>
        <input 
          type="text" 
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
          placeholder="Sync with Design Team"
          autoFocus
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Date & Time Start</label>
          <input 
            type="datetime-local" 
            value={formData.startTime?.substring(0, 16)}
            onChange={(e) => setFormData({ ...formData, startTime: new Date(e.target.value).toISOString() })}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Date & Time End</label>
          <input 
            type="datetime-local" 
            value={formData.endTime?.substring(0, 16)}
            onChange={(e) => setFormData({ ...formData, endTime: new Date(e.target.value).toISOString() })}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Category</label>
          <select 
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all appearance-none"
          >
            {Object.values(EventType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Account</label>
          <select 
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none text-sm font-bold text-slate-700 transition-all appearance-none"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Color Badge</label>
        <div className="flex flex-wrap gap-4">
          {EVENT_COLORS.map(color => (
            <button
              key={color.value}
              type="button"
              onClick={() => setFormData({ ...formData, color: color.value })}
              className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl transition-all relative ${formData.color === color.value ? 'ring-4 ring-offset-4 ring-indigo-500 scale-110 shadow-xl' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
              style={{ backgroundColor: color.value }}
            >
               {formData.color === color.value && <CheckIcon className="w-5 h-5 text-white absolute inset-0 m-auto" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Notes & Location</label>
        <textarea 
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full h-32 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none text-sm font-medium resize-none transition-all leading-relaxed"
          placeholder="Paste address or meeting link here..."
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
        <button 
          onClick={onCancel}
          className="w-full sm:w-auto px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
        >
          Discard
        </button>
        <button 
          onClick={() => onSave(formData)}
          className="w-full sm:w-auto px-12 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 active:scale-95 transition-all"
        >
          {initialData?.id ? 'Update Event' : 'Confirm Event'}
        </button>
      </div>
    </div>
  );
};

export default App;
