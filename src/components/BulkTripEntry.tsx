import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Plane, Search, ChevronDown, Globe } from 'lucide-react';
import { COUNTRIES, ALPHA2_TO_NUMERIC } from '../constants/onboarding';
import { NUMERIC_TO_CONTINENT } from '../constants/countries';
import { TravelLog } from '../types';
import { createPortal } from 'react-dom';

interface BulkTripEntryProps {
  birthDate?: string;
  onSave: (logs: Partial<TravelLog>[]) => Promise<void>;
  onClose: () => void;
}

interface TripRow {
  id: number;
  countryName: string;
  countryAlpha2: string;
  cityName: string;
  year: number;
  month?: number;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CountrySelect: React.FC<{
  value: string;
  alpha2: string;
  onChange: (name: string, alpha2: string) => void;
}> = ({ value, alpha2, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleClick = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(!open);
  };

  const dropdownContent = open && dropdownStyle && (
    <div 
      className="fixed bg-white border-2 border-gray-100 rounded-xl shadow-2xl overflow-hidden max-h-[200px] z-[99999]"
      style={{ top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width }}
    >
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none font-bold text-xs text-gray-900 placeholder-gray-400 w-full"
            autoFocus
            autoComplete="off"
            data-1p-ignore
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.alpha2}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange(c.name, c.alpha2);
              setOpen(false);
              setSearch('');
            }}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-green-50 transition-colors"
          >
            <img src={`https://flagcdn.com/w40/${c.alpha2}.png`} alt="" className="w-5 h-3.5 object-cover rounded-sm shadow-sm" />
            <span className="font-bold text-xs text-gray-700">{c.name}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-center text-gray-400 font-bold text-xs">No countries</div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-2.5 text-left flex items-center gap-2 hover:border-green-200 focus:border-green-400 outline-none transition-all text-sm"
      >
        {value ? (
          <>
            <img src={`https://flagcdn.com/w40/${alpha2}.png`} alt="" className="w-6 h-4 object-cover rounded-sm shadow-sm" />
            <span className="font-bold text-gray-700 truncate">{value}</span>
          </>
        ) : (
          <span className="text-gray-400 font-bold">Country</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
};

const BulkTripEntry: React.FC<BulkTripEntryProps> = ({ birthDate, onSave, onClose }) => {
  const [rows, setRows] = useState<TripRow[]>([
    { id: 1, countryName: '', countryAlpha2: '', cityName: '', year: currentYear - 1, month: undefined },
  ]);
  const [saving, setSaving] = useState(false);
  let nextId = useRef(2);

  const addRow = () => {
    setRows(prev => [...prev, {
      id: nextId.current++,
      countryName: '',
      countryAlpha2: '',
      cityName: '',
      year: currentYear - 1,
      month: undefined,
    }]);
  };

  const removeRow = (id: number) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: number, field: keyof TripRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const computeAge = (year: number): number => {
    if (!birthDate) return 25;
    const birthYear = new Date(birthDate).getFullYear();
    return year - birthYear;
  };

  const validRows = rows.filter(r => r.countryName && r.cityName && r.year);

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setSaving(true);
    try {
      const logs: Partial<TravelLog>[] = validRows.map(r => {
        const countryCode = ALPHA2_TO_NUMERIC[r.countryAlpha2] || '000';
        return {
          countryCode,
          countryName: r.countryName,
          cityName: r.cityName,
          year: r.year,
          month: r.month,
          continent: NUMERIC_TO_CONTINENT[countryCode] || 'Unknown',
          age: computeAge(r.year),
          createdAt: new Date().toISOString(),
        };
      });
      await onSave(logs);
      onClose();
    } catch (err) {
      console.error('Bulk save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative z-10 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white rounded-2xl sm:rounded-3xl border-4 border-green-100 shadow-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-visible"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 md:p-6 border-b-2 border-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight">Log Past Trips</h2>
              <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Add your travel history quickly</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Trip Rows */}
        <div className="overflow-y-auto p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 flex-1">
          <AnimatePresence>
            {rows.map((row, i) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-start gap-1.5 sm:gap-2 md:gap-3"
              >
                <span className="text-[9px] sm:text-[10px] font-black text-gray-300 uppercase mt-2.5 sm:mt-3 w-4 sm:w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 space-y-1.5 sm:space-y-2">
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <CountrySelect
                      value={row.countryName}
                      alpha2={row.countryAlpha2}
                      onChange={(name, alpha2) => {
                        updateRow(row.id, 'countryName', name);
                        updateRow(row.id, 'countryAlpha2', alpha2);
                      }}
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={row.cityName}
                      onChange={(e) => updateRow(row.id, 'cityName', e.target.value.slice(0, 100))}
                      maxLength={100}
                      autoComplete="off"
                      data-1p-ignore
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-2.5 font-bold text-xs sm:text-sm text-gray-900 focus:border-green-400 outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <select
                      value={row.month ?? ''}
                      onChange={(e) => updateRow(row.id, 'month', e.target.value ? Number(e.target.value) : undefined)}
                      className="bg-gray-50 border-2 border-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-2.5 font-bold text-[10px] sm:text-xs text-gray-900 focus:border-green-400 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Month</option>
                      {months.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                    </select>
                    <select
                      value={row.year}
                      onChange={(e) => updateRow(row.id, 'year', Number(e.target.value))}
                      className="bg-gray-50 border-2 border-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-2.5 font-bold text-xs sm:text-sm text-gray-700 focus:border-green-400 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  className="mt-2 p-1 sm:p-1.5 text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-4 sm:w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            onClick={addRow}
            className="w-full border-2 border-dashed border-gray-200 hover:border-green-300 rounded-lg sm:rounded-xl p-2.5 sm:p-3 flex items-center justify-center gap-1.5 sm:gap-2 text-gray-400 hover:text-green-600 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Add Another Trip
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 md:p-6 border-t-2 border-gray-50 flex items-center justify-between shrink-0 gap-2">
          <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
            {validRows.length} {validRows.length === 1 ? 'trip' : 'trips'} ready
          </p>
          <button
            onClick={handleSubmit}
            disabled={validRows.length === 0 || saving}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-black py-2.5 sm:py-3 px-4 sm:px-8 rounded-xl sm:rounded-2xl shadow-[0_3px_0_0_#16a34a] sm:shadow-[0_4px_0_0_#16a34a] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plane className="w-3.5 h-4 sm:w-4 sm:h-4" />
                Save All Trips
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BulkTripEntry;
