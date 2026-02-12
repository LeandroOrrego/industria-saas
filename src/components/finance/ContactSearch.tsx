import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Loader2, User, Building2, Briefcase } from 'lucide-react';

export type ContactType = 'client' | 'provider' | 'employee';

export interface Contact {
    id: string;
    name: string;
    type: ContactType;
}

interface ContactSearchProps {
    value: Contact | null;
    onChange: (contact: Contact | null) => void;
}

export default function ContactSearch({ value, onChange }: ContactSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Create a debounced search function
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                searchContacts();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    async function searchContacts() {
        setLoading(true);
        const searchResults: Contact[] = [];
        const q = `%${query}%`;

        // 1. Clients
        const { data: clients } = await supabase
            .from('clients')
            .select('id, name')
            .ilike('name', q)
            .limit(3);
        if (clients) clients.forEach(c => searchResults.push({ id: c.id, name: c.name, type: 'client' }));

        // 2. Providers (Organizations linked? Or generic provider table? Assuming providers)
        // If no providers table exists, we skip or use organizations if setup. 
        // For now, let's assume we search clients and employees primarily.

        // 3. Employees
        const { data: employees } = await supabase
            .from('employees')
            .select('id, full_name')
            .ilike('full_name', q)
            .limit(3);
        if (employees) employees.forEach(e => searchResults.push({ id: e.id, name: e.full_name, type: 'employee' }));

        setResults(searchResults);
        setLoading(false);
        setIsOpen(true);
    }

    const handleSelect = (contact: Contact) => {
        onChange(contact);
        setQuery('');
        setIsOpen(false);
    };

    const getIcon = (type: ContactType) => {
        switch (type) {
            case 'client': return <User size={14} className="text-blue-400" />;
            case 'provider': return <Building2 size={14} className="text-orange-400" />;
            case 'employee': return <Briefcase size={14} className="text-emerald-400" />;
        }
    };

    return (
        <div className="space-y-1 relative" ref={wrapperRef}>
            <label className="text-xs font-medium text-zinc-400">Beneficiario / Contacto</label>

            {value ? (
                <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                        {getIcon(value.type)}
                        <span className="text-sm text-white font-medium">{value.name}</span>
                        <span className="text-xs text-zinc-500 capitalize">({value.type === 'client' ? 'Cliente' : value.type === 'employee' ? 'Funcionario' : 'Proveedor'})</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="text-zinc-500 hover:text-red-400"
                    >
                        <Search size={14} className="rotate-45" /> {/* Close Icon simulated */}
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                        placeholder="Buscar cliente, funcionario..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    {loading && <Loader2 className="absolute right-3 top-2.5 text-zinc-500 animate-spin" size={16} />}
                </div>
            )}

            {/* Dropdown */}
            {isOpen && query.length >= 2 && !value && (
                <div className="absolute z-50 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                    {results.length > 0 ? (
                        results.map(contact => (
                            <button
                                key={`${contact.type}-${contact.id}`}
                                type="button"
                                onClick={() => handleSelect(contact)}
                                className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 border-b border-zinc-800 last:border-0 transition-colors"
                            >
                                <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                                    {getIcon(contact.type)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{contact.name}</p>
                                    <p className="text-xs text-zinc-500 capitalize">{contact.type === 'client' ? 'Cliente' : contact.type === 'employee' ? 'Funcionario' : 'Proveedor'}</p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-zinc-500 text-sm">
                            {loading ? 'Buscando...' : 'No se encontraron resultados'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
