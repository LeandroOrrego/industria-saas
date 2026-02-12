import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Download, Filter, MoreVertical, Edit, Trash2, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import ProviderModal from '../../components/ProviderModal';

// Manual Type Definition
type Provider = {
    id: string;
    organization_id: string;
    name: string;
    tax_id?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    category?: string | null;
    status?: string | null;
};

export default function Providers() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

    useEffect(() => {
        fetchProviders();
    }, []);

    async function fetchProviders() {
        try {
            const { data, error } = await supabase
                .from('providers')
                .select('*')
                .order('name');

            if (error) throw error;
            setProviders(data || []);
        } catch (error) {
            console.error('Error fetching providers:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = () => {
        setEditingProvider(null);
        setIsModalOpen(true);
    };

    const handleEdit = (provider: Provider) => {
        setEditingProvider(provider);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
        try {
            const { error } = await supabase.from('providers').delete().eq('id', id);
            if (error) throw error;
            fetchProviders();
        } catch (error) {
            alert('Error al eliminar proveedor.');
        }
    };

    // Filter Logic
    const filteredProviders = providers.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.tax_id && p.tax_id.includes(searchTerm))
    );

    // Initial Generator
    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    // Color generator
    const getAvatarColor = (initial: string) => {
        const colors = [
            'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
            'bg-rose-500/20 text-rose-400 border-rose-500/30',
            'bg-amber-500/20 text-amber-400 border-amber-500/30',
            'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            'bg-lime-500/20 text-lime-400 border-lime-500/30',
        ];
        const index = initial.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const getStatusBadge = (status?: string | null) => {
        const s = status || 'active';
        if (s === 'active') return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
        if (s === 'inactive') return 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20';
        if (s === 'pending') return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20';
        return 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400';
    };

    const getStatusLabel = (status?: string | null) => {
        const s = status || 'active';
        if (s === 'active') return 'Activo';
        if (s === 'inactive') return 'Inactivo';
        if (s === 'pending') return 'Pendiente';
        return s;
    };

    const getCategoryLabel = (cat?: string | null) => {
        if (cat === 'materia_prima') return 'Materia Prima';
        if (cat === 'insumos') return 'Insumos';
        if (cat === 'equipos') return 'Equipos';
        if (cat === 'servicios') return 'Servicios';
        return cat || 'General';
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-zinc-950 overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 w-full flex flex-col gap-4 shrink-0">
                <nav className="flex items-center gap-2 text-gray-500 dark:text-zinc-500 text-sm font-medium">
                    <a href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">Inicio</a>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 dark:text-white">Proveedores</span>
                </nav>
                <div className="flex flex-wrap justify-between items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight">Directorio de Proveedores</h2>
                        <p className="text-gray-500 dark:text-zinc-500 text-base">Gestiona tus suministros y cadena de abastecimiento.</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="hidden md:flex bg-cobalt-600 hover:bg-cobalt-500 text-white px-5 py-2.5 rounded-lg items-center gap-2 font-medium transition-all shadow-lg shadow-cobalt-900/20 border border-cobalt-500/20"
                    >
                        <Plus size={20} />
                        <span>Nuevo Proveedor</span>
                    </button>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex-1 min-w-[280px]">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400 dark:text-zinc-500 group-focus-within:text-cobalt-500 dark:group-focus-within:text-cobalt-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 sm:text-sm transition-all"
                                placeholder="Buscar por nombre o RUC..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto">
                        <div className="h-8 w-px bg-gray-200 dark:bg-zinc-800 mx-2"></div>
                        <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg hover:border-gray-300 dark:hover:border-zinc-600 group transition-all shrink-0">
                            <span className="text-sm text-gray-700 dark:text-white font-medium">Categoría</span>
                            <span className="text-xs text-gray-500 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded">Todas</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <button className="p-2 text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" title="Exportar CSV">
                            <Download size={20} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-500 font-semibold mobile-hidden">
                                    <th className="p-4 pl-6">Proveedor</th>
                                    <th className="p-4">RUC / CI</th>
                                    <th className="p-4">Contacto</th>
                                    <th className="p-4">Categoría</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right pr-6">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-sm text-gray-900 dark:text-white">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-500 dark:text-zinc-500">Cargando proveedores...</td></tr>
                                ) : filteredProviders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center">
                                                <p className="text-gray-400 dark:text-zinc-400 font-medium">No se encontraron proveedores</p>
                                                <button onClick={handleCreate} className="mt-2 text-cobalt-600 dark:text-cobalt-400 hover:underline text-sm">Crear nuevo proveedor</button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProviders.map((provider) => {
                                        const initial = getInitial(provider.name);
                                        return (
                                            <tr key={provider.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-10 rounded-full flex items-center justify-center font-bold text-lg border ${getAvatarColor(initial)}`}>
                                                            {initial}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-900 dark:text-white group-hover:text-cobalt-600 dark:group-hover:text-cobalt-400 transition-colors cursor-pointer" onClick={() => handleEdit(provider)}>
                                                                {provider.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                                                                <Truck size={10} />
                                                                {provider.address || 'Sin dirección'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-500 dark:text-zinc-500 font-mono text-xs">{provider.tax_id || '-'}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-700 dark:text-white">{provider.phone || '-'}</span>
                                                        <span className="text-xs text-gray-500 dark:text-zinc-500">{provider.email || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">
                                                        {getCategoryLabel(provider.category)}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(provider.status)}`}>
                                                        <span className={`size-1.5 rounded-full ${provider.status === 'inactive' ? 'bg-red-500' : provider.status === 'pending' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></span>
                                                        {getStatusLabel(provider.status)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(provider)} className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-cobalt-600 dark:hover:text-cobalt-400 hover:bg-cobalt-500/10 rounded transition-colors" title="Editar">
                                                            <Edit size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(provider.id)} className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Eliminar">
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <button className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                        <div className="text-sm text-gray-500 dark:text-zinc-500">
                            Mostrando <span className="text-gray-900 dark:text-white font-medium">{filteredProviders.length}</span> proveedores
                        </div>
                        <div className="flex items-center gap-2">
                            <button disabled className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed">
                                <ChevronLeft size={16} />
                            </button>
                            <button disabled className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile FAB */}
            <button
                onClick={handleCreate}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-cobalt-600 shadow-xl shadow-cobalt-900/30 text-white hover:scale-105 transition-all md:hidden"
            >
                <Plus size={24} />
            </button>

            {/* Modal */}
            <ProviderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => { fetchProviders(); }}
                providerToEdit={editingProvider}
            />
        </div>
    );
}
