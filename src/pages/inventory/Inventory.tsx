import React, { useEffect, useState } from 'react';
import { Search, Plus, Package, AlertTriangle, ArrowLeftRight, TrendingUp, TrendingDown, RefreshCcw, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import InventoryAdjustModal from '../../components/InventoryAdjustModal';
import CreateProductModal from '../../components/CreateProductModal';

type Product = Database['public']['Tables']['products']['Row'];

export default function Inventory() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'low_stock'>('all');

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

    // Create/Edit State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        setLoading(true);
        // Fetch only active products (soft deleted are excluded)
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null)
            .order('name');

        if (error) {
            console.error('Error loading inventory:', error);
            // Alert only on meaningful errors (not just network blips if possible, but for now generic)
            // alert('Error cargando inventario: ' + error.message); 
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    }

    const handleAdjust = (product: Product) => {
        setSelectedProduct(product);
        setIsAdjustModalOpen(true);
    };

    const handleEdit = (product: Product) => {
        setProductToEdit(product);
        setIsCreateModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de borrar este producto?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            fetchInventory();
        } catch (error: any) {
            alert('Error al borrar: ' + error.message);
        }
    };

    const handleNewProduct = () => {
        setProductToEdit(undefined);
        setIsCreateModalOpen(true);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'low_stock' ? (p.current_stock || 0) <= (p.min_stock || 0) : true;
        return matchesSearch && matchesFilter;
    });

    const totalInventoryValue = products.reduce((acc, p) => acc + ((p.current_stock || 0) * (p.cost_price || 0)), 0);

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-zinc-400">Inventario</h1>
                    <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Control de stock y suministros.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchInventory()}
                        className="bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-700 dark:text-white p-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 transition-all shadow-sm"
                        title="Actualizar"
                    >
                        <RefreshCcw size={18} />
                    </button>
                    <button
                        onClick={handleNewProduct}
                        className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-cobalt-900/20 transition-all"
                    >
                        <Plus size={18} /> Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase mb-2">Total Productos</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{products.length}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase mb-2">Valor Costo Total</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {totalInventoryValue.toLocaleString('es-PY', { style: 'currency', currency: 'PYG' })}
                    </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <p className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase mb-2">Alertas Stock Bajo</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-500">
                        {products.filter(p => (p.current_stock || 0) <= (p.min_stock || 0)).length}
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-1 focus:ring-cobalt-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${filter === 'all' ? 'bg-gray-200 text-gray-900 border-transparent dark:bg-zinc-100 dark:text-black dark:border-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800'
                            }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('low_stock')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors flex items-center gap-2 ${filter === 'low_stock' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/50' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800'
                            }`}
                    >
                        <AlertTriangle size={14} /> Stock Bajo
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-bold">Producto</th>
                            <th className="px-6 py-4 font-bold">Tipo</th>
                            <th className="px-6 py-4 font-bold text-right">Precio Venta</th>
                            <th className="px-6 py-4 font-bold text-right">Stock Actual</th>
                            <th className="px-6 py-4 font-bold text-right">Min. Stock</th>
                            <th className="px-6 py-4 font-bold text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500 dark:text-zinc-500">Cargando inventario...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500 dark:text-zinc-500">No hay productos activos.</td></tr>
                        ) : (
                            filteredProducts.map(product => {
                                const isLowStock = (product.current_stock || 0) <= (product.min_stock || 0);
                                return (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gray-100 dark:bg-zinc-800 p-2 rounded text-gray-500 dark:text-zinc-400">
                                                    <Package size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-zinc-100">{product.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase tracking-wider">{product.id.slice(0, 6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 border border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 text-xs capitalize">
                                                {product.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-gray-700 dark:text-zinc-300">
                                                {(product.sale_price || 0).toLocaleString('es-PY', { style: 'currency', currency: 'PYG' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-orange-600 dark:text-orange-400">
                                            {product.current_stock} <span className="text-xs font-normal text-gray-500 dark:text-zinc-500">{product.unit || 'u.'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-gray-500 dark:text-zinc-500 font-mono">
                                                {product.min_stock}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 flex justify-center gap-2">
                                            {/* Edit Button */}
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400"
                                                title="Editar"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            {/* Adjust Stock Button */}
                                            <button
                                                onClick={() => handleAdjust(product)}
                                                className="p-2 hover:bg-cobalt-50 hover:text-cobalt-600 dark:hover:bg-cobalt-500/20 dark:hover:text-cobalt-400 rounded-lg transition-colors text-gray-400 dark:text-zinc-500 font-bold flex items-center gap-1.5"
                                                title="Ajustar Stock"
                                            >
                                                <ArrowLeftRight size={16} />
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                                                title="Borrar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <InventoryAdjustModal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
                onSuccess={fetchInventory}
                product={selectedProduct}
            />

            <CreateProductModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchInventory}
                productToEdit={productToEdit}
            />
        </div>
    );
}
