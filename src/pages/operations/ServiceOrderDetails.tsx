import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Save, Play, Square, User, Calendar, CheckCircle, AlertCircle, FileText, Printer, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';

type ServiceOrder = Database['public']['Tables']['service_orders']['Row'] & {
    clients: Database['public']['Tables']['clients']['Row'] | null;
    items: (Database['public']['Tables']['service_order_items']['Row'] & {
        products: Database['public']['Tables']['products']['Row'] | null;
    })[];
};

type WorkLog = Database['public']['Tables']['work_logs']['Row'] & {
    profiles: Database['public']['Tables']['profiles']['Row'] | null;
};

export default function ServiceOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [logs, setLogs] = useState<WorkLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isClientView, setIsClientView] = useState(false);
    const [laborCost, setLaborCost] = useState(0); // Moved up

    // Timer State
    const [activeLog, setActiveLog] = useState<WorkLog | null>(null);
    const [taskType, setTaskType] = useState('General');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (id) {
            fetchOrderDetails();
            fetchWorkLogs();
            getCurrentUser();
        }
    }, [id]);

    useEffect(() => {
        if (order) {
            setLaborCost(order.labor_cost || 0);
        }
    }, [order]);

    async function getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    }

    async function fetchOrderDetails() {
        try {
            // Fetch Header + Client
            const { data: osData, error: osError } = await supabase
                .from('service_orders')
                .select('*, clients(*)')
                .eq('id', id)
                .single();

            if (osError) throw osError;

            // Fetch Items + Products
            const { data: itemsData, error: itemsError } = await supabase
                .from('service_order_items')
                .select('*, products(*)')
                .eq('os_id', id);

            if (itemsError) throw itemsError;

            // Cast to fit our composite type (rough casting for quick dev)
            setOrder({ ...osData, items: itemsData || [] } as any);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchWorkLogs() {
        const { data } = await supabase
            .from('work_logs')
            .select('*, profiles(email, role)') // assuming profiles has email linked or we just use id
            .eq('os_id', id)
            .order('start_time', { ascending: false });

        if (data) {
            setLogs(data as any);
            // Check if current user has an active log
            const myActive = data.find(l => l.user_id === currentUser?.id && !l.end_time);
            if (myActive) setActiveLog(myActive as any);
        }
    }

    const handleStartTimer = async () => {
        if (!currentUser) return;
        try {
            const { data, error } = await supabase
                .from('work_logs')
                .insert([{
                    os_id: id,
                    user_id: currentUser.id,
                    task_name: taskType,
                    start_time: new Date().toISOString(),
                    notes: notes
                }])
                .select()
                .single();

            if (error) throw error;

            setNotes('');
            fetchWorkLogs(); // Refresh list and set active log
        } catch (error) {
            alert('Error al iniciar tarea');
            console.error(error);
        }
    };

    const handleStopTimer = async () => {
        if (!activeLog) return;
        try {
            const { error } = await supabase
                .from('work_logs')
                .update({ end_time: new Date().toISOString() })
                .eq('id', activeLog.id);

            if (error) throw error;

            setActiveLog(null);
            fetchWorkLogs();
        } catch (error) {
            alert('Error al finalizar tarea');
            console.error(error);
        }
    };

    const handleUpdateItemQuantity = async (itemId: string, currentQty: number, newQty: number) => {
        if (newQty < 0) return;
        try {
            const { error } = await supabase
                .from('service_order_items')
                .update({ quantity: newQty })
                .eq('id', itemId);

            if (error) throw error;
            fetchOrderDetails();
        } catch (error) {
            console.error('Error updating item:', error);
            alert('Error al actualizar item');
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('¿Borrar este ítem? El stock será devuelto al inventario.')) return;
        try {
            const { error } = await supabase
                .from('service_order_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;
            fetchOrderDetails();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error al borrar item');
        }
    };

    const calculateDuration = (start: string, end: string | null) => {
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : new Date();
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    const handleFinalizeOrder = async () => {
        if (!order) return;
        if (!window.confirm('¿Estás seguro de que deseas finalizar esta orden? Esto indicará que el trabajo ha concluido.')) return;

        const { error } = await supabase
            .from('service_orders')
            .update({ status: 'finalizada' })
            .eq('id', order.id);

        if (error) {
            alert('Error al finalizar la orden');
        } else {
            fetchOrderDetails();
            alert('Orden finalizada correctamente');
        }
    };

    // Helper to fix timezone issues with YYYY-MM-DD
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        // If it's a full ISO string (with time), normal Date is fine usually, but for strict dates:
        if (dateString.includes('T')) return new Date(dateString).toLocaleDateString();

        // For YYYY-MM-DD, split and create local date to avoid timezone shift
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    };

    // Invoice Generation State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceMode, setInvoiceMode] = useState<'detailed' | 'summary'>('detailed');
    const [invoiceCondition, setInvoiceCondition] = useState<'contado' | 'credito'>('contado');
    const [summaryDescription, setSummaryDescription] = useState('');
    const [summaryAmount, setSummaryAmount] = useState(0);

    const openInvoiceModal = () => {
        if (!order) return;
        setSummaryDescription(order.description || 'Servicios Varios');
        setSummaryAmount(subtotal);
        setShowInvoiceModal(true);
    };

    const handleGenerateInvoice = async () => {
        if (!order) return;

        setLoading(true);
        try {
            // 1. Get Organization Settings for Numbering
            const { data: profile } = await supabase.auth.getUser();
            const { data: userProfile } = await supabase.from('profiles').select('organization_id').eq('id', profile.user?.id).single();

            if (!userProfile?.organization_id) throw new Error('No tienes organización asignada');

            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('invoice_prefix, next_invoice_number')
                .eq('id', userProfile.organization_id)
                .single();

            if (orgError) throw new Error('Error al obtener numeración de factura');

            // Format Invoice Number: 001-001-0000001
            const prefix = org.invoice_prefix || '001-001';
            const nextNum = org.next_invoice_number || 1;
            const formattedNum = `${prefix}-${nextNum.toString().padStart(7, '0')}`;

            // 2. Create Invoice Header
            const { data: invoice, error: invError } = await supabase
                .from('invoices')
                .insert({
                    client_id: order.client_id,
                    os_id: order.id,
                    total_amount: invoiceMode === 'detailed' ? subtotal : summaryAmount,
                    invoice_number: formattedNum,
                    condition: invoiceCondition,
                    created_at: new Date().toISOString(),
                    organization_id: userProfile.organization_id
                })
                .select()
                .single();

            if (invError) throw invError;

            // 3. Create Invoice Lines
            if (invoiceMode === 'detailed') {
                const invoiceLines = order.items.map(item => ({
                    invoice_id: invoice.id,
                    os_item_id: item.id,
                    description: item.products?.name || 'Item sin nombre',
                    quantity: item.quantity,
                    unit_price: item.products?.sale_price || 0
                }));

                // Add Labor
                if (laborCost > 0) {
                    invoiceLines.push({
                        invoice_id: invoice.id,
                        description: 'Mano de Obra / Servicios',
                        quantity: 1,
                        unit_price: laborCost
                    });
                }

                const { error: linesError } = await supabase
                    .from('invoice_lines')
                    .insert(invoiceLines);

                if (linesError) throw linesError;
            } else {
                // Summary Mode (Single Line)
                const { error: lineError } = await supabase
                    .from('invoice_lines')
                    .insert({
                        invoice_id: invoice.id,
                        os_item_id: null,
                        description: summaryDescription,
                        quantity: 1,
                        unit_price: summaryAmount
                    });

                if (lineError) throw lineError;
            }

            // 4. Update Next Invoice Number
            await supabase
                .from('organizations')
                .update({ next_invoice_number: nextNum + 1 })
                .eq('id', userProfile.organization_id);

            // 5. Update OS Status (Optional, maybe keep it separate)
            await supabase
                .from('service_orders')
                .update({ status: 'facturada' })
                .eq('id', order.id);

            alert('Factura generada correctamente: ' + formattedNum);
            navigate(`/finance/billing/${invoice.id}`);

        } catch (error: any) {
            console.error('Error generating invoice:', error);
            alert('Error al generar factura: ' + error.message);
        } finally {
            setLoading(false);
            setShowInvoiceModal(false);
        }
    };

    const handleWhatsAppShare = () => {
        if (!order || !order.clients) return;

        const text = `*HOLA ${order.clients.name.toUpperCase()}*\n` +
            `Le enviamos el presupuesto de su Orden de Servicio *#${order.id.slice(0, 8)}*.\n\n` +
            `*Trabajo:* ${order.description || 'Servicios Varios'}\n` +
            `*Entrega Est:* ${order.delivery_date ? formatDate(order.delivery_date) : 'A confirmar'}\n\n` +
            `*TOTAL:* Gs. ${subtotal.toLocaleString('es-PY')}\n\n` +
            `Quedamos atentos a su confirmación.`;

        // ... WhatsAppShare ended

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando detalles...</div>;
    if (!order) return <div className="p-8 text-center text-zinc-500">Orden no encontrada</div>;

    const handleUpdateLaborCost = async () => {
        if (!order) return;
        const { error } = await supabase
            .from('service_orders')
            .update({ labor_cost: laborCost })
            .eq('id', order.id);

        if (error) {
            alert('Error al actualizar mano de obra');
        } else {
            alert('Mano de obra actualizada');
        }
    };

    // Calculations
    const itemsTotal = order?.items?.reduce((sum, item) => {
        const price = item.products?.sale_price || 0;
        return sum + (price * item.quantity);
    }, 0) || 0;

    const subtotal = itemsTotal + Number(laborCost);
    const isUrgent = order.priority === 'urgente';

    // ... (rendering code) ...

    return (
        <div className="p-6 max-w-7xl mx-auto bg-zinc-950 min-h-screen text-zinc-100 font-sans print:bg-white print:text-black">
            {/* Header / Nav */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-zinc-800 pb-4 print:hidden gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/operations/dashboard')} className="text-zinc-500 hover:text-cobalt-400 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-white">OS #{order.id.slice(0, 8)}</h1>
                            <span className={`px-2 py-0.5 rounded textxs font-bold uppercase tracking-wide border ${order.status === 'abierta' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                order.status === 'en_proceso' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                    order.status === 'finalizada' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                {order.status.replace('_', ' ')}
                            </span>
                            {isUrgent && (
                                <span className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                    <AlertCircle size={12} /> Urgente
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-500 mt-1">{order.clients?.name} - {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {order.status === 'finalizada' && !isClientView && (
                        <button
                            onClick={openInvoiceModal}
                            className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                        >
                            <FileText size={16} /> Generar Factura
                        </button>
                    )}
                    {order.status === 'en_proceso' && !isClientView && (
                        <button
                            onClick={handleFinalizeOrder}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                        >
                            <CheckCircle size={16} /> Finalizar Trabajo
                        </button>
                    )}
                    <button
                        onClick={handleWhatsAppShare}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                    >
                        Available on WhatsApp
                    </button>
                    <button
                        onClick={() => setIsClientView(!isClientView)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors border ${isClientView ? 'bg-cobalt-600 text-white border-cobalt-500' : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'}`}
                    >
                        {isClientView ? 'Vista Cliente' : 'Vista Interna'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-white text-zinc-900 hover:bg-zinc-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                    >
                        <Printer size={16} /> Imprimir / PDF
                    </button>
                </div>
            </div>

            {/* Print Header (Visible only in Print) */}
            <div className="hidden print:block mb-8 border-b border-black pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold uppercase text-black">Orden de Servicio</h1>
                        <p className="text-sm text-gray-600">ID: #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600">Fecha: {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-black">{order.clients?.name}</h2>
                        {order.clients?.tax_id && <p className="text-sm text-gray-600">RUC: {order.clients.tax_id}</p>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COL: Content & Items */}
                <div className={`space-y-8 ${isClientView ? 'lg:col-span-3' : 'lg:col-span-2'}`}>

                    {/* Description Card */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-sm print:bg-white print:border-black print:shadow-none">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                            <FileText size={20} className="text-cobalt-500 print:text-black" />
                            Descripción del Trabajo
                        </h2>
                        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-zinc-300 whitespace-pre-wrap print:bg-white print:text-black print:border-gray-200">
                            {order.description || 'Sin descripción detallada.'}
                        </div>
                        {order.delivery_date && (
                            <div className="mt-4 flex items-center gap-6 text-zinc-400 text-sm print:text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} />
                                    <span>Inicio:</span>
                                    <input
                                        type="date"
                                        value={order.start_date ? order.start_date.split('T')[0] : ''}
                                        onChange={async (e) => {
                                            const date = e.target.value;
                                            // Optimistic update
                                            setOrder({ ...order, start_date: date });
                                            // Persist
                                            await supabase.from('service_orders').update({ start_date: date }).eq('id', order.id);
                                        }}
                                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-cobalt-500 print:border-none print:bg-white print:text-black print:p-0"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} />
                                    Entrega estimada: <span className="text-white font-semibold print:text-black">{formatDate(order.delivery_date)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ... Items Table same as before until footer ... */}
                    {/* Items Table */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-sm print:bg-white print:border-black print:shadow-none">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white print:text-black">Presupuesto Detallado</h2>
                            {!isClientView && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-zinc-400">Mano de Obra (Gs.)</label>
                                    <input
                                        type="number"
                                        value={laborCost}
                                        onChange={(e) => setLaborCost(Number(e.target.value))}
                                        onBlur={handleUpdateLaborCost}
                                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white w-32 text-right focus:border-cobalt-500 outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800 print:bg-gray-100 print:text-black print:border-black">
                                    <tr>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3 text-right">Cant.</th>
                                        <th className="px-4 py-3 text-right">P. Unit (Gs.)</th>
                                        <th className="px-4 py-3 text-right">Total (Gs.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800 print:divide-gray-300">
                                    {order.items?.map(item => {
                                        const price = item.products?.sale_price || 0;
                                        const total = price * item.quantity;
                                        return (
                                            <tr key={item.id} className="group hover:bg-zinc-900/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-zinc-200 print:text-black">
                                                    {item.products?.name}
                                                    {!isClientView && <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{new Date(item.created_at).toLocaleString()}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-zinc-500 text-xs print:text-gray-600">{item.products?.type}</td>
                                                <td className="px-4 py-3 text-right font-mono text-zinc-300 print:text-black">
                                                    {!isClientView ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleUpdateItemQuantity(item.id, item.quantity, item.quantity - 1)}
                                                                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white disabled:opacity-30"
                                                                disabled={item.quantity <= 1}
                                                            >-</button>
                                                            <span className="w-8 text-center">{item.quantity}</span>
                                                            <button
                                                                onClick={() => handleUpdateItemQuantity(item.id, item.quantity, item.quantity + 1)}
                                                                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
                                                            >+</button>
                                                            <span className="text-xs text-zinc-500 ml-1">{item.products?.unit}</span>
                                                        </div>
                                                    ) : (
                                                        <span>{item.quantity} {item.products?.unit}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-zinc-300 print:text-black">
                                                    {price.toLocaleString('es-PY')}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-zinc-300 print:text-black font-semibold">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <span>{total.toLocaleString('es-PY')}</span>
                                                        {!isClientView && (
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                                title="Eliminar Ítem"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {(!order.items || order.items.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">No hay items registrados</td>
                                        </tr>
                                    )}

                                    {/* Summary Rows */}
                                    <tr className="bg-zinc-950/30 print:bg-white border-t border-zinc-700 print:border-black">
                                        <td colSpan={3}></td>
                                        <td className="px-4 py-3 text-right text-zinc-400 font-medium print:text-black">Subtotal Items:</td>
                                        <td className="px-4 py-3 text-right text-white font-bold font-mono print:text-black">{itemsTotal.toLocaleString('es-PY')}</td>
                                    </tr>
                                    <tr className="bg-zinc-950/30 print:bg-white">
                                        <td colSpan={isClientView ? 3 : 4}></td>
                                        <td className="px-4 py-3 text-right text-zinc-400 font-medium print:text-black">Mano de Obra:</td>
                                        <td className="px-4 py-3 text-right text-white font-bold font-mono print:text-black">{Number(laborCost).toLocaleString('es-PY')}</td>
                                    </tr>
                                    <tr className="bg-zinc-900 print:bg-gray-100 border-t-2 border-zinc-700 print:border-black">
                                        <td colSpan={isClientView ? 3 : 4}></td>
                                        <td className="px-4 py-4 text-right text-white font-bold text-base print:text-black">TOTAL GENERAL (IVA Incluído):</td>
                                        <td className="px-4 py-4 text-right text-emerald-400 font-bold font-mono text-lg print:text-black">Gs. {subtotal.toLocaleString('es-PY')}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: Time Tracking (Operator Panel) - HIDDEN IN CLIENT VIEW / PRINT */}
                <div className={`space-y-6 ${isClientView ? 'hidden' : 'block'} print:hidden`}>
                    {/* Control Panel */}
                    <div className={`rounded-xl border p-6 shadow-lg transition-all ${activeLog ? 'bg-cobalt-900/10 border-cobalt-500/50' : 'bg-zinc-900 border-zinc-800'
                        }`}>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Clock size={20} className={activeLog ? 'text-cobalt-400 animate-pulse' : 'text-zinc-400'} />
                            Registro de Tareas
                        </h2>

                        {activeLog ? (
                            <div className="text-center py-6">
                                <div className="inline-block p-4 rounded-full bg-cobalt-500/20 text-cobalt-400 mb-3 animate-pulse">
                                    <Clock size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-white">{activeLog.task_name}</h3>
                                <p className="text-zinc-400 text-sm mb-6">Tarea en curso...</p>
                                <p className="text-zinc-500 text-xs mb-2">Iniciado: {new Date(activeLog.start_time).toLocaleTimeString()}</p>

                                <button
                                    onClick={handleStopTimer}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Square size={18} fill="currentColor" /> Finalizar Tarea
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Nueva Tarea</label>
                                <select
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 mb-3 outline-none"
                                    value={taskType}
                                    onChange={(e) => setTaskType(e.target.value)}
                                >
                                    <option value="Corte">Corte</option>
                                    <option value="Soldadura">Soldadura</option>
                                    <option value="Pintura">Pintura</option>
                                    <option value="Montaje">Montaje</option>
                                    <option value="Diseño">Diseño</option>
                                    <option value="General">General / Otros</option>
                                </select>

                                <input
                                    type="text"
                                    placeholder="Notas opcionales..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 mb-6 text-sm outline-none"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />

                                <button
                                    onClick={handleStartTimer}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                                >
                                    <Play size={18} fill="currentColor" /> Iniciar Tarea
                                </button>
                            </div>
                        )}
                    </div>

                    {/* History Log */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Historial de Trabajo</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.length === 0 ? (
                                <p className="text-zinc-600 text-sm text-center italic py-4">No hay registros aún.</p>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className="relative pl-4 border-l-2 border-zinc-800 pb-1">
                                        <div className={`absolute -left-[5px] top-0 size-2.5 rounded-full ${log.end_time ? 'bg-zinc-700' : 'bg-cobalt-500'}`}></div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-zinc-200 text-sm">{log.task_name}</p>
                                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <User size={10} />
                                                    {log.profiles?.email?.split('@')[0]}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${log.end_time ? 'bg-zinc-800 text-zinc-400' : 'bg-cobalt-900/30 text-cobalt-400'}`}>
                                                    {calculateDuration(log.start_time, log.end_time)}
                                                </span>
                                            </div>
                                        </div>
                                        {log.notes && <p className="text-xs text-zinc-600 mt-1 italic">"{log.notes}"</p>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Invoice Generation Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-md w-full shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Generar Factura</h2>

                        <div className="space-y-4 mb-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Condición de Venta</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 p-3 rounded border cursor-pointer text-center ${invoiceCondition === 'contado' ? 'bg-cobalt-900/30 border-cobalt-500 text-cobalt-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                                        <input
                                            type="radio"
                                            name="condition"
                                            value="contado"
                                            checked={invoiceCondition === 'contado'}
                                            onChange={() => setInvoiceCondition('contado')}
                                            className="hidden"
                                        />
                                        Contado
                                    </label>
                                    <label className={`flex-1 p-3 rounded border cursor-pointer text-center ${invoiceCondition === 'credito' ? 'bg-cobalt-900/30 border-cobalt-500 text-cobalt-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                                        <input
                                            type="radio"
                                            name="condition"
                                            value="credito"
                                            checked={invoiceCondition === 'credito'}
                                            onChange={() => setInvoiceCondition('credito')}
                                            className="hidden"
                                        />
                                        Crédito
                                    </label>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Detalle de Items</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setInvoiceMode('detailed')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${invoiceMode === 'detailed'
                                            ? 'bg-cobalt-600 text-white border-cobalt-500'
                                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                    >
                                        Detallado
                                    </button>
                                    <button
                                        onClick={() => setInvoiceMode('summary')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${invoiceMode === 'summary'
                                            ? 'bg-cobalt-600 text-white border-cobalt-500'
                                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                    >
                                        Resumido
                                    </button>
                                </div>
                            </div>

                            {invoiceMode === 'detailed' ? (
                                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                    <p className="text-sm text-zinc-400 mb-2">Se copiarán todos los ítems de la orden + Mano de obra.</p>
                                    <div className="flex justify-between items-center font-bold text-white">
                                        <span>Total:</span>
                                        <span>Gs. {subtotal.toLocaleString('es-PY')}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Descripción del Servicio</label>
                                        <textarea
                                            value={summaryDescription}
                                            onChange={(e) => setSummaryDescription(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm outline-none focus:border-cobalt-500"
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Monto Total (Gs.)</label>
                                        <input
                                            type="number"
                                            value={summaryAmount}
                                            onChange={(e) => setSummaryAmount(Number(e.target.value))}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white font-mono font-bold outline-none focus:border-cobalt-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGenerateInvoice}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Generando...' : 'Confirmar y Generar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
