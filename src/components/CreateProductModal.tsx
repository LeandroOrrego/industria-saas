import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Loader2 } from 'lucide-react';

interface CreateProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: any; // Optional product to edit
}

export default function CreateProductModal({ isOpen, onClose, onSuccess, productToEdit }: CreateProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState('Material');
    const [unit, setUnit] = useState('u');
    const [minStock, setMinStock] = useState('10');
    const [costPrice, setCostPrice] = useState('0');
    const [salePrice, setSalePrice] = useState('0');

    // Load data when modal opens or productToEdit changes
    React.useEffect(() => {
        if (productToEdit) {
            setName(productToEdit.name);
            setType(productToEdit.type || 'Material');
            setUnit(productToEdit.unit || 'u');
            setMinStock(productToEdit.min_stock?.toString() || '10');
            setCostPrice(productToEdit.cost_price?.toString() || '0');
            setSalePrice(productToEdit.sale_price?.toString() || '0');
        } else {
            // Reset for create mode
            setName('');
            setType('Material');
            setUnit('u');
            setMinStock('10');
            setCostPrice('0');
            setSalePrice('0');
        }
    }, [productToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) throw new Error('No organization found');

            let error;

            if (productToEdit) {
                // UPDATE Logic
                const { error: updateError } = await supabase
                    .from('products')
                    .update({
                        name,
                        type,
                        unit,
                        min_stock: parseInt(minStock),
                        cost_price: parseFloat(costPrice),
                        sale_price: parseFloat(salePrice)
                    })
                    .eq('id', productToEdit.id);
                error = updateError;
            } else {
                // CREATE Logic
                const { error: insertError } = await supabase.from('products').insert({
                    organization_id: profile.organization_id,
                    name,
                    type,
                    unit,
                    min_stock: parseInt(minStock),
                    current_stock: 0,
                    conversion_factor: 1,
                    cost_price: parseFloat(costPrice),
                    sale_price: parseFloat(salePrice)
                });
                error = insertError;
            }

            if (error) throw error;

            onSuccess();
            onClose();
            // Fields are reset by useEffect when productToEdit becomes null or modal closes/reopens

        } catch (error: any) {
            console.error('Error saving product:', error);
            alert('Error al guardar: ' + (error.message || error.toString()));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-zinc-800">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Nombre del Artículo</label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:ring-2 focus:ring-cobalt-500 outline-none text-gray-900 dark:text-white"
                            placeholder="Ej. Tornillo Hexagonal 1/4"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Tipo</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:ring-2 focus:ring-cobalt-500 outline-none text-gray-900 dark:text-white"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="Material">Material</option>
                                <option value="Ferretería">Ferretería</option>
                                <option value="Insumo">Insumo</option>
                                <option value="Herramienta">Herramienta</option>
                                <option value="Producto Final">Producto Final</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Unidad de Medida</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:ring-2 focus:ring-cobalt-500 outline-none text-gray-900 dark:text-white"
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                            >
                                <option value="u">Unidad (u)</option>
                                <option value="kg">Kilogramos (kg)</option>
                                <option value="mts">Metros (mts)</option>
                                <option value="lts">Litros (lts)</option>
                                <option value="caja">Caja</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Precio Costo</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:ring-2 focus:ring-cobalt-500 outline-none text-gray-900 dark:text-white"
                                value={costPrice}
                                onChange={e => setCostPrice(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Precio Venta</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:ring-2 focus:ring-cobalt-500 outline-none text-gray-900 dark:text-white"
                                value={salePrice}
                                onChange={e => setSalePrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Stock Mínimo (Alerta)</label>
                        <input
                            type="number"
                            min="0"
                            className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:ring-2 focus:ring-cobalt-500 outline-none text-gray-900 dark:text-white"
                            value={minStock}
                            onChange={e => setMinStock(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
