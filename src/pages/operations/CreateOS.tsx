import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search, Save, Calendar, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

interface OrderItem {
    product_id: string;
    product: Product;
    quantity: number;
}

export default function CreateOS() {
    const navigate = useNavigate();
    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedClientId, setSelectedClientId] = useState('');

    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('normal');
    const [deliveryDate, setDeliveryDate] = useState('');

    const [items, setItems] = useState<OrderItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [loadingClients, setLoadingClients] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [searchParams] = useSearchParams();
    const osIdToEdit = searchParams.get('id');

    useEffect(() => {
        fetchClients();
        fetchProducts();
        if (osIdToEdit) {
            loadOrderData(osIdToEdit);
        }
    }, [osIdToEdit]);

    async function loadOrderData(id: string) {
        setLoadingProducts(true);
        const { data: os, error } = await supabase
            .from('service_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error loading OS:', error);
            alert('Error al cargar la orden.');
            return;
        }

        if (os) {
            setSelectedClientId(os.client_id);
            setDescription(os.description || '');
            setPriority(os.priority || 'normal');
            setDeliveryDate(os.delivery_date ? os.delivery_date.split('T')[0] : '');
        }

        const { data: itemsData } = await supabase
            .from('service_order_items')
            .select('*, product:products(*)')
            .eq('os_id', id);

        if (itemsData) {
            const mappedItems: OrderItem[] = itemsData.map((item: any) => ({
                product_id: item.product_id,
                product: item.product,
                quantity: item.quantity
            }));
            setItems(mappedItems);
        }
        setLoadingProducts(false);
    }

    async function fetchClients() {
        const { data } = await supabase.from('clients').select('*').order('name');
        if (data) setClients(data);
        setLoadingClients(false);
    }

    async function fetchProducts() {
        const { data } = await supabase.from('products').select('*').order('name');
        if (data) setProducts(data);
        setLoadingProducts(false);
    }

    const addItem = (product: Product) => {
        const existing = items.find(i => i.product_id === product.id);
        if (existing) {
            setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setItems([...items, { product_id: product.id, product, quantity: 1 }]);
        }
    };

    const removeItem = (productId: string) => {
        setItems(items.filter(i => i.product_id !== productId));
    };

    const updateQuantity = (productId: string, newQty: number) => {
        if (newQty <= 0) return;
        setItems(items.map(i => i.product_id === productId ? { ...i, quantity: newQty } : i));
    };

    const handleSubmit = async () => {
        if (!selectedClientId) {
            alert('Por favor selecciona un cliente.');
            return;
        }
        if (!description.trim()) {
            alert('La descripción es obligatoria.');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) throw new Error('No organization found');

            let targetOsId = osIdToEdit;

            if (osIdToEdit) {
                // UPDATE header
                const { error: updateError } = await supabase
                    .from('service_orders')
                    .update({
                        client_id: selectedClientId,
                        description,
                        priority,
                        delivery_date: deliveryDate || null
                    })
                    .eq('id', osIdToEdit);
                if (updateError) throw updateError;

                // Obtener items actuales en BD
                const { data: existingItems } = await supabase
                    .from('service_order_items')
                    .select('id, product_id, quantity')
                    .eq('os_id', osIdToEdit);

                const existing = existingItems || [];

                // Items a eliminar: están en BD pero no en el form
                const toDelete = existing.filter(
                    e => !items.find(i => i.product_id === e.product_id)
                );

                // Items a insertar: están en el form pero no en BD
                const toInsert = items.filter(
                    i => !existing.find(e => e.product_id === i.product_id)
                );

                // Items a actualizar: están en ambos con distinta cantidad
                const toUpdate = items.filter(i => {
                    const match = existing.find(e => e.product_id === i.product_id);
                    return match && match.quantity !== i.quantity;
                });

                if (toDelete.length > 0) {
                    const { error } = await supabase
                        .from('service_order_items')
                        .delete()
                        .in('id', toDelete.map(d => d.id));
                    if (error) throw error;
                }

                if (toInsert.length > 0) {
                    const { error } = await supabase
                        .from('service_order_items')
                        .insert(toInsert.map(i => ({
                            os_id: osIdToEdit,
                            product_id: i.product_id,
                            quantity: i.quantity,
                        })));
                    if (error) throw error;
                }

                for (const item of toUpdate) {
                    const match = existing.find(e => e.product_id === item.product_id)!;
                    const { error } = await supabase
                        .from('service_order_items')
                        .update({ quantity: item.quantity })
                        .eq('id', match.id);
                    if (error) throw error;
                }

            } else {
                // INSERT nueva OS
                const { data: osData, error: osError } = await supabase
                    .from('service_orders')
                    .insert([{
                        client_id: selectedClientId,
                        status: 'abierta',
                        description,
                        priority,
                        delivery_date: deliveryDate || null,
                        organization_id: profile.organization_id
                    }])
                    .select()
                    .single();
                if (osError) throw osError;
                targetOsId = osData.id;

                if (items.length > 0) {
                    const { error: itemsError } = await supabase
                        .from('service_order_items')
                        .insert(items.map(item => ({
                            os_id: targetOsId,
                            product_id: item.product_id,
                            quantity: item.quantity,
                        })));
                    if (itemsError) throw itemsError;
                }
            }

            navigate('/operations/dashboard');
        } catch (error: any) {
            console.error('Error creating/updating OS:', error);
            alert(`Error al guardar la orden: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100 font-sans">
            <div className="flex items-center mb-8 border-b border-gray-200 dark:border-zinc-800 pb-4">
                <button onClick={() => navigate('/operations/dashboard')} className="mr-4 text-gray-500 dark:text-zinc-500 hover:text-cobalt-600 dark:hover:text-cobalt-400 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {osIdToEdit ? 'Editar Orden de Servicio' : 'Nueva Orden de Servicio'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-zinc-500">
                        {osIdToEdit ? 'Modificar detalles de la orden existente' : 'Apertura de nuevo trabajo en taller'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-6">

                    {/* General Info */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-cobalt-600 dark:text-cobalt-500" />
                            Información General
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2">Cliente</label>
                                <select
                                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    disabled={loadingClients}
                                >
                                    <option value="">Seleccionar Cliente...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.tax_id ? `(${c.tax_id})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2">Fecha Entrega Estimada</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={16} />
                                    <input
                                        type="date"
                                        className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-cobalt-500 outline-none dark:[color-scheme:dark]"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2">Descripción del Trabajo</label>
                            <textarea
                                className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-1 focus:ring-cobalt-500 outline-none h-24 resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                                placeholder="Detalla el trabajo a realizar (medidas, materiales, acabados)..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase mb-2">Prioridad</label>
                            <div className="flex gap-4">
                                {[
                                    { value: 'normal', label: 'Normal', color: 'cobalt' },
                                    { value: 'alta', label: 'Alta', color: 'amber' },
                                    { value: 'urgente', label: 'Urgente', color: 'red' },
                                ].map(({ value, label, color }) => (
                                    <label key={value} className={`flex-1 cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${priority === value
                                            ? `bg-${color}-50 border-${color}-500 text-${color}-600 dark:bg-${color}-500/20 dark:text-${color}-400`
                                            : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                        }`}>
                                        <input type="radio" name="priority" value={value} checked={priority === value} onChange={() => setPriority(value)} className="hidden" />
                                        {value !== 'normal' && <AlertTriangle size={16} />}
                                        <span className="font-bold text-sm">{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Products */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm min-h-[400px]">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Search size={20} className="text-gray-400 dark:text-zinc-500" />
                            Agregar Insumos / Servicios
                        </h2>
                        <div className="mb-6 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar materiales o servicios..."
                                className="w-full bg-white dark:bg-zinc-950 pl-10 pr-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-cobalt-500 text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredProducts.slice(0, 12).map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addItem(product)}
                                    className="flex flex-col items-start p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-cobalt-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all text-left group"
                                >
                                    <span className="font-bold text-gray-700 dark:text-zinc-300 text-sm group-hover:text-cobalt-600 dark:group-hover:text-cobalt-400 line-clamp-2 mb-2">{product.name}</span>
                                    <div className="mt-auto flex justify-between w-full text-xs">
                                        <span className="text-gray-500 dark:text-zinc-500 uppercase tracking-wider text-[10px]">{product.type}</span>
                                        <span className={`font-mono font-bold ${product.current_stock < product.min_stock ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {product.current_stock} {product.unit}
                                        </span>
                                    </div>
                                </button>
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="col-span-full text-center py-12 text-gray-500 dark:text-zinc-600">
                                    No se encontraron productos.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Summary */}
                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm lg:sticky lg:top-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Resumen de Insumos</h2>
                        <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
                            {items.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-zinc-800 rounded-xl">
                                    <p className="text-gray-500 dark:text-zinc-500 text-sm">No hay ítems seleccionados.</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.product_id} className="flex flex-col p-3 bg-gray-50 dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-bold text-sm text-gray-800 dark:text-zinc-300 line-clamp-1">{item.product.name}</p>
                                            <button onClick={() => removeItem(item.product_id)} className="text-gray-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase text-gray-500 dark:text-zinc-600 font-bold">{item.product.type}</span>
                                            <div className="flex items-center bg-white dark:bg-zinc-900 rounded border border-gray-200 dark:border-zinc-800">
                                                <input
                                                    type="number"
                                                    className="w-12 px-1 py-1 text-xs bg-transparent text-gray-900 dark:text-white text-center outline-none border-r border-gray-200 dark:border-zinc-800"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value))}
                                                />
                                                <span className="text-[10px] text-gray-500 dark:text-zinc-500 px-2 font-mono">{item.product.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="border-t border-gray-200 dark:border-zinc-800 pt-6">
                            <div className="flex justify-between text-sm text-gray-500 dark:text-zinc-400 mb-6">
                                <span>Total Ítems:</span>
                                <span className="font-bold text-gray-900 dark:text-white">{items.length}</span>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full bg-cobalt-600 text-white py-3.5 rounded-xl font-bold hover:bg-cobalt-500 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cobalt-900/20"
                            >
                                {submitting ? 'Guardando...' : (
                                    <>
                                        <Save size={18} className="mr-2" />
                                        {osIdToEdit ? 'Guardar Cambios' : 'Crear Orden de Servicio'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
