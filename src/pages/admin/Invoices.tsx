import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Plus, Search, Filter, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Invoices() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, []);

    async function fetchInvoices() {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
          *,
          clients (name, tax_id)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredInvoices = invoices.filter(inv =>
        inv.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Facturación</h1>
                    <p className="text-zinc-400">Gestiona las facturas y comprobantes emitidos.</p>
                </div>

                {/* Placeholder for future specific manual creation if needed */}
                {/* <button className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-colors">
          <Plus size={20} /> Nueva Factura
        </button> */}
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o ID..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cobalt-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase font-bold">
                        <tr>
                            <th className="px-6 py-4">ID Factura</th>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4">Orden de Servicio</th>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4 text-center">Estado</th>
                            <th className="px-6 py-4 text-right">Total (Gs.)</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">Cargando facturas...</td></tr>
                        ) : filteredInvoices.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No hay facturas registradas.</td></tr>
                        ) : (
                            filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-zinc-800/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-zinc-500 hover:text-white transition-colors">
                                        #{inv.id.slice(0, 8)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white">{inv.clients?.name}</div>
                                        <div className="text-xs text-zinc-500">{inv.clients?.tax_id || 'Sin RUC'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {inv.os_id ? (
                                            <Link to={`/operations/service-orders/${inv.os_id}`} className="text-cobalt-400 hover:text-cobalt-300 flex items-center gap-1 text-sm font-mono">
                                                #{inv.os_id.slice(0, 8)} <ArrowUpRight size={12} />
                                            </Link>
                                        ) : (
                                            <span className="text-zinc-600 italic">Directa</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400 text-sm">
                                        {new Date(inv.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded textxs font-bold uppercase tracking-wide border ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                inv.status === 'issued' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    inv.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                            }`}>
                                            {inv.status === 'issued' ? 'Emitida' :
                                                inv.status === 'paid' ? 'Pagada' :
                                                    inv.status === 'cancelled' ? 'Anulada' : 'Borrador'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-white font-bold">
                                        {(inv.total_amount || 0).toLocaleString('es-PY')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            to={`/admin/invoices/${inv.id}`}
                                            className="text-zinc-400 hover:text-white transition-colors font-bold text-sm"
                                        >
                                            Ver Detalle
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
