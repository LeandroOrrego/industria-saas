
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Save, Trash2, Search, Loader2, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Database } from '../../../types/supabase';

// Reuse types or define local subset
type ServiceOrder = Database['public']['Tables']['service_orders']['Row'] & {
    clients: Database['public']['Tables']['clients']['Row'] | null;
};

type OrderItem = Database['public']['Tables']['service_order_items']['Row'] & {
    products: Database['public']['Tables']['products']['Row'] | null;
};

interface ServiceOrderDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string | null;
    onUpdate: () => void;
}

export default function ServiceOrderDrawer({ isOpen, onClose, orderId, onUpdate }: ServiceOrderDrawerProps) {
    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'items' | 'labor'>('general');
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    // Edit State
    const [status, setStatus] = useState<string>('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('normal');
    const [laborCost, setLaborCost] = useState(0);

    // Invoice State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceMode, setInvoiceMode] = useState<'detailed' | 'summary'>('detailed');
    const [invoiceCondition, setInvoiceCondition] = useState<'contado' | 'credito'>('contado');
    const [summaryDescription, setSummaryDescription] = useState('');
    const [summaryAmount, setSummaryAmount] = useState(0);

    // Item Search
    const [showItemSearch, setShowItemSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && orderId) {
            fetchOrderDetails(orderId);
        } else {
            setOrder(null);
            setItems([]);
        }
    }, [isOpen, orderId]);

    const calculateTotal = () => {
        const itemsTotal = items.reduce((sum, item) => {
            const price = item.products?.sale_price || 0;
            return sum + (price * item.quantity);
        }, 0);
        return itemsTotal + laborCost;
    };

    const handleGenerateInvoice = async () => {
        if (!order) return;

        setSaving(true);
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
            const subtotal = calculateTotal();
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
                const invoiceLines = items.map(item => ({
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
                        // os_item_id: null,
                        description: 'Mano de Obra / Servicios',
                        quantity: 1,
                        unit_price: laborCost
                    } as any);
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

            // 5. Update OS Status
            await supabase
                .from('service_orders')
                .update({ status: 'facturada' })
                .eq('id', order.id);

            alert('Factura generada correctamente: ' + formattedNum);
            onUpdate(); // Refresh parent list
            onClose(); // Close drawer
            navigate(`/finance/billing/${invoice.id}`);

        } catch (error: any) {
            console.error('Error generating invoice:', error);
            alert('Error al generar factura: ' + error.message);
        } finally {
            setSaving(false);
            setShowInvoiceModal(false);
        }
    };

    const fetchOrderDetails = async (id: string) => {
        setLoading(true);
        try {
            const { data: orderData, error: orderError } = await supabase
                .from('service_orders')
                .select('*, clients(*)')
                .eq('id', id)
                .single();

            if (orderError) throw orderError;

            const { data: itemsData, error: itemsError } = await supabase
                .from('service_order_items')
                .select('*, products(*)')
                .eq('os_id', id);

            if (itemsError) throw itemsError;

            setOrder(orderData as any);
            setItems(itemsData as any);

            // Init Form
            setStatus(orderData.status);
            setDescription(orderData.description || '');
            setPriority(orderData.priority || 'normal');
            setLaborCost(orderData.labor_cost || 0);

        } catch (error) {
            console.error('Error fetching order details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGeneral = async () => {
        if (!orderId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('service_orders')
                .update({
                    status,
                    description,
                    priority,
                    labor_cost: laborCost
                })
                .eq('id', orderId);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error saving order:', error);
            alert('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleSearchProducts = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        const { data } = await supabase
            .from('products')
            .select('*')
            .ilike('name', `%${term}%`)
            .limit(5);

        setSearchResults(data || []);
    };

    const handleAddItem = async (product: any) => {
        if (!orderId) return;
        try {
            const { error } = await supabase
                .from('service_order_items')
                .insert({
                    os_id: orderId,
                    product_id: product.id,
                    quantity: 1,
                    unit_price: product.sale_price // Snapshot price? Or dynamic? Using 0 implies fetch from product usually
                });

            if (error) throw error;

            // Refresh items
            const { data } = await supabase
                .from('service_order_items')
                .select('*, products(*)')
                .eq('os_id', orderId);
            setItems(data as any || []);
            setShowItemSearch(false);
            setSearchTerm('');
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleUpdateQuantity = async (itemId: string, newQty: number) => {
        if (newQty < 1) return;
        // Optimistic update
        setItems(items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));

        await supabase.from('service_order_items').update({ quantity: newQty }).eq('id', itemId);
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('¿Eliminar ítem?')) return;
        setItems(items.filter(i => i.id !== itemId));
        await supabase.from('service_order_items').delete().eq('id', itemId);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-zinc-800 flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-start bg-gray-50 dark:bg-zinc-900">
                    <div>
                        {loading ? (
                            <div className="h-6 w-32 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse mb-2"></div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {order?.clients?.name || 'Cliente Desconocido'}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-zinc-400 font-mono">OS #{order?.id.slice(0, 8)}</p>
                            </>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                        <X size={24} />
                    </button>
                </div>

                {/* Status Bar */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-2 block">Estado Actual</label>
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-950 rounded-lg">
                        {['abierta', 'en_proceso', 'control_calidad', 'finalizada'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${status === s
                                    ? 'bg-white dark:bg-zinc-800 text-cobalt-600 dark:text-cobalt-400 shadow-sm ring-1 ring-gray-200 dark:ring-zinc-700'
                                    : 'text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400'
                                    }`}
                            >
                                {s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-cobalt-500 text-cobalt-600 dark:text-cobalt-400' : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('items')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'items' ? 'border-cobalt-500 text-cobalt-600 dark:text-cobalt-400' : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                    >
                        Insumos ({items.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('labor')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'labor' ? 'border-cobalt-500 text-cobalt-600 dark:text-cobalt-400' : 'border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'}`}
                    >
                        Mano de Obra
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-zinc-950/50">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-cobalt-500" /></div>
                    ) : (
                        <>
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Descripción del Problema</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-cobalt-500"
                                            placeholder="Detalles del trabajo a realizar..."
                                        />
                                    </div>

                                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Prioridad</label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-cobalt-500"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="alta">Alta</option>
                                            <option value="urgente">Urgente</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'items' && (
                                <div className="space-y-4">
                                    {/* Add Item */}
                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar insumo..."
                                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-cobalt-500"
                                                    value={searchTerm}
                                                    onChange={(e) => handleSearchProducts(e.target.value)}
                                                    onFocus={() => setShowItemSearch(true)}
                                                />
                                            </div>
                                        </div>

                                        {/* Search Results Dropdown */}
                                        {showItemSearch && searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                                                {searchResults.map(prod => (
                                                    <button
                                                        key={prod.id}
                                                        onClick={() => handleAddItem(prod)}
                                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-100 dark:border-zinc-800 last:border-0"
                                                    >
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{prod.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-zinc-500 flex justify-between">
                                                            <span>Stock: {prod.current_stock}</span>
                                                            <span className="font-mono text-cobalt-600 dark:text-cobalt-400">Gs. {prod.sale_price.toLocaleString()}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Items List */}
                                    <div className="space-y-2">
                                        {items.map(item => (
                                            <div key={item.id} className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-gray-200 dark:border-zinc-800 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{item.products?.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-zinc-500">
                                                        {item.products?.type} • Gs. {item.products?.sale_price?.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center bg-gray-50 dark:bg-zinc-950 rounded border border-gray-200 dark:border-zinc-800">
                                                        <button
                                                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                            className="px-2 py-1 text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white"
                                                        >-</button>
                                                        <span className="text-sm font-mono w-6 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                                                        <button
                                                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                            className="px-2 py-1 text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white"
                                                        >+</button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {items.length === 0 && (
                                            <p className="text-center text-gray-500 dark:text-zinc-500 text-sm py-4 italic">No hay insumos agregados.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'labor' && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Costo Total Mano de Obra (Gs.)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-gray-500 dark:text-zinc-500 text-sm font-bold">Gs.</span>
                                            <input
                                                type="number"
                                                value={laborCost}
                                                onChange={(e) => setLaborCost(Number(e.target.value))}
                                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-lg font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-cobalt-500"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">
                                            Ingresa el valor total estimado o final de la mano de obra para esta orden.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    {order && order.status === 'finalizada' ? (
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="flex-1 bg-cobalt-600 hover:bg-cobalt-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-cobalt-900/20 flex justify-center items-center gap-2"
                        >
                            <FileText size={18} />
                            Generar Factura
                        </button>
                    ) : (
                        <button
                            onClick={handleSaveGeneral}
                            disabled={saving}
                            className="flex-1 bg-cobalt-600 hover:bg-cobalt-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-cobalt-900/20 flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar Cambios
                        </button>
                    )}
                </div>

            </div>

            {/* Invoice Generation Modal (Internal to Drawer for now) */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Generar Factura</h2>

                        <div className="space-y-4 mb-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-2">Condición de Venta</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 p-3 rounded border cursor-pointer text-center ${invoiceCondition === 'contado' ? 'bg-cobalt-50 dark:bg-cobalt-900/30 border-cobalt-500 text-cobalt-600 dark:text-cobalt-400' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-500'}`}>
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
                                    <label className={`flex-1 p-3 rounded border cursor-pointer text-center ${invoiceCondition === 'credito' ? 'bg-cobalt-50 dark:bg-cobalt-900/30 border-cobalt-500 text-cobalt-600 dark:text-cobalt-400' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-500'}`}>
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
                                <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-2">Detalle de Items</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setInvoiceMode('detailed')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${invoiceMode === 'detailed'
                                            ? 'bg-cobalt-600 text-white border-cobalt-500'
                                            : 'bg-white dark:bg-zinc-950 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                                            }`}
                                    >
                                        Detallado
                                    </button>
                                    <button
                                        onClick={() => setInvoiceMode('summary')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${invoiceMode === 'summary'
                                            ? 'bg-cobalt-600 text-white border-cobalt-500'
                                            : 'bg-white dark:bg-zinc-950 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                                            }`}
                                    >
                                        Resumido
                                    </button>
                                </div>
                            </div>

                            {invoiceMode === 'detailed' ? (
                                <div className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
                                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-2">Se copiarán todos los ítems de la orden + Mano de obra.</p>
                                    <div className="flex justify-between items-center font-bold text-gray-900 dark:text-white">
                                        <span>Total:</span>
                                        <span>Gs. {calculateTotal().toLocaleString('es-PY')}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1">Descripción del Servicio</label>
                                        <textarea
                                            value={summaryDescription}
                                            onChange={(e) => setSummaryDescription(e.target.value)}
                                            className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded p-2 text-gray-900 dark:text-white text-sm outline-none focus:border-cobalt-500"
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1">Monto Total (Gs.)</label>
                                        <input
                                            type="number"
                                            value={summaryAmount}
                                            onChange={(e) => setSummaryAmount(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded p-2 text-gray-900 dark:text-white font-mono font-bold outline-none focus:border-cobalt-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                className="px-4 py-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleGenerateInvoice}
                                disabled={saving}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                {saving ? 'Generando...' : 'Confirmar y Generar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
