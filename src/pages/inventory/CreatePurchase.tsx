import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Save, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { Database } from '../../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type Provider = Database['public']['Tables']['providers']['Row'];

export default function CreatePurchase() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [providers, setProviders] = useState<Provider[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Invoice Header Data
    const [selectedProviderId, setSelectedProviderId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceType, setInvoiceType] = useState('Contado');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [description, setDescription] = useState('');

    // Items State
    const [items, setItems] = useState<{
        productId: string;
        quantity: number;
        unitPrice: number;
        taxRate: 0 | 5 | 10
    }[]>([]);

    // Line Editing
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [currentLine, setCurrentLine] = useState({
        productId: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 10 as 0 | 5 | 10
    });

    // Product Search State
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    const { id } = useParams();
    const isEditing = !!id;

    useEffect(() => {
        const load = async () => {
            await fetchData();
            if (id) {
                await fetchPurchaseDetails(id);
            }
        };
        load();
    }, [id]);

    async function fetchPurchaseDetails(poId: string) {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*, purchase_order_items(*)')
                .eq('id', poId)
                .single();

            if (error) throw error;
            if (data) {
                setSelectedProviderId(data.provider_id);
                setInvoiceNumber(data.invoice_number || '');
                setInvoiceType(data.invoice_type || 'Contado');
                setPaymentMethod(data.payment_method || 'cash');
                setOrderDate(data.order_date);
                setNotes(data.notes || '');
                setDescription(data.description || '');

                const loadedItems = data.purchase_order_items.map((item: any) => ({
                    productId: item.product_id,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    taxRate: 10 as 0 | 5 | 10
                }));
                setItems(loadedItems);
            }
        } catch (error) {
            console.error('Error fetching purchase:', error);
            alert('Error al cargar la compra.');
        } finally {
            setLoading(false);
        }
    }

    async function fetchData() {
        const { data: provs } = await supabase.from('providers').select('*').eq('status', 'active');
        const { data: prods } = await supabase.from('products').select('*');
        setProviders(provs || []);
        setProducts(prods || []);
    }

    const handleAddItem = () => {
        if (!currentLine.productId || currentLine.quantity <= 0) return;

        if (editingIndex !== null) {
            // Update existing
            const newItems = [...items];
            newItems[editingIndex] = { ...currentLine };
            setItems(newItems);
            setEditingIndex(null);
        } else {
            // Add new
            setItems([...items, { ...currentLine }]);
        }

        // Reset line (keep tax rate same as convenience)
        setCurrentLine({ productId: '', quantity: 1, unitPrice: 0, taxRate: 10 });
        setProductSearch('');
    };

    const handleEditItem = (index: number) => {
        setEditingIndex(index);
        const item = items[index];
        setCurrentLine({ ...item });
        const prodName = products.find(p => p.id === item.productId)?.name || '';
        setProductSearch(prodName);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
        if (editingIndex === index) {
            setEditingIndex(null);
            setCurrentLine({ productId: '', quantity: 1, unitPrice: 0, taxRate: 10 });
        }
    };

    const calculateTotals = () => {
        let total = 0;
        let iva5 = 0;
        let iva10 = 0;
        let exempt = 0;

        items.forEach(item => {
            const lineTotal = item.quantity * item.unitPrice;
            total += lineTotal;

            if (item.taxRate === 5) {
                iva5 += Math.round(lineTotal / 21); // 5% VAT is 1/21 of gross
            } else if (item.taxRate === 10) {
                iva10 += Math.round(lineTotal / 11); // 10% VAT is 1/11 of gross
            } else {
                exempt += lineTotal;
            }
        });

        return { total, iva5, iva10, exempt };
    };



    // Modified Submit Logic for correct flow: Insert as Ordered -> Call RPC
    const handleSavePurchase = async () => {
        if (!selectedProviderId || items.length === 0) {
            alert('Seleccione un proveedor y agregue al menos un ítem.');
            return;
        }
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const totals = calculateTotals();

            if (isEditing && id) {
                // UPDATE using RPC
                const { error } = await supabase.rpc('update_purchase_order', {
                    p_po_id: id,
                    p_provider_id: selectedProviderId,
                    p_date: orderDate,
                    p_invoice_number: invoiceNumber,
                    p_invoice_type: invoiceType,
                    p_payment_method: paymentMethod,
                    p_description: description,
                    p_notes: notes,
                    p_total_amount: totals.total,
                    p_iva_5: totals.iva5,
                    p_iva_10: totals.iva10,
                    p_exempt: totals.exempt,
                    p_items: items.map(i => ({
                        product_id: i.productId,
                        quantity: i.quantity,
                        unit_price: i.unitPrice
                    })),
                    p_user_id: user?.id
                });

                if (error) throw error;
                alert('Compra actualizada correctamente.');

            } else {
                // CREATE
                const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user?.id).single();

                // 1. Create Purchase Header (Status Ordered initially)
                const { data: po, error: poError } = await supabase.from('purchase_orders').insert([{
                    organization_id: profile?.organization_id,
                    provider_id: selectedProviderId,
                    status: 'ordered',
                    order_date: orderDate,
                    delivery_date: orderDate,
                    total_amount: totals.total,
                    notes: notes,
                    invoice_number: invoiceNumber,
                    invoice_type: invoiceType,
                    payment_method: paymentMethod,
                    description: description,
                    iva_5: totals.iva5,
                    iva_10: totals.iva10,
                    exempt_amount: totals.exempt
                }]).select().single();

                if (poError) throw poError;

                // 2. Create Items
                const poItems = items.map(item => ({
                    po_id: po.id,
                    product_id: item.productId,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    received_quantity: 0
                }));

                const { error: itemsError } = await supabase.from('purchase_order_items').insert(poItems);
                if (itemsError) throw itemsError;

                // 3. Process Receipt (Update Stock)
                const { error: receiptError } = await supabase.rpc('process_purchase_receipt', {
                    p_po_id: po.id,
                    p_user_id: user?.id
                });
                if (receiptError) throw receiptError;

                alert('Compra registrada y stock actualizado correctamente.');
            }

            navigate('/inventory/purchases');

        } catch (error: any) {
            console.error('Error creating/updating Purchase:', error);
            alert('Error al guardar compra: ' + error.message);
        } finally {
            setLoading(false);
        }
    }


    const totals = calculateTotals();

    return (
        <div className="p-6 max-w-5xl mx-auto bg-zinc-950 min-h-screen text-zinc-100 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/inventory/purchases')} className="text-zinc-500 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{isEditing ? 'Editar Factura de Compra' : 'Cargar Factura de Compra'}</h1>
                        <p className="text-zinc-500 text-sm mt-1">{isEditing ? 'Modificar datos de la factura' : 'Registro de gastos y reposición de stock'}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSavePurchase}
                        disabled={loading}
                        className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-cobalt-900/20"
                    >
                        {loading ? 'Guardando...' : <><Save size={18} /> {isEditing ? 'Actualizar Compra' : 'Guardar Compra'}</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Metadatos (Izquierda) */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 space-y-4">
                        <h3 className="font-bold text-white text-lg">Datos de Factura</h3>

                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Proveedor</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                value={selectedProviderId}
                                onChange={e => setSelectedProviderId(e.target.value)}
                            >
                                <option value="">Seleccionar Proveedor...</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nro. Factura</label>
                                <input
                                    type="text"
                                    placeholder="001-001-000xxxx"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none text-lg font-mono tracking-wider"
                                    value={invoiceNumber}
                                    onChange={e => setInvoiceNumber(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Concepto / Descripción</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Compra de Materiales..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                value={invoiceType}
                                onChange={e => setInvoiceType(e.target.value)}
                            >
                                <option value="Contado">Contado</option>
                                <option value="Crédito">Crédito</option>
                            </select>
                        </div>

                        {invoiceType === 'Contado' && (
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Forma de Pago</label>
                                <select
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                >
                                    <option value="cash">Efectivo</option>
                                    <option value="transfer">Transferencia Bancaria</option>
                                    <option value="check">Cheque</option>
                                    <option value="credit_card">Tarjeta de Débito/Crédito</option>
                                    <option value="other">Otros</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Fecha Emisión</label>
                            <input
                                type="date"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none [color-scheme:dark]"
                                value={orderDate}
                                onChange={e => setOrderDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Items (Derecha) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
                        <h3 className="font-bold text-white text-lg mb-4">Detalle de Productos</h3>

                        {/* Add/Edit Item Form */}
                        <div className={`p-4 rounded-lg border border-zinc-800 border-dashed mb-6 ${editingIndex !== null ? 'bg-cobalt-900/10 border-cobalt-500/50' : 'bg-zinc-950/50'}`}>
                            <div className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Producto</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar producto..."
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm text-white outline-none focus:border-cobalt-500"
                                            value={productSearch}
                                            onChange={e => {
                                                setProductSearch(e.target.value);
                                                setShowProductDropdown(true);
                                                if (currentLine.productId) setCurrentLine({ ...currentLine, productId: '' });
                                            }}
                                            onFocus={() => setShowProductDropdown(true)}
                                        />
                                        {showProductDropdown && (productSearch || products.length > 0) && (
                                            <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                {products
                                                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                                    .map(p => (
                                                        <button
                                                            key={p.id}
                                                            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800 last:border-0"
                                                            onClick={() => {
                                                                setCurrentLine({ ...currentLine, productId: p.id });
                                                                setProductSearch(p.name);
                                                                setShowProductDropdown(false);
                                                            }}
                                                        >
                                                            <div className="font-bold">{p.name}</div>
                                                            <div className="text-xs text-zinc-500">{p.unit} - Stock: {p.current_stock}</div>
                                                        </button>
                                                    ))}
                                                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                                    <div className="px-3 py-2 text-sm text-zinc-500 italic">No se encontraron productos.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cant.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm text-white outline-none text-right"
                                        value={currentLine.quantity}
                                        onChange={e => setCurrentLine({ ...currentLine, quantity: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Costo Unit (Gs.)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm text-white outline-none text-right"
                                        value={currentLine.unitPrice}
                                        onChange={e => setCurrentLine({ ...currentLine, unitPrice: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2 relative">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">IVA</label>
                                    <select
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm text-white outline-none"
                                        value={currentLine.taxRate}
                                        onChange={e => setCurrentLine({ ...currentLine, taxRate: parseInt(e.target.value) as 0 | 5 | 10 })}
                                    >
                                        <option value="10">10%</option>
                                        <option value="5">5%</option>
                                        <option value="0">Exenta</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end mt-3">
                                {editingIndex !== null && (
                                    <button
                                        onClick={() => { setEditingIndex(null); setCurrentLine({ productId: '', quantity: 1, unitPrice: 0, taxRate: 10 }); }}
                                        className="mr-2 text-zinc-400 hover:text-white text-sm underline"
                                    >
                                        Cancelar Edición
                                    </button>
                                )}
                                <button
                                    onClick={handleAddItem}
                                    className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors ${editingIndex !== null ? 'bg-cobalt-600 hover:bg-cobalt-500 text-white' : 'bg-white hover:bg-zinc-200 text-black'}`}
                                >
                                    {editingIndex !== null ? <Check size={16} /> : <Plus size={16} />}
                                    {editingIndex !== null ? 'Actualizar Ítem' : 'Agregar Ítem'}
                                </button>
                            </div>
                        </div>

                        {/* Inventory Table */}
                        <div className="overflow-hidden rounded-lg border border-zinc-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-950 text-zinc-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Producto</th>
                                        <th className="px-4 py-3 text-right">Cant.</th>
                                        <th className="px-4 py-3 text-right">Unit.</th>
                                        <th className="px-4 py-3 text-right">IVA</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-zinc-500 italic">No hay ítems agregados.</td>
                                        </tr>
                                    ) : (
                                        items.map((item, index) => {
                                            const prod = products.find(p => p.id === item.productId);
                                            return (
                                                <tr key={index} className={`bg-zinc-900 hover:bg-zinc-800/50 transition-colors ${editingIndex === index ? 'bg-cobalt-900/20' : ''}`}>
                                                    <td className="px-4 py-3 text-white">{prod?.name || 'Desconocido'}</td>
                                                    <td className="px-4 py-3 text-right text-zinc-300">
                                                        {item.quantity} <span className="text-xs text-zinc-500">{prod?.unit}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-zinc-300">{item.unitPrice.toLocaleString()} Gs.</td>
                                                    <td className="px-4 py-3 text-right text-zinc-500">{item.taxRate > 0 ? `${item.taxRate}%` : 'Ex.'}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-white">{(item.quantity * item.unitPrice).toLocaleString()} Gs.</td>
                                                    <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEditItem(index)}
                                                            className="p-1 text-zinc-500 hover:text-blue-400 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveItem(index)}
                                                            className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                <tfoot className="bg-zinc-950 font-bold text-white">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs text-zinc-500">Total General</td>
                                        <td className="px-4 py-3 text-right text-lg text-emerald-500">{totals.total.toLocaleString()} Gs.</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* VAT Breakdown */}
                        {(totals.iva5 > 0 || totals.iva10 > 0 || totals.exempt > 0) && (
                            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
                                <div className="text-right">
                                    <span className="block uppercase font-bold text-zinc-500">Exentas</span>
                                    {totals.exempt.toLocaleString()} Gs.
                                </div>
                                <div className="text-right">
                                    <span className="block uppercase font-bold text-zinc-500">IVA 5%</span>
                                    {totals.iva5.toLocaleString()} Gs.
                                </div>
                                <div className="text-right">
                                    <span className="block uppercase font-bold text-zinc-500">IVA 10%</span>
                                    {totals.iva10.toLocaleString()} Gs.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
