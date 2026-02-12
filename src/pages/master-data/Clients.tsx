import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { Search, Plus, Download, Filter, MoreVertical, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ClientModal from '../../components/ClientModal';

// Extend Type for new columns
type Client = Database['public']['Tables']['clients']['Row'] & {
    phone?: string | null;
    city?: string | null;
    status?: string | null;
    category?: string | null;
};

export default function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
        try {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
            fetchClients();
        } catch (error) {
            alert('Error al eliminar cliente (puede tener órdenes asociadas).');
        }
    };

    // Filter Logic
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tax_id && c.tax_id.includes(searchTerm)) ||
        (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Initial Generator (M, C, J, etc.)
    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    // Color generator based on initial (Deterministic)
    const getAvatarColor = (initial: string) => {
        const colors = [
            'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'bg-purple-500/20 text-purple-400 border-purple-500/30',
            'bg-orange-500/20 text-orange-400 border-orange-500/30',
            'bg-pink-500/20 text-pink-400 border-pink-500/30',
            'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        ];
        const index = initial.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const getStatusBadge = (status?: string | null) => {
        const s = status || 'active'; // default
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

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-zinc-950 overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 w-full flex flex-col gap-4 shrink-0">
                <nav className="flex items-center gap-2 text-gray-500 dark:text-zinc-500 text-sm font-medium">
                    <a href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">Inicio</a>
                    <ChevronRight size={14} />
                    <span className="text-gray-900 dark:text-white">Clientes</span>
                </nav>
                <div className="flex flex-wrap justify-between items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight">Catastro de Clientes</h2>
                        <p className="text-gray-500 dark:text-zinc-500 text-base">Gestiona la base de datos de tus clientes industriales.</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="hidden md:flex bg-cobalt-600 hover:bg-cobalt-500 text-white px-5 py-2.5 rounded-lg items-center gap-2 font-medium transition-all shadow-lg shadow-cobalt-900/20 border border-cobalt-500/20"
                    >
                        <Plus size={20} />
                        <span>Nuevo Cliente</span>
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
                                placeholder="Buscar por nombre, RUC o teléfono..."
                            />
                        </div>
                    </div>

                    {/* Filter Buttons (Visual for now) */}
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <div className="h-8 w-px bg-gray-200 dark:bg-zinc-800 mx-2"></div>
                        {/* These are currently visual placeholders as per design, logic can be added later */}
                        <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg hover:border-gray-300 dark:hover:border-zinc-600 group transition-all shrink-0">
                            <span className="text-sm text-gray-700 dark:text-white font-medium">Categoría</span>
                            <span className="text-xs text-gray-500 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded">Todas</span>
                        </button>
                        <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg hover:border-gray-300 dark:hover:border-zinc-600 group transition-all shrink-0">
                            <span className="text-sm text-gray-700 dark:text-white font-medium">Estado</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">Activo</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <button className="p-2 text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" title="Exportar CSV">
                            <Download size={20} />
                        </button>
                        <button className="p-2 text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" title="Filtros avanzados">
                            <Filter size={20} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-500 font-semibold mobile-hidden">
                                    <th className="p-4 pl-6">Cliente</th>
                                    <th className="p-4">RUC / DNI</th>
                                    <th className="p-4">Teléfono</th>
                                    <th className="p-4">Zona / Ciudad</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-right pr-6">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-sm text-gray-900 dark:text-white">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-500 dark:text-zinc-500">Cargando clientes...</td></tr>
                                ) : filteredClients.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center">
                                                <p className="text-gray-400 dark:text-zinc-400 font-medium">No se encontraron clientes</p>
                                                <button onClick={handleCreate} className="mt-2 text-cobalt-600 dark:text-cobalt-400 hover:underline text-sm">Crear nuevo cliente</button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClients.map((client) => {
                                        const initial = getInitial(client.name);
                                        return (
                                            <tr key={client.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-10 rounded-full flex items-center justify-center font-bold text-lg border ${getAvatarColor(initial)}`}>
                                                            {initial}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-900 dark:text-white group-hover:text-cobalt-600 dark:group-hover:text-cobalt-400 transition-colors cursor-pointer" onClick={() => handleEdit(client)}>
                                                                {client.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-zinc-500 capitalize">{client.category || 'Industrial'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-500 dark:text-zinc-500 font-mono text-xs">{client.tax_id || '-'}</td>
                                                <td className="p-4 text-gray-700 dark:text-white">{client.phone || '-'}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span>{client.city || 'Sin Zona'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(client.status)}`}>
                                                        <span className={`size-1.5 rounded-full ${client.status === 'inactive' ? 'bg-red-500' : client.status === 'pending' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></span>
                                                        {getStatusLabel(client.status)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(client)} className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-cobalt-600 dark:hover:text-cobalt-400 hover:bg-cobalt-500/10 rounded transition-colors" title="Editar">
                                                            <Edit size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(client.id)} className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Eliminar">
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
                    {/* Simpler Pagination for MVP */}
                    <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                        <div className="text-sm text-gray-500 dark:text-zinc-500">
                            Mostrando <span className="text-gray-900 dark:text-white font-medium">{filteredClients.length}</span> clientes
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Disabled for now as we have full list loaded */}
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
            <ClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => { fetchClients(); }}
                clientToEdit={editingClient}
            />
        </div>
    );
}
