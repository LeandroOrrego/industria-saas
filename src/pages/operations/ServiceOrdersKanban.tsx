import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Database } from '../../types/supabase';
import { supabase } from '../../lib/supabase';
import { Clock, CheckCircle, AlertCircle, FileText, MoreVertical, ArrowRight, Calendar, AlertTriangle, Pencil, Trash2 } from 'lucide-react';

type ServiceOrder = Database['public']['Tables']['service_orders']['Row'] & {
    clients: Database['public']['Tables']['clients']['Row'] | null;
    description?: string;
    priority?: string;
    delivery_date?: string;
};

interface ServiceOrdersKanbanProps {
    orders: ServiceOrder[];
    loading: boolean;
    onDelete: (id: string) => void;
}


export default function ServiceOrdersKanban({ orders, loading, onDelete }: ServiceOrdersKanbanProps) {
    const navigate = useNavigate();

    const handleMove = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('service_orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            // Optimistic update or refetch could happen here, but for now we rely on the parent to refetch or we just force a reload/callback
            // Ideally we should call a refresh function passed as prop, but looking at previous code, 
            // the parent uses `fetchOrders` on mount. We might need to trigger a refresh.
            // For now, let's just reload the page or assume real-time is not set up yet.
            // Better: call a prop `onUpdate`.
            window.location.reload(); // Temporary fix until we pass a refresh callback
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al mover la orden');
        }
    };

    const getPriorityBadge = (priority: string | undefined) => {
        if (priority === 'urgente') return <div className="size-2 rounded-full bg-red-500 animate-pulse" title="Urgente" />;
        if (priority === 'alta') return <div className="size-2 rounded-full bg-amber-500" title="Alta" />;
        return null;
    };

    const COLUMN_CONFIG = [
        { id: 'abierta', title: 'Pendientes / Diseño', color: 'border-blue-500', bg: 'bg-blue-500/5', icon: AlertCircle, iconColor: 'text-blue-500' },
        { id: 'en_proceso', title: 'En Producción', color: 'border-yellow-500', bg: 'bg-yellow-500/5', icon: Clock, iconColor: 'text-yellow-500' },
        { id: 'control_calidad', title: 'Control de Calidad', color: 'border-purple-500', bg: 'bg-purple-500/5', icon: CheckCircle, iconColor: 'text-purple-500' },
        { id: 'finalizada', title: 'Terminado / Para Entregar', color: 'border-emerald-500', bg: 'bg-emerald-500/5', icon: CheckCircle, iconColor: 'text-emerald-500' },
        { id: 'facturada', title: 'Entregado / Facturado', color: 'border-zinc-500', bg: 'bg-zinc-500/5', icon: FileText, iconColor: 'text-zinc-500' },
    ];

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-240px)] min-h-[500px]">
            {COLUMN_CONFIG.map((col, colIndex) => {
                const colOrders = orders.filter(o => o.status === col.id);
                const ColIcon = col.icon;

                return (
                    <div key={col.id} className="min-w-[320px] max-w-[320px] flex flex-col bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-200 dark:border-zinc-800">
                        {/* Header */}
                        <div className={`p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between ${col.bg} rounded-t-xl`}>
                            <div className="flex items-center gap-2">
                                <ColIcon size={18} className={col.iconColor} />
                                <h3 className="font-bold text-gray-700 dark:text-zinc-200 text-sm">{col.title}</h3>
                            </div>
                            <span className="bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 text-xs font-bold px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-800">
                                {colOrders.length}
                            </span>
                        </div>

                        {/* Cards Container */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {colOrders.map(os => (
                                <div key={os.id} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-cobalt-500/50 hover:shadow-lg hover:shadow-cobalt-900/10 transition-all group cursor-pointer relative">

                                    {/* Priority Indicator */}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        {getPriorityBadge(os.priority)}
                                    </div>

                                    <div className="mb-3">
                                        <span className="font-mono text-[10px] text-gray-500 dark:text-zinc-500 block mb-1">#{os.id.slice(0, 8)}</span>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2 leading-snug">
                                            {os.description || 'Sin descripción'}
                                        </h4>
                                        <p className="text-xs text-cobalt-600 dark:text-cobalt-400 font-semibold mt-1">
                                            {os.clients?.name}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800/50 mt-3">
                                        {/* Move Actions */}
                                        <div className="flex items-center gap-1">
                                            {colIndex > 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMove(os.id, COLUMN_CONFIG[colIndex - 1].id); }}
                                                    className="p-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-700"
                                                    title={`Mover a ${COLUMN_CONFIG[colIndex - 1].title}`}
                                                >
                                                    ←
                                                </button>
                                            )}
                                            {colIndex < COLUMN_CONFIG.length - 1 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMove(os.id, COLUMN_CONFIG[colIndex + 1].id); }}
                                                    className="p-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-700"
                                                    title={`Mover a ${COLUMN_CONFIG[colIndex + 1].title}`}
                                                >
                                                    →
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/operations/new-os?id=${os.id}`);
                                                }}
                                                className="text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 p-1.5 rounded"
                                                title="Modificar Encabezado" // Renamed
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete(os.id);
                                                }}
                                                className="text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 p-1.5 rounded"
                                                title="Borrar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/operations/os/${os.id}`)} // Or wherever details are
                                                className="text-gray-500 dark:text-zinc-400 hover:text-cobalt-600 dark:hover:text-cobalt-400 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 p-1.5 rounded border border-gray-200 dark:border-cobalt-500/30"
                                                title="Gestionar Items / Ver Detalles" // Renamed
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {colOrders.length === 0 && (
                                <div className="text-center py-10 opacity-30">
                                    <div className="w-16 h-1 border-t-2 border-dashed border-gray-300 dark:border-zinc-600 mx-auto mb-2"></div>
                                    <span className="text-xs text-gray-400 dark:text-zinc-500">Sin órdenes</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
