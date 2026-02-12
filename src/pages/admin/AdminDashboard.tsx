import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    BarChart,
    Users,
    Factory,
    CreditCard,
    TrendingUp,
    Activity
} from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalOrgs: 0,
        totalUsers: 0,
        activePlans: 0,
        mrr: 0
    });
    const [recentOrgs, setRecentOrgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        setLoading(true);
        try {
            // 1. Fetch Metrics
            const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            // For plans/revenue, using subscriptions table (if it has data)
            const { data: subs } = await supabase.from('subscriptions').select('*, plans(price)').eq('status', 'active');

            const activePlansCount = subs ? subs.length : 0;
            const revenue = subs?.reduce((acc, sub: any) => acc + (sub.plans?.price || 0), 0) || 0;

            setStats({
                totalOrgs: orgCount || 0,
                totalUsers: userCount || 0,
                activePlans: activePlansCount,
                mrr: revenue
            });

            // 2. Fetch Recent Activity (Newest Orgs)
            const { data: orgs } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentOrgs(orgs || []);

        } catch (error) {
            console.error('Error loading admin dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-sm">SaaS Admin</span>
                    <span className="material-symbols-outlined text-zinc-600 text-sm">chevron_right</span>
                    <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-widest">Vision General</h2>
                </div>
                <button onClick={fetchDashboardData} className="text-zinc-500 hover:text-white transition-colors p-2 rounded-full hover:bg-zinc-800">
                    <span className="material-symbols-outlined">refresh</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Title */}
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2">CONTROL TOWER</h1>
                        <p className="text-zinc-400 text-sm">Monitoreo en tiempo real de tu plataforma SaaS.</p>
                    </div>

                    {/* KPI Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                            title="Empresas"
                            value={stats.totalOrgs}
                            icon={Factory}
                            trend="+2 esta semana"
                            color="text-blue-500"
                        />
                        <KpiCard
                            title="Usuarios Totales"
                            value={stats.totalUsers}
                            icon={Users}
                            trend="Activos en plataforma"
                            color="text-emerald-500"
                        />
                        <KpiCard
                            title="Suscripciones"
                            value={stats.activePlans}
                            icon={CreditCard}
                            trend="Planes Pagos"
                            color="text-purple-500"
                        />
                        <KpiCard
                            title="MRR Estimado"
                            value={new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(stats.mrr)}
                            icon={TrendingUp}
                            trend="Ingresos Mensuales"
                            color="text-amber-500"
                        />
                    </div>

                    {/* Recent Activity Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recent Orgs Table */}
                        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Activity className="text-zinc-500" size={18} />
                                    Últimas Empresas Registradas
                                </h3>
                                <button className="text-xs text-cobalt-400 font-bold hover:text-cobalt-300">VER TODAS</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-zinc-400">
                                    <thead className="bg-zinc-950/50 text-zinc-500 font-medium uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">Empresa</th>
                                            <th className="px-6 py-3">RUC/Tax ID</th>
                                            <th className="px-6 py-3">Industria</th>
                                            <th className="px-6 py-3 text-right">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {recentOrgs.map((org) => (
                                            <tr key={org.id} className="hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">{org.name}</td>
                                                <td className="px-6 py-4 font-mono text-xs">{org.tax_id || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
                                                        {org.industry || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right tabular-nums">
                                                    {new Date(org.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {recentOrgs.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-zinc-600 italic">
                                                    No hay actividad reciente.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Alerts / Updates (Placeholder) */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h3 className="font-bold text-white mb-4">Estado del Sistema</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="size-2 mt-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <div>
                                        <p className="text-white text-sm font-medium">Todos los sistemas operativos</p>
                                        <p className="text-zinc-500 text-xs">Uptime 99.9%</p>
                                    </div>
                                </div>
                                <div className="h-px bg-zinc-800"></div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-400">Database Load</span>
                                        <span className="text-emerald-400 font-mono">12%</span>
                                    </div>
                                    <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-[12%]"></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-400">Storage Usage</span>
                                        <span className="text-cobalt-400 font-mono">45%</span>
                                    </div>
                                    <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-cobalt-500 h-full w-[45%]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon: Icon, trend, color }: any) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-zinc-700 transition-colors group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg bg-zinc-950 border border-zinc-800 ${color} group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                </div>
                {/* Could add sparkline here */}
            </div>
            <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
                <p className="text-zinc-500 text-xs mt-2 font-medium">{trend}</p>
            </div>
        </div>
    );
}
