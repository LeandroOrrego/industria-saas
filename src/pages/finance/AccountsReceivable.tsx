import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, DollarSign, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RegisterPaymentModal from '../../components/RegisterPaymentModal';

// Extend type 
type Invoice = {
    id: string;
    invoice_number: string;
    created_at: string;
    total_amount: number;
    balance: number;
    status: string;
    condition: string;
    clients: {
        name: string;
        tax_id: string;
    } | null;
};

export default function AccountsReceivable() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        fetchPendingInvoices();
    }, []);

    async function fetchPendingInvoices() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, clients(name, tax_id)')
                .neq('status', 'paid') // Only pending/partial
                .is('deleted_at', null) // Filter out deleted
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (error) {
            console.error('Error fetching receivables:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDeleteInvoice = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta factura?')) return;

        try {
            const { error } = await supabase
                .from('invoices')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            fetchPendingInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Error al eliminar factura');
        }
    };

    const handleOpenPayment = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        fetchPendingInvoices(); // Refresh list
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(amount).replace('PYG', 'Gs.');
    };

    // Filter Logic
    const filteredInvoices = invoices.filter(inv =>
        inv.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoice_number?.includes(searchTerm)
    );

    const totalReceivable = filteredInvoices.reduce((acc, curr) => acc + (curr.balance || 0), 0);

    return (
        <div className="p-8 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100 font-sans">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Cuentas a Cobrar</h1>
                    <p className="text-gray-500 dark:text-zinc-500 mt-1">Gestión de facturas pendientes de cobro.</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase font-bold">Total a Cobrar</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(totalReceivable)}</p>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className="flex-1 min-w-[280px]">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400 dark:text-zinc-500 group-focus-within:text-cobalt-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 sm:text-sm transition-all"
                            placeholder="Buscar cliente o número de factura..."
                        />
                    </div>
                </div>
                {/* Advanced filters could go here */}
            </div>

            {/* List */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-500 uppercase text-xs font-bold border-b border-gray-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-4">Factura</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Emisión</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500 dark:text-zinc-500">Cargando cuentas...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500 dark:text-zinc-500">No hay cuentas a cobrar pendientes.</td></tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 group transition-colors">
                                        <td className="px-6 py-4 font-mono text-gray-600 dark:text-zinc-300">{inv.invoice_number || 'S/N'}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900 dark:text-white">{inv.clients?.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-500">{inv.clients?.tax_id}</p>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400 dark:text-zinc-500" /> {new Date(inv.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-500 dark:text-zinc-400">
                                            {formatCurrency(inv.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-red-500 dark:text-red-400">
                                            {formatCurrency(inv.balance || inv.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inv.status === 'partial'
                                                ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                                : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500'
                                                }`}>
                                                {inv.status === 'partial' ? 'Parcial' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenPayment(inv)}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-lg shadow-emerald-900/20"
                                            >
                                                <DollarSign size={14} /> Cobrar
                                            </button>
                                            <button
                                                onClick={() => navigate(`/finance/billing/${inv.id}`)}
                                                className="text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                                title="Ver Detalle / Editar"
                                            >
                                                <ArrowRight size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteInvoice(inv.id)}
                                                className="text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-zinc-800 rounded transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RegisterPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={handlePaymentSuccess}
                invoice={selectedInvoice}
            />
        </div>
    );
}
