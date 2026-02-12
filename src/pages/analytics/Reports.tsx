import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart, TrendingUp, DollarSign, Users } from 'lucide-react';

export default function Reports() {
    const [, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        profitability: 0,
        completedOrders: 0,
        activeClients: 0
    });

    useEffect(() => {
        calculateStats();
    }, []);

    async function calculateStats() {
        setLoading(true);
        try {
            // Unoptimized demo stats
            const { data: invoices } = await supabase.from('invoices').select('total_amount').eq('status', 'issued');
            const { data: pos } = await supabase.from('purchase_orders').select('total_amount').eq('status', 'received');
            const { count: completedOS } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).eq('status', 'finalizada');
            const { count: clientCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });

            const income = invoices?.reduce((sum, i) => sum + i.total_amount, 0) || 0;
            const expenses = pos?.reduce((sum, p) => sum + p.total_amount, 0) || 0;

            setStats({
                totalIncome: income,
                totalExpenses: expenses,
                profitability: income - expenses,
                completedOrders: completedOS || 0,
                activeClients: clientCount || 0
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Reportes de Inteligencia de Negocio</h1>

            {/* Profitability Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-500">
                            <DollarSign size={20} />
                        </div>
                        <p className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase">Rentabilidad Neta</p>
                    </div>
                    <p className={`text-3xl font-bold font-mono ${stats.profitability >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500 dark:text-red-400'}`}>
                        ${stats.profitability.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">Ingresos - Costos Directos</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-cobalt-500/10 rounded-lg text-cobalt-600 dark:text-cobalt-500">
                            <Users size={20} />
                        </div>
                        <p className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase">Cartera de Clientes</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeClients}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">Clientes Activos</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-500">
                            <CheckCircleIcon />
                        </div>
                        <p className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase">Trabajos Entregados</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completedOrders}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">Órdenes Finalizadas</p>
                </div>
            </div>

            {/* Placeholder for Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 h-80 flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 shadow-sm">
                    <BarChart size={48} className="mb-4 opacity-50" />
                    <p>Gráfico de Productividad Mensual (Próximamente)</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 h-80 flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 shadow-sm">
                    <TrendingUp size={48} className="mb-4 opacity-50" />
                    <p>Proyección de Flujo de Caja (Próximamente)</p>
                </div>
            </div>
        </div>
    );
}

function CheckCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
    )
}
