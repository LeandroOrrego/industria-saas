import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { AlertCircle, TrendingUp, CheckCircle, Clock } from 'lucide-react';

type Product = Database['public']['Tables']['products']['Row'];

interface DashboardStats {
    lowStockCount: number;
    pendingBillingCount: number;
    activeOrdersCount: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        lowStockCount: 0,
        pendingBillingCount: 0,
        activeOrdersCount: 0,
    });
    const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                // 1. Low Stock
                const { data: products, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .order('name');

                if (productsError) throw productsError;

                const lowStock = products?.filter(p => p.current_stock <= p.min_stock) || [];

                // 2. Pending Billing (Finalizada status)
                const { count: pendingBilling, error: osError } = await supabase
                    .from('service_orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'finalizada');

                if (osError) throw osError;

                // 3. Active Orders (Abierta or En Proceso)
                const { count: activeOrders, error: activeError } = await supabase
                    .from('service_orders')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['abierta', 'en_proceso']);

                if (activeError) throw activeError;

                setStats({
                    lowStockCount: lowStock.length,
                    pendingBillingCount: pendingBilling || 0,
                    activeOrdersCount: activeOrders || 0,
                });
                setLowStockItems(lowStock.slice(0, 5)); // Show top 5

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (loading) {
        return <div className="p-6 text-zinc-400">Cargando datos del tablero...</div>;
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-zinc-950 min-h-full">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Panel de Control</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* LOW STOCK CARD */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-orange-500/50 dark:hover:border-orange-900/50 transition-colors">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-1">Stock Bajo</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.lowStockCount}</p>
                        </div>
                        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-500" />
                        </div>
                    </div>
                </div>

                {/* ACTIVE ORDERS CARD */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-cobalt-500/50 dark:hover:border-cobalt-900/50 transition-colors">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-1">OS Activas</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeOrdersCount}</p>
                        </div>
                        <div className="p-3 bg-cobalt-500/10 rounded-lg border border-cobalt-500/20">
                            <Clock className="w-6 h-6 text-cobalt-600 dark:text-cobalt-400" />
                        </div>
                    </div>
                </div>

                {/* BILLING CARD */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 dark:hover:border-emerald-900/50 transition-colors">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-1">A Facturar</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingBillingCount}</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Alertas de Stock</h3>
                    {lowStockItems.length > 0 && <span className="text-xs text-orange-600 dark:text-orange-400 font-medium px-2 py-1 bg-orange-100 dark:bg-orange-400/10 rounded border border-orange-200 dark:border-orange-400/20">Acción Requerida</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 dark:text-zinc-500 uppercase bg-gray-50 dark:bg-zinc-950/50 border-b border-gray-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-3 font-medium tracking-wider">Producto</th>
                                <th className="px-6 py-3 font-medium tracking-wider">Tipo</th>
                                <th className="px-6 py-3 font-medium tracking-wider">Stock Actual</th>
                                <th className="px-6 py-3 font-medium tracking-wider">Mínimo</th>
                                <th className="px-6 py-3 font-medium tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                            {lowStockItems && lowStockItems.length > 0 ? (
                                lowStockItems.map((product) => (
                                    <tr key={product.id || `prod-${Math.random()}`} className="bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{product.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${product.type === 'ferreteria' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700' : 'bg-cobalt-100 dark:bg-cobalt-900/30 text-cobalt-700 dark:text-cobalt-300 border-cobalt-200 dark:border-cobalt-800'}`}>
                                                {product.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-orange-600 dark:text-orange-400">{product.current_stock} <span className="text-xs font-normal text-gray-500 dark:text-zinc-500">{product.unit}</span></td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-zinc-500">{product.min_stock} {product.unit}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1.5">
                                                <div className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                Reponer
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-zinc-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="p-4 bg-emerald-100 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/20 mb-3">
                                                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                                            </div>
                                            <p className="text-gray-400 dark:text-zinc-400 font-medium">Todo óptimo</p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-600 mt-1">No hay alertas de stock por el momento.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
