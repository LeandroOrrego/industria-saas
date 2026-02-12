import { useEffect, useState } from 'react';
import { Search, Plus, ShoppingCart, Calendar, CheckCircle, Clock, Truck, Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// We need to define types as they might not be in supabase.ts yet
type Purchase = {
    id: string;
    organization_id: string;
    provider_id: string;
    status: 'draft' | 'ordered' | 'received' | 'cancelled';
    order_date: string;
    delivery_date: string | null;
    total_amount: number;
    invoice_number?: string;
    created_at: string;
    deleted_at?: string | null;
    providers?: { name: string } | null;
}

export default function Purchases() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPurchases();
    }, []);

    async function fetchPurchases() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*, providers(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data as any || []);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (poId: string, status: string) => {
        if (!confirm('¿Estás seguro de anular esta compra? Si ya fue recibida, el stock se revertirá.')) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No User');

            const { error } = await supabase.rpc('delete_purchase_order', {
                p_po_id: poId,
                p_user_id: user.id
            });

            if (error) throw error;

            alert('Compra anulada correctamente.');
            fetchPurchases();

        } catch (error: any) {
            console.error('Error deleting purchase:', error);
            alert('Error al anular compra: ' + error.message);
        }
    };

    const filteredOrders = orders.filter(o =>
        !o.deleted_at && // Filter out deleted
        (o.providers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.includes(searchTerm) ||
            o.invoice_number?.includes(searchTerm))
    );

    const getStatusBadge = (status: string) => {
        // Updated Status logic for new flow
        switch (status) {
            case 'draft': return <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-300 dark:border-zinc-700 uppercase"> <Clock size={12} /> Borrador</span>;
            case 'ordered': return <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 uppercase"><Truck size={12} /> Procesando</span>;
            case 'received': return <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase"><CheckCircle size={12} /> Recibido</span>;
            case 'cancelled': return <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20 uppercase">Cancelado</span>;
            default: return <span>{status}</span>
        }
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Compras y Gastos</h1>
                    <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Registro de facturas de compra y reposición.</p>
                </div>
                <button
                    onClick={() => navigate('/inventory/purchases/new')}
                    className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2.5 rounded-lg flex items-center transition-all shadow-lg shadow-cobalt-900/20 text-sm font-semibold border border-cobalt-500/20"
                >
                    <Plus size={18} className="mr-2" />
                    Cargar Compra
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por proveedor, ID o Nro Factura..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-cobalt-500 text-gray-900 dark:text-zinc-200 text-sm outline-none transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-500 dark:text-zinc-500">Cargando compras...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-zinc-500 border-2 border-dashed border-gray-300 dark:border-zinc-800 rounded-xl">
                        No hay compras registradas.
                    </div>
                ) : (
                    filteredOrders.map(po => (
                        <div key={po.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 hover:border-cobalt-500/30 dark:hover:border-zinc-700 transition-all hover:shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-50 dark:bg-zinc-950 p-3 rounded-lg text-gray-400 dark:text-zinc-400">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 dark:text-white text-lg">{po.providers?.name || 'Proveedor Desconocido'}</span>
                                        {getStatusBadge(po.status)}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-zinc-500 mt-1">
                                        <span className="font-mono">#{po.id.slice(0, 8)}</span>
                                        {po.invoice_number && <span className="text-gray-400 dark:text-zinc-400">Fact: {po.invoice_number}</span>}
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(po.order_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 dark:text-zinc-500 font-bold uppercase mb-0.5">Total</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">{po.total_amount?.toLocaleString()} Gs.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/inventory/purchases/${po.id}`)}
                                        className="p-2 text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                        title="Ver Detalles"
                                    >
                                        <ShoppingCart size={18} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/inventory/purchases/${po.id}/edit`)}
                                        className="p-2 text-gray-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-400/10 rounded transition-colors"
                                        title="Editar Compra"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(po.id, po.status)}
                                        className="p-2 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                        title="Anular Compra"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
