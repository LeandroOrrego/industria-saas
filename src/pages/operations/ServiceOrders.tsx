import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, CheckCircle, Clock, AlertCircle, ArrowRight, Calendar, AlertTriangle, LayoutGrid, List, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import ServiceOrdersKanban from './ServiceOrdersKanban';
import ServiceOrderDrawer from './components/ServiceOrderDrawer';

// Extended type to support new fields before regen
type ServiceOrder = Database['public']['Tables']['service_orders']['Row'] & {
    clients: Database['public']['Tables']['clients']['Row'] | null;
    description?: string;
    priority?: string;
    delivery_date?: string;
};

export default function ServiceOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);

    // View State
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list'); // Default to List
    const [statusTab, setStatusTab] = useState<'active' | 'completed' | 'all'>('active');
    const [searchTerm, setSearchTerm] = useState('');

    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        // Optimistic UI updates might handle re-fetching, but we keep this for initial load/refresh
        try {
            const { data, error } = await supabase
                .from('service_orders')
                .select('*, clients(*)')
                .is('deleted_at', null) // Filter active orders
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data as any || []);
        } catch (error) {
            console.error('Error fetching OS:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent opening drawer
        if (!confirm('¿Estás seguro de mover esta orden a la papelera?')) return;
        try {
            const { error } = await supabase
                .from('service_orders')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setOrders(orders.filter(o => o.id !== id));
        } catch (error: any) {
            console.error("Error deleting OS", error);
            alert("Error al borrar: " + error.message);
        }
    };

    const handleRowClick = (id: string) => {
        setSelectedOrderId(id);
        setIsDrawerOpen(true);
    };

    const handleDrawerClose = () => {
        setIsDrawerOpen(false);
        setSelectedOrderId(null);
    };

    const handleDrawerUpdate = () => {
        fetchOrders(); // Refresh list on drawer save
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'abierta': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            case 'en_proceso': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
            case 'finalizada': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'facturada': return 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700';
            default: return 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'abierta': return <AlertCircle size={14} className="mr-1.5" />;
            case 'en_proceso': return <Clock size={14} className="mr-1.5" />;
            case 'finalizada': return <CheckCircle size={14} className="mr-1.5" />;
            default: return null;
        }
    };

    const getPriorityBadge = (priority: string | undefined) => {
        switch (priority) {
            case 'urgente':
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20 flex items-center w-fit gap-1">
                        <AlertTriangle size={12} /> Urgente
                    </span>
                );
            case 'alta':
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 w-fit">
                        Alta
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700 w-fit">
                        Normal
                    </span>
                );
        }
    };

    // Filter Logic
    const filteredOrders = orders.filter(o => {
        // 1. Status Tab Filter
        if (statusTab === 'active') {
            if (['finalizada', 'facturada', 'entregada'].includes(o.status)) return false;
        } else if (statusTab === 'completed') {
            if (!['finalizada', 'facturada', 'entregada'].includes(o.status)) return false;
        }

        // 2. Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const clientName = o.clients?.name?.toLowerCase() || '';
            const desc = o.description?.toLowerCase() || '';
            const id = o.id.toLowerCase();
            return clientName.includes(term) || desc.includes(term) || id.includes(term);
        }

        return true;
    });

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen flex flex-col h-screen overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Órdenes de Servicio</h1>
                    <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Gestiona las órdenes de trabajo del taller.</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800 flex items-center">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md ${viewMode === 'kanban' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300'}`}
                            title="Vista Tablero"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300'}`}
                            title="Vista Lista"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <Link
                        to="/operations/new-os"
                        className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2.5 rounded-lg flex items-center transition-all shadow-lg shadow-cobalt-900/20 text-sm font-semibold border border-cobalt-500/20"
                    >
                        <Plus size={18} className="mr-2" />
                        Nueva OS
                    </Link>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {/* Filters Bar */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden">

                    {/* Top Bar: Tabs & Search */}
                    <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4 bg-gray-50/50 dark:bg-zinc-900/50 shrink-0 justify-between items-center">

                        {/* Status Tabs */}
                        <div className="flex p-1 bg-gray-200 dark:bg-zinc-950 rounded-lg">
                            <button
                                onClick={() => setStatusTab('active')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusTab === 'active'
                                    ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                            >
                                Activas
                            </button>
                            <button
                                onClick={() => setStatusTab('completed')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusTab === 'completed'
                                    ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                            >
                                Terminadas
                            </button>
                            <button
                                onClick={() => setStatusTab('all')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${statusTab === 'all'
                                    ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                            >
                                Todas
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={16} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por cliente, descripción o ID..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 text-gray-900 dark:text-zinc-200 text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden p-0.5">
                        {viewMode === 'list' ? (
                            <div className="overflow-auto h-full w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 dark:text-zinc-500 uppercase bg-gray-50/50 dark:bg-zinc-950/50 border-b border-gray-200 dark:border-zinc-800 sticky top-0 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="px-6 py-3 font-medium tracking-wider">OS ID</th>
                                            <th className="px-6 py-3 font-medium tracking-wider">Prioridad</th>
                                            <th className="px-6 py-3 font-medium tracking-wider">Cliente / Descripción</th>
                                            <th className="px-6 py-3 font-medium tracking-wider">Ingreso</th>
                                            <th className="px-6 py-3 font-medium tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                        {loading ? (
                                            <tr><td colSpan={6} className="text-center py-12 text-gray-500 dark:text-zinc-500">Cargando órdenes...</td></tr>
                                        ) : filteredOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-12">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="p-4 bg-gray-100 dark:bg-zinc-800 rounded-full mb-3">
                                                            <FileText className="w-8 h-8 text-gray-400 dark:text-zinc-600" />
                                                        </div>
                                                        <p className="text-gray-500 dark:text-zinc-400 font-medium">No se encontraron órdenes</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOrders.map((os) => (
                                                <tr
                                                    key={os.id}
                                                    onClick={() => handleRowClick(os.id)}
                                                    className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-zinc-500 group-hover:text-cobalt-600 dark:group-hover:text-cobalt-400 transition-colors">
                                                        #{os.id.slice(0, 8)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getPriorityBadge(os.priority)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-900 dark:text-white mb-0.5">{os.clients?.name || 'Cliente desconocido'}</span>
                                                            <span className="text-xs text-gray-500 dark:text-zinc-500 line-clamp-1">{os.description || 'Sin descripción'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300 text-xs">
                                                            <Calendar size={12} className="text-gray-400 dark:text-zinc-500" />
                                                            {new Date(os.created_at).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wide inline-flex items-center ${getStatusColor(os.status)}`}>
                                                            {getStatusIcon(os.status)}
                                                            {os.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/operations/new-os?id=${os.id}`); }}
                                                                className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                                title="Editar Completo"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDelete(os.id, e)}
                                                                className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                title="Borrar"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                            <button className="text-gray-400 dark:text-zinc-400 hover:text-cobalt-600 dark:hover:text-cobalt-400 font-medium text-xs flex items-center gap-1 transition-colors ml-2">
                                                                <ArrowRight size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-full p-4 overflow-hidden">
                                <ServiceOrdersKanban orders={filteredOrders} loading={loading} onDelete={handleDelete} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Drawer */}
            <ServiceOrderDrawer
                isOpen={isDrawerOpen}
                onClose={handleDrawerClose}
                orderId={selectedOrderId}
                onUpdate={handleDrawerUpdate}
            />
        </div>
    );
}
