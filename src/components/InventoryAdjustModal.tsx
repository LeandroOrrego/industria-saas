import React, { useState } from 'react';
import { X, Save, ArrowLeftRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];

interface InventoryAdjustModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product: Product | null;
}

export default function InventoryAdjustModal({ isOpen, onClose, onSuccess, product }: InventoryAdjustModalProps) {
    const [quantity, setQuantity] = useState('');
    const [type, setType] = useState('in'); // in, out
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();
            if (!profile?.organization_id) throw new Error('No organization');

            const qty = parseFloat(quantity);
            if (isNaN(qty) || qty <= 0) {
                alert('Cantidad inválida');
                setLoading(false);
                return;
            }

            // 1. Releer stock actual justo antes de ajustar (evita condición de carrera)
            const { data: freshProduct, error: fetchError } = await supabase
                .from('products')
                .select('current_stock')
                .eq('id', product.id)
                .single();
            if (fetchError) throw fetchError;

            const currentStock = freshProduct.current_stock || 0;

            // 2. Validar que la salida no deje stock negativo
            if (type === 'out' && qty > currentStock) {
                const confirmNegative = confirm(
                    `Stock actual: ${currentStock}. Esta salida dejará el stock en negativo (${(currentStock - qty).toFixed(2)}). ¿Continuar de todas formas?`
                );
                if (!confirmNegative) {
                    setLoading(false);
                    return;
                }
            }

            const newStock = type === 'in' ? currentStock + qty : currentStock - qty;

            // 3. Actualizar stock con el valor fresco
            const { error: prodError } = await supabase
                .from('products')
                .update({ current_stock: newStock })
                .eq('id', product.id);
            if (prodError) throw prodError;

            // 4. Registrar movimiento
            const { error: movError } = await supabase.from('stock_movements').insert([{
                organization_id: profile.organization_id,
                product_id: product.id,
                type: type === 'out' ? 'out' : 'in',
                quantity: qty,
                notes: notes || 'Ajuste manual',
                user_id: user.id
            }]);
            if (movError) throw movError;

            onSuccess();
            onClose();
            setQuantity('');
            setNotes('');
        } catch (error) {
            console.error('Error modifying stock:', error);
            alert('Error al ajustar stock');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-white">Ajuste de Stock</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-zinc-400 mb-1">{product.name}</p>
                        <p className="text-2xl font-mono font-bold text-white">{product.current_stock} <span className="text-sm text-zinc-500">{product.unit}</span></p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setType('in')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm border ${type === 'in' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-700 text-zinc-400'}`}
                        >
                            + Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('out')}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm border ${type === 'out' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-950 border-zinc-700 text-zinc-400'}`}
                        >
                            - Salida
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Cantidad a {type === 'in' ? 'Ingresar' : 'Retirar'}</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Motivo / Notas</label>
                        <textarea
                            rows={2}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none resize-none"
                            placeholder="Ej. Conte inv. incorrecto"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white hover:bg-zinc-200 text-black py-3 rounded-lg font-bold transition-all mt-4"
                    >
                        {loading ? 'Guardando...' : 'Confirmar Ajuste'}
                    </button>
                </form>
            </div>
        </div>
    );
}