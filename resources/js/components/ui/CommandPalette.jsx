import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Search, ArrowRight, Users, Calendar, Heart, Pill, Moon,
    ClipboardList, Settings, AlertTriangle, FileText, LayoutDashboard,
    Sparkles, ShoppingCart, Flame, BarChart3, History, CalendarClock,
    Stethoscope, Wrench, Briefcase, Building2,
} from 'lucide-react';
import api from '../../services/api';

const ADMIN_COMMANDS = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { id: 'residents-hub', label: 'Residents', path: '/my-residents', icon: Users, category: 'Hubs' },
    { id: 'clinical-hub', label: 'Clinical', path: '/clinical', icon: Stethoscope, category: 'Hubs' },
    { id: 'operations-hub', label: 'Operations', path: '/operations', icon: Wrench, category: 'Hubs' },
    { id: 'management-hub', label: 'Management', path: '/management', icon: Briefcase, category: 'Hubs' },
    { id: 'organization-hub', label: 'Organization', path: '/organization', icon: Building2, category: 'Hubs' },
    { id: 'team-hub', label: 'Team & compliance', path: '/team', icon: Users, category: 'Hubs' },
    { id: 'system-hub', label: 'System', path: '/administration', icon: Settings, category: 'Hubs' },
    { id: 'residents', label: 'Residents (admin)', path: '/organization/residents', icon: Users, category: 'Organization' },
    { id: 'medications', label: 'Medications', path: '/medications', icon: Pill, category: 'Care' },
    { id: 'vitals', label: 'Vitals', path: '/vitals', icon: Heart, category: 'Care' },
    { id: 'appointments', label: 'Appointments', path: '/appointments', icon: Calendar, category: 'Care' },
    { id: 'assessments', label: 'Assessments', path: '/assessments', icon: ClipboardList, category: 'Care' },
    { id: 'sleep', label: 'Sleep Records', path: '/sleep', icon: Moon, category: 'Care' },
    { id: 'incidents', label: 'Incidents', path: '/incidents', icon: AlertTriangle, category: 'Care' },
    { id: 'reports', label: 'Reports', path: '/reports', icon: FileText, category: 'Reports' },
    { id: 'users', label: 'Users', path: '/team/users', icon: Users, category: 'Team & compliance' },
    { id: 'settings', label: 'Settings', path: '/profile', icon: Settings, category: 'Settings' },
];

const CAREGIVER_COMMANDS = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
    { id: 'residents-hub', label: 'Residents', path: '/my-residents', icon: Users, category: 'Hubs' },
    { id: 'clinical-hub', label: 'Clinical', path: '/clinical', icon: Stethoscope, category: 'Hubs' },
    { id: 'operations-hub', label: 'Operations', path: '/operations', icon: Wrench, category: 'Hubs' },
    { id: 'management-hub', label: 'Management', path: '/management', icon: Briefcase, category: 'Hubs' },
    { id: 'reports-hub', label: 'Reports', path: '/reports', icon: FileText, category: 'Hubs' },
    { id: 'my-residents', label: 'My Residents', path: '/my-residents', icon: Users, category: 'Care' },
    { id: 'medication-log', label: 'Medication Log', path: '/medications/residents', icon: Pill, category: 'Clinical' },
    { id: 'medication-history', label: 'Medication History', path: '/medication-history', icon: History, category: 'Clinical' },
    { id: 'vitals', label: 'Vitals', path: '/vitals', icon: Heart, category: 'Clinical' },
    { id: 'sleep', label: 'Sleep Records', path: '/sleep', icon: Moon, category: 'Clinical' },
    { id: 'progress-notes', label: 'T-Logs', path: '/t-logs', icon: FileText, category: 'Care' },
    { id: 'appointments', label: 'Appointments', path: '/appointments', icon: Calendar, category: 'Care' },
    { id: 'incidents', label: 'Incidents', path: '/incidents', icon: AlertTriangle, category: 'Operations' },
    { id: 'housekeeping', label: 'Housekeeping', path: '/housekeeping', icon: Sparkles, category: 'Operations' },
    { id: 'grocery', label: 'Grocery Status', path: '/grocery-status', icon: ShoppingCart, category: 'Operations' },
    { id: 'fire-drills', label: 'Fire Drills', path: '/fire-drills', icon: Flame, category: 'Operations' },
    { id: 'leave', label: 'Leave Requests', path: '/leave-requests', icon: CalendarClock, category: 'Operations' },
    { id: 'behavior', label: 'Behavior Charts', path: '/charts', icon: BarChart3, category: 'Care' },
];

function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

export default function CommandPalette({ isOpen, onClose, isCaregiver = false }) {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const debouncedSearch = useDebounce(search.trim(), 300);
    const shouldSearchResidents = debouncedSearch.length >= 2;

    const commands = isCaregiver ? CAREGIVER_COMMANDS : ADMIN_COMMANDS;

    // Live resident search
    const { data: residentResults, isFetching: searchingResidents } = useQuery({
        queryKey: ['command-palette-residents', debouncedSearch],
        queryFn: async () => {
            const response = await api.get('/residents', {
                params: { search: debouncedSearch, per_page: 6, is_active: 1 },
            });
            const rows = response.data?.data ?? response.data ?? [];
            return Array.isArray(rows) ? rows : [];
        },
        enabled: isOpen && shouldSearchResidents,
        staleTime: 30 * 1000,
    });

    // Build flat result list: matched commands first, then residents
    const allResults = React.useMemo(() => {
        const query = search.toLowerCase().trim();
        const matchedCmds = query
            ? commands.filter(c =>
                c.label.toLowerCase().includes(query) ||
                c.category.toLowerCase().includes(query)
            )
            : commands;

        const residentItems = (residentResults ?? []).map(r => ({
            id: `resident-${r.id}`,
            label: [r.first_name, r.middle_names, r.last_name].filter(Boolean).join(' '),
            sublabel: [r.branch?.name, r.room_number ? `Room ${r.room_number}` : null].filter(Boolean).join(' · '),
            path: isCaregiver ? `/my-residents/${r.id}` : `/organization/residents/${r.id}`,
            icon: Users,
            category: 'Resident',
            isResident: true,
        }));

        return [...residentItems, ...matchedCmds];
    }, [search, commands, residentResults, isCaregiver]);

    // Group results by category for display
    const groupedResults = React.useMemo(() => {
        const groups = {};
        allResults.forEach((item, idx) => {
            const cat = item.category;
            if (!groups[cat]) groups[cat] = { items: [], startIndex: idx };
            groups[cat].items.push({ ...item, flatIndex: idx });
        });
        return groups;
    }, [allResults]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setSearch('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [debouncedSearch]);

    const handleSelect = useCallback((item) => {
        navigate(item.path);
        onClose();
    }, [navigate, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && allResults[selectedIndex]) {
                handleSelect(allResults[selectedIndex]);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, allResults, selectedIndex, onClose, handleSelect]);

    // Scroll selected item into view
    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
        >
            <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:pt-24">
                <div
                    className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Search Input */}
                    <div className="flex items-center px-4 py-3.5 border-b border-gray-100 gap-3">
                        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                        <input
                            ref={inputRef}
                            type="text"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={allResults.length > 0}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={isCaregiver ? 'Search residents, pages…' : 'Search pages and navigate…'}
                            className="flex-1 outline-none text-gray-900 placeholder-gray-400 text-sm"
                        />
                        {searchingResidents && (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-[var(--theme-primary)] rounded-full animate-spin flex-shrink-0" aria-label="Searching…" />
                        )}
                        <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs bg-gray-100 rounded text-gray-500">Esc</kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-[26rem] overflow-y-auto" role="listbox" ref={listRef}>
                        {allResults.length === 0 && !searchingResidents ? (
                            <div className="px-4 py-12 text-center">
                                <p className="text-sm font-medium text-gray-900">No results</p>
                                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                            </div>
                        ) : (
                            Object.entries(groupedResults).map(([category, group]) => (
                                <div key={category}>
                                    <div className="px-4 pt-3 pb-1">
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{category}</span>
                                    </div>
                                    {group.items.map(item => {
                                        const Icon = item.icon;
                                        const isSelected = item.flatIndex === selectedIndex;
                                        return (
                                            <button
                                                key={item.id}
                                                data-idx={item.flatIndex}
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() => handleSelect(item)}
                                                onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none
                                                    ${isSelected
                                                        ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                                        : 'hover:bg-gray-50 text-gray-900'}`}
                                            >
                                                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} aria-hidden="true" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                                        {item.label}
                                                    </p>
                                                    {item.sublabel && (
                                                        <p className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                                                            {item.sublabel}
                                                        </p>
                                                    )}
                                                </div>
                                                {isSelected && <ArrowRight className="w-4 h-4 text-white flex-shrink-0" aria-hidden="true" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500">↑</kbd>
                                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500">↓</kbd>
                                navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500">↵</kbd>
                                select
                            </span>
                        </div>
                        <span>{allResults.length} result{allResults.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
