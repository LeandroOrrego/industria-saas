import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Truck, Calendar, User, FileText, Receipt, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';

type PurchaseOrder = {
    id: string;
    organization_id: string;
    provider_id: string;
    status: 'draft' | 'ordered' | 'received' | 'cancelled';
    order_date: string;
    delivery_date: string | null;
    total_amount: number;
    notes: string | null;
    created_at: string;
    // Invoice Fields
    invoice_number?: string;
    invoice_type?: string;
    iva_5?: number;
    iva_10?: number;
    exempt_amount?: number;
    providers?: { name: string, email: string, phone: string, tax_id?: string } | null;
    items?: any[];
}

export default function PurchaseDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (id) fetchDetails();
    }, [id]);

    async function fetchDetails() {
        setLoading(true);
        try {
            // Fetch PO Header
            const { data: poData, error: poError } = await supabase
                .from('purchase_orders')
                .select('*, providers(*)')
                .eq('id', id)
                .single();

            if (poError) throw poError;

            // Fetch Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('*, products(name, unit)')
                .eq('po_id', id);

            if (itemsError) throw itemsError;

            setPo(poData as any);
            setItems(itemsData || []);

        } catch (error) {
            console.error('Error fetching PO details:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleReceiveOrder = async () => {
        if (!confirm('¿Confirmar la recepción de todos los ítems? Esto actualizará el stock automáticamente.')) return;

        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const { error } = await supabase.rpc('process_purchase_receipt', {
                p_po_id: id,
                p_user_id: user.id
            });

            if (error) throw error;

            alert('Orden recibida con éxito. Stock actualizado.');
            fetchDetails(); // Refresh to show new status
        } catch (error) {
            console.error('Error receiving order:', error);
            alert('Error al procesar la recepción');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <span className="flex items-center gap-1.5 px-3 py-1 rounded text-sm font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase"> <Clock size={14} /> Borrador</span>;
            case 'ordered': return <span className="flex items-center gap-1.5 px-3 py-1 rounded text-sm font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase"><Truck size={14} /> Procesando</span>;
            case 'received': return <span className="flex items-center gap-1.5 px-3 py-1 rounded text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase"><CheckCircle size={14} /> Recibido</span>;
            case 'cancelled': return <span className="flex items-center gap-1.5 px-3 py-1 rounded text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase">Cancelado</span>;
            default: return <span>{status}</span>
        }
    }

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando detalles...</div>;
    if (!po) return <div className="p-8 text-center text-zinc-500">Orden no encontrada</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto bg-zinc-950 min-h-screen text-zinc-100">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/inventory/purchases')} className="text-zinc-500 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-white">Orden #{po.id.slice(0, 8)}</h1>
                            {getStatusBadge(po.status)}
                        </div>
                        <p className="text-zinc-500 text-sm mt-1">{po.providers?.name} • {new Date(po.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                {po.status === 'ordered' && (
                    <button
                        onClick={handleReceiveOrder}
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 border border-emerald-500/20 transition-all"
                    >
                        {processing ? 'Procesando...' : <><CheckCircle size={18} /> Confirmar Recepción</>}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Info */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-4">
                        <h3 className="font-bold text-white text-lg border-b border-zinc-800 pb-2 mb-4">Información de Factura</h3>

                        <div className="flex items-start gap-3">
                            <User className="text-zinc-500 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase">Proveedor</p>
                                <p className="text-white font-medium">{po.providers?.name}</p>
                                <p className="text-sm text-zinc-400">RUC: {po.providers?.tax_id || 'N/A'}</p>
                                {po.providers?.email && <p className="text-sm text-zinc-500">{po.providers.email}</p>}
                                {po.providers?.phone && <p className="text-sm text-zinc-500">{po.providers.phone}</p>}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Receipt className="text-zinc-500 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase">Datos Fiscales</p>
                                <p className="text-sm text-zinc-300">Nro: <span className="text-white font-medium">{po.invoice_number || '---'}</span></p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Calendar className="text-zinc-500 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase">Fecha Emisión</p>
                                <p className="text-white">{new Date(po.order_date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <CreditCard className="text-zinc-500 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs font-bold text-zinc-500 uppercase">Condición</p>
                                <p className="text-white">{po.invoice_type || 'Contado'}</p>
                            </div>
                        </div>

                        {po.notes && (
                            <div className="flex items-start gap-3 pt-4 border-t border-zinc-800 mt-4">
                                <FileText className="text-zinc-500 mt-0.5" size={16} />
                                <div>
                                    <p className="text-xs font-bold text-zinc-500 uppercase">Notas</p>
                                    <p className="text-sm text-zinc-300 italic">"{po.notes}"</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Items */}
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="font-bold text-white text-lg">Ítems</h3>
                            <span className="text-2xl font-bold font-mono text-cobalt-400">{po.total_amount?.toLocaleString()} Gs.</span>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-950 text-zinc-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4 text-right">Cant.</th>
                                    <th className="px-6 py-4 text-right">Precio Unit.</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-zinc-800/30">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-zinc-200">{item.products?.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-white">{item.quantity}</span>
                                            <span className="text-xs text-zinc-500 ml-1">{item.products?.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-zinc-400">
                                            {item.unit_price.toLocaleString()} Gs.
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-zinc-200">
                                            {(item.quantity * item.unit_price).toLocaleString()} Gs.
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-zinc-950">
                                {(po.iva_5 || po.iva_10 || po.exempt_amount) ? (
                                    <tr className="text-xs text-zinc-500 border-t border-zinc-800">
                                        <td colSpan={4} className="px-6 py-4">
                                            <div className="flex justify-end gap-6 uppercase font-bold">
                                                <span>Exenta: <span className="text-zinc-300 ml-1">{po.exempt_amount?.toLocaleString()} Gs.</span></span>
                                                <span>IVA 5%: <span className="text-zinc-300 ml-1">{po.iva_5?.toLocaleString()} Gs.</span></span>
                                                <span>IVA 10%: <span className="text-zinc-300 ml-1">{po.iva_10?.toLocaleString()} Gs.</span></span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : null}
                            </tfoot>
                        </table>

                        {/* Footer Status Message */}
                        {po.status === 'received' && (
                            <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-sm justify-center">
                                <CheckCircle size={16} />
                                Esta orden ha sido recibida y el stock fue actualizado.
                            </div>
                        )}
                        {po.status === 'ordered' && (
                            <div className="p-4 bg-blue-500/10 border-t border-blue-500/20 flex items-center gap-2 text-blue-400 text-sm justify-center">
                                <Truck size={16} />
                                Orden enviada al proveedor. Pendiente de recepción.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
