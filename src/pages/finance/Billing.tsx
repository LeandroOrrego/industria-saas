import React, { useEffect, useState } from 'react';
import { Search, Plus, FileText, Calendar, DollarSign, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// Helper type based on our schema
type Invoice = {
    id: string;
    invoice_number: string | null;
    client_id: string;
    total_amount: number;
    status: 'draft' | 'issued' | 'paid' | 'cancelled';
    created_at: string;
    condition: string;
    clients?: { name: string } | null;
    deleted_at?: string | null;
}

export default function Billing() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, []);

    async function fetchInvoices() {
        setLoading(true);
        const { data, error } = await supabase
            .from('invoices')
            .select('*, clients(name)')
            .is('deleted_at', null) // Only show active invoices
            .order('created_at', { ascending: false });

        if (!error) {
            setInvoices(data as any || []);
        }
        setLoading(false);
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de anular esta factura? Se marcará como eliminada.')) return;

        try {
            const { error } = await supabase
                .from('invoices')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            // Remove from local state
            setInvoices(prev => prev.filter(inv => inv.id !== id));
            alert('Factura anulada correctamente');
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Error al anular factura');
        }
    };

    const filtered = invoices.filter(inv =>
        inv.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoice_number?.includes(searchTerm)
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-500 uppercase">Borrador</span>;
            case 'issued': return <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">Emitida</span>;
            case 'paid': return <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">Pagada</span>;
            case 'cancelled': return <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20 uppercase">Anulada</span>;
            default: return <span>{status}</span>;
        }
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-zinc-400">Facturación</h1>
                    <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Gestión de comprobantes electrónicos.</p>
                </div>
                {/* Search Bar */}
                <div className="relative mx-4 flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o número..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-cobalt-500 outline-none transition-colors"
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-500 dark:text-zinc-500">Cargando facturas...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-zinc-500 border-2 border-dashed border-gray-300 dark:border-zinc-800 rounded-xl">
                        No hay facturas registradas.
                    </div>
                ) : (
                    filtered.map((inv) => (
                        <div key={inv.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-5 flex items-center justify-between group hover:border-cobalt-500/30 dark:hover:border-zinc-700 transition-all hover:shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-50 dark:bg-zinc-950 p-3 rounded-lg text-gray-400 dark:text-zinc-400">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 dark:text-white text-lg font-mono">
                                            {inv.invoice_number || 'PENDIENTE'}
                                        </span>
                                        {getStatusBadge(inv.status)}
                                        <span className="text-xs text-gray-500 dark:text-zinc-600 border border-gray-200 dark:border-zinc-800 px-1 rounded uppercase">{inv.condition}</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-zinc-400 font-medium">{inv.clients?.name}</p>
                                    <p className="text-gray-400 dark:text-zinc-600 text-xs mt-1 flex items-center gap-1">
                                        <Calendar size={12} /> {new Date(inv.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase font-bold">Total</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">Gs. {inv.total_amount ? inv.total_amount.toLocaleString('es-PY') : '0'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/finance/billing/${inv.id}`)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                        title="Ver Factura"
                                    >
                                        <Eye size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(inv.id)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-gray-400 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                                        title="Anular (Papelera)"
                                    >
                                        <Trash2 size={20} />
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
