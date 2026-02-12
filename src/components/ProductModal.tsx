import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: Product | null;
}

export default function ProductModal({ isOpen, onClose, onSuccess, productToEdit }: ProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: productToEdit?.name || '',
        type: productToEdit?.type || 'ferreteria',
        unit: productToEdit?.unit || 'un',
        conversion_factor: productToEdit?.conversion_factor || 1,
        min_stock: productToEdit?.min_stock || 0,
        current_stock: productToEdit?.current_stock || 0,
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (productToEdit) {
                const { error } = await supabase
                    .from('products')
                    .update(formData)
                    .eq('id', productToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([formData]);
                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error al guardar producto.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="ferreteria">Ferretería</option>
                                <option value="material">Material/Chapa</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                            >
                                <option value="un">Unidad</option>
                                <option value="m">Metro (m)</option>
                                <option value="m2">Metro Cuadrado (m²)</option>
                                <option value="kg">Kilo (kg)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Stock Actual</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formData.current_stock}
                                onChange={e => setFormData({ ...formData, current_stock: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Stock Mínimo</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formData.min_stock}
                                onChange={e => setFormData({ ...formData, min_stock: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Factor Conv.</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={formData.conversion_factor}
                                onChange={e => setFormData({ ...formData, conversion_factor: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 italic">
                        * Factor de Conversión: Usado si compras por unidad pero consumes por fracción (ej. 1 Chapa = 2.4 m²).
                    </p>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center"
                        >
                            <Save size={16} className="mr-2" />
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
