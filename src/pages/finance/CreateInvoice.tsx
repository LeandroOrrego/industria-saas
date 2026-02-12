import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle, Printer, Download, Search, RefreshCw, FileText } from 'lucide-react';
import { Database } from '../../types/supabase';

type ServiceOrder = Database['public']['Tables']['service_orders']['Row'] & { clients: { name: string } };

export default function CreateInvoice() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Config
    const [config, setConfig] = useState<any>(null);

    // Form
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [type, setType] = useState('B');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Items
    const [items, setItems] = useState<{ desc: string; qty: number; price: number }[]>([
        { desc: 'Servicio de...', qty: 1, price: 0 }
    ]);

    // OS Import Data
    const [pendingOS, setPendingOS] = useState<ServiceOrder[]>([]);
    const [showOSModal, setShowOSModal] = useState(false);

    // Print Logic
    const [invoiceId, setInvoiceId] = useState<string | null>(null); // If set, show success/print view

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        const { data: cl } = await supabase.from('clients').select('*');
        setClients(cl || []);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            if (profile?.organization_id) {
                const { data: conf } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
                setConfig(conf);
            }
        }
    }

    // --- Import OS Logic ---
    async function fetchPendingOS() {
        // Fetch 'finalizada' but not 'facturada' ?? Or just all 'finalizada'
        // Ideally we check if os_id is in invoices table, but simpler for now: status = 'finalizada'
        const { data } = await supabase
            .from('service_orders')
            .select('*, clients(name)')
            .eq('status', 'finalizada'); // Only completed orders

        setPendingOS(data as any || []);
        setShowOSModal(true);
    }

    const handleImportOS = async (os: ServiceOrder, detailLevel: 'full' | 'summary') => {
        setSelectedClient(os.client_id);

        if (detailLevel === 'full') {
            // Fetch items
            const { data: osItems } = await supabase
                .from('service_order_items')
                .select('*, products(name, unit)')
                .eq('os_id', os.id);

            const newItems = (osItems || []).map((i: any) => ({
                desc: i.products?.name || 'Ítem',
                qty: i.quantity,
                price: 0 // Price might not be on OS item in this simple schema, usually user sets price now
            }));
            setItems(newItems);
        } else {
            // Summary
            setItems([{
                desc: `Servicio de Mantenimiento - OS #${os.id.slice(0, 8)}`,
                qty: 1,
                price: 0
            }]);
        }
        setShowOSModal(false);
    };


    // --- Form Logic ---
    const handleAddItem = () => setItems([...items, { desc: '', qty: 1, price: 0 }]);
    const handleRemoveItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
    const handleChangeItem = (idx: number, field: string, val: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[idx][field] = val;
        setItems(newItems);
    };
    const calculateTotal = () => items.reduce((sum, i) => sum + (i.qty * i.price), 0);

    const handleSubmit = async () => {
        if (!selectedClient) return alert('Seleccione cliente');
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user?.id).single();

            // Next Invoice Num
            const { data: numStr } = await supabase.rpc('get_next_invoice_number', { p_org_id: profile?.organization_id });

            const { data: inv, error: invError } = await supabase.from('invoices').insert([{
                organization_id: profile?.organization_id,
                client_id: selectedClient,
                type,
                status: 'issued',
                invoice_number: numStr || '000-00000',
                total_amount: calculateTotal(),
                payment_method: paymentMethod,
                due_date: new Date().toISOString(),
                // Config fields snapshot
                timbrado: config?.current_timbrado,
                // Assuming we stored VAT/Desc in structure
            }]).select().single();

            if (invError) throw invError;

            const lines = items.map(i => ({
                invoice_id: inv.id,
                description: i.desc,
                quantity: i.qty,
                unit_price: i.price
            }));

            await supabase.from('invoice_lines').insert(lines);

            // Transaction
            await supabase.from('transactions').insert([{
                organization_id: profile?.organization_id,
                description: `Factura ${inv.type}-${inv.invoice_number}`,
                type: 'income',
                amount: calculateTotal(),
                payment_method: paymentMethod,
                invoice_id: inv.id,
                created_by: user?.id
            }]);

            // Update OS status if imported
            if (importedOsId) {
                await supabase
                    .from('service_orders')
                    .update({ status: 'facturada' })
                    .eq('id', importedOsId);
            }

            setInvoiceId(inv.id); // Show success/print view

        } catch (error) {
            console.error(error);
            alert('Error al emitir');
        } finally {
            setLoading(false);
        }
    };

    // --- Success / Print View ---
    if (invoiceId) {
        return (
            <div className="p-6 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center text-zinc-100">
                <CheckCircle className="text-emerald-500 mb-4" size={64} />
                <h2 className="text-3xl font-bold text-white mb-2">Factura Emitida</h2>
                <p className="text-zinc-500 mb-8">El comprobante ha sido registrado correctamente.</p>

                <div className="flex gap-4">
                    <button onClick={() => window.print()} className="bg-white text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200">
                        <Printer size={20} /> Imprimir
                    </button>
                    <button onClick={() => navigate('/finance/billing')} className="bg-zinc-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-zinc-700">
                        Volver a Lista
                    </button>
                </div>

                {/* Print Only Area - This would be styled with @media print */}
                <div className="hidden print:block fixed inset-0 bg-white text-black p-10 z-[100]">
                    <div className="border border-black p-8 h-full">
                        {/* Header */}
                        <div className="flex justify-between border-b border-black pb-4 mb-4">
                            <div>
                                <h1 className="text-2xl font-bold uppercase">{config?.legal_name || 'EMPRESA DEMO'}</h1>
                                <p className="text-sm">{config?.address || 'Dirección de la empresa'}</p>
                                <p className="text-sm">RUC: {config?.tax_id || '---'}</p>
                            </div>
                            <div className="text-right">
                                <div className="border border-black px-4 py-2 inline-block mb-2">
                                    <span className="text-4xl font-bold">{type}</span>
                                </div>
                                <p className="font-bold">N° 001-001-{Math.floor(Math.random() * 1000)}</p>
                                <p className="text-xs">Timbrado: {config?.current_timbrado}</p>
                                <p className="text-xs">Vig: {config?.timbrado_expiration}</p>
                            </div>
                        </div>

                        {/* Client */}
                        <div className="mb-6">
                            <p><strong>Cliente:</strong> {clients.find(c => c.id === selectedClient)?.name}</p>
                            <p><strong>RUC:</strong> {clients.find(c => c.id === selectedClient)?.tax_id}</p>
                        </div>

                        {/* Items */}
                        <table className="w-full text-left mb-8">
                            <thead>
                                <tr className="border-b border-black">
                                    <th className="py-2">Descripción</th>
                                    <th className="py-2 text-right">Cant</th>
                                    <th className="py-2 text-right">Precio</th>
                                    <th className="py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/10">
                                {items.map((i, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2">{i.desc}</td>
                                        <td className="py-2 text-right">{i.qty}</td>
                                        <td className="py-2 text-right">${i.price.toLocaleString()}</td>
                                        <td className="py-2 text-right">${(i.qty * i.price).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-black font-bold text-lg">
                                    <td colSpan={3} className="pt-4 text-right">TOTAL A PAGAR</td>
                                    <td className="pt-4 text-right">${calculateTotal().toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <p className="text-xs text-center mt-20">Gracias por su preferencia.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-5xl mx-auto bg-zinc-950 min-h-screen text-zinc-100">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/finance/billing')} className="text-zinc-500 hover:text-white">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Nueva Factura</h1>
                        <p className="text-zinc-500 text-sm">Configuración: {config?.legal_name || 'Sin Configuración'}</p>
                    </div>
                </div>
                <button onClick={fetchPendingOS} className="text-sm bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 px-4 py-2 rounded text-zinc-300 flex items-center gap-2">
                    <RefreshCw size={14} /> Importar desde OS
                </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cliente</label>
                        <select
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-cobalt-500"
                            value={selectedClient}
                            onChange={e => setSelectedClient(e.target.value)}
                        >
                            <option value="">Seleccionar...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tipo Factura</label>
                        <select
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-cobalt-500"
                            value={type}
                            onChange={e => setType(e.target.value)}
                        >
                            <option value="B">Factura B (Consumidor Final)</option>
                            <option value="A">Factura A (Responsable Inscripto)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Forma de Pago</label>
                        <select
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-cobalt-500"
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                        >
                            <option value="cash">Efectivo</option>
                            <option value="transfer">Transferencia</option>
                            <option value="check">Cheque</option>
                            <option value="card">Tarjeta</option>
                        </select>
                    </div>
                </div>

                {/* Manual Timbrado Override (Optional, displaying config for now) */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 text-sm">
                    <div>
                        <span className="text-zinc-500 block text-xs uppercase font-bold">Timbrado Actual</span>
                        <span className="text-white font-mono">{config?.current_timbrado || '---'}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500 block text-xs uppercase font-bold">Vencimiento</span>
                        <span className="text-white font-mono">{config?.timbrado_expiration || '---'}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500 block text-xs uppercase font-bold">Próx. Número</span>
                        <span className="text-white font-mono">{config?.invoice_prefix}-{config?.next_invoice_number}</span>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <h3 className="font-bold text-white">Detalle de Factura</h3>
                        <p className="text-xs text-zinc-500">Puedes editar descripciones y precios libremente.</p>
                    </div>

                    {items.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm"
                                placeholder="Descripción"
                                value={item.desc}
                                onChange={e => handleChangeItem(idx, 'desc', e.target.value)}
                            />
                            <input
                                className="w-20 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-right text-sm"
                                type="number"
                                placeholder="Cant"
                                value={item.qty}
                                onChange={e => handleChangeItem(idx, 'qty', parseFloat(e.target.value))}
                            />
                            <div className="relative w-32">
                                <span className="absolute left-2 top-2 text-zinc-500 text-sm">$</span>
                                <input
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 pl-5 text-white text-right text-sm"
                                    type="number"
                                    placeholder="Precio"
                                    value={item.price}
                                    onChange={e => handleChangeItem(idx, 'price', parseFloat(e.target.value))}
                                />
                            </div>
                            <button onClick={() => handleRemoveItem(idx)} className="text-zinc-600 hover:text-red-500 px-2 transition-colors">
                                <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </div>
                    ))}

                    <button onClick={handleAddItem} className="text-sm font-bold text-cobalt-400 hover:text-cobalt-300 flex items-center gap-1 mt-2">
                        <span className="material-symbols-outlined text-sm">add</span> Agregar Línea
                    </button>
                </div>

                <div className="flex justify-end pt-6 border-t border-zinc-800">
                    <div className="text-right mr-8">
                        <p className="text-sm text-zinc-500 font-bold uppercase">Total a Pagar</p>
                        <p className="text-3xl font-bold text-white font-mono">${calculateTotal().toLocaleString()}</p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cobalt-900/20 transition-all"
                    >
                        {loading ? 'Emitiendo...' : <><CheckCircle size={20} /> Emitir Factura</>}
                    </button>
                </div>
            </div>

            {/* Import Modal */}
            {showOSModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0">
                            <h3 className="text-xl font-bold text-white">Importar Orden De Servicio</h3>
                            <button onClick={() => setShowOSModal(false)} className="text-zinc-500 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {pendingOS.length === 0 ? (
                                <p className="text-center text-zinc-500">No hay órdenes pendientes de facturación.</p>
                            ) : (
                                pendingOS.map(os => (
                                    <div key={os.id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex justify-between items-center group hover:border-zinc-600 transition-colors">
                                        <div>
                                            <p className="font-bold text-white">OS #{os.id.slice(0, 8)} - {os.clients?.name}</p>
                                            <p className="text-xs text-zinc-500">{new Date(os.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleImportOS(os, 'summary')}
                                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-bold text-zinc-300 border border-zinc-700 transition-colors"
                                            >
                                                Resumido
                                            </button>
                                            <button
                                                onClick={() => handleImportOS(os, 'full')}
                                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs font-bold text-white border border-zinc-700 transition-colors"
                                            >
                                                Detallado
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
