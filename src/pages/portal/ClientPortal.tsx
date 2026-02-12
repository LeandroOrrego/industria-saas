import { useState } from 'react';
import {
    Rocket,
    FileText,
    LayoutTemplate,
    LogOut, ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Helper types
type ServiceOrder = {
    id: string;
    product_description: string;
    status: string;
    priority: string;
    deadline: string | null;
    created_at: string;
}

export default function ClientPortal() {
    const [taxId, setTaxId] = useState('');
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<ServiceOrder[]>([]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Find client by Tax ID (RUC)
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('tax_id', taxId)
                .single();

            if (error || !data) {
                alert('Cliente no encontrado. Verifique su RUC/Tax ID.');
            } else {
                setClient(data);
                fetchClientData(data.id);
            }
        } catch (err) {
            console.error(err);
            alert('Error al ingresar');
        } finally {
            setLoading(false);
        }
    };

    const fetchClientData = async (clientId: string) => {
        const { data } = await supabase
            .from('service_orders')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        setOrders(data as any || []);
    };

    const handleLogout = () => {
        setClient(null);
        setOrders([]);
        setTaxId('');
    };

    // --- LOGIN SCREEN ---
    if (!client) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-gray-900 dark:text-zinc-100">
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-2xl dark:shadow-none">
                    <div className="flex justify-center mb-8">
                        <div className="size-16 bg-cobalt-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cobalt-900/20">
                            <LayoutTemplate size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-2">Portal de Clientes</h1>
                    <p className="text-gray-500 dark:text-zinc-500 text-center mb-8 text-sm">Ingrese su RUC o Tax ID para ver el estado de sus trabajos.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1">RUC / Tax ID</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                                placeholder="Ej: 80012345-1"
                                value={taxId}
                                onChange={e => setTaxId(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cobalt-600 hover:bg-cobalt-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cobalt-900/20"
                        >
                            {loading ? 'Verificando...' : <>Ingresar <ArrowRight size={18} /></>}
                        </button>
                    </form>
                    <p className="text-center text-xs text-gray-400 dark:text-zinc-600 mt-6">
                        IndustriaSaaS &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        );
    }

    // --- DASHBOARD SCREEN ---
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-20 lg:w-72 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col transition-all duration-300">
                <div className="p-6 flex items-center gap-3">
                    <div className="size-10 bg-cobalt-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cobalt-900/20 shrink-0">
                        <LayoutTemplate size={24} />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight hidden lg:block text-gray-900 dark:text-white">
                        Industra<span className="text-cobalt-600 dark:text-cobalt-500">SaaS</span>
                    </span>
                </div>

                <nav className="flex-1 w-full px-4 space-y-2 mt-4">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-cobalt-600 dark:text-cobalt-400 bg-cobalt-500/10 border border-cobalt-500/20 rounded-xl font-bold transition-all">
                        <Rocket size={20} />
                        <span className="text-sm hidden lg:block">Mis Órdenes (OS)</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white rounded-xl font-medium transition-colors">
                        <FileText size={20} />
                        <span className="text-sm hidden lg:block">Facturas</span>
                    </button>
                </nav>

                <div className="p-4 w-full border-t border-gray-200 dark:border-zinc-800 mt-auto">
                    <div className="flex items-center gap-3 px-2 py-4">
                        <div className="size-10 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-gray-700 dark:text-white border border-gray-300 dark:border-zinc-700 shrink-0">
                            <span className="font-bold">{client.name[0]}</span>
                        </div>
                        <div className="hidden lg:block overflow-hidden">
                            <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{client.name}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-500 truncate uppercase tracking-widest">{client.tax_id}</p>
                        </div>
                        <button onClick={handleLogout} className="ml-auto text-gray-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-white transition-colors">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-zinc-950">
                <header className="h-20 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-8 flex items-center justify-between z-10 shrink-0">
                    <div>
                        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Portal del Cliente</h1>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">Bienvenido, sigue el progreso de tus trabajos.</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-7xl mx-auto space-y-8">

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {orders.map(os => (
                                <div key={os.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-cobalt-500/20 rounded-2xl p-6 shadow-sm hover:border-cobalt-500/50 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs text-gray-400 dark:text-zinc-400 font-bold tracking-tight">#{os.id.slice(0, 8)}</span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${os.status === 'finalizada' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-cobalt-100 dark:bg-cobalt-500/10 text-cobalt-600 dark:text-cobalt-400 border-cobalt-200 dark:border-cobalt-500/20'}`}>
                                                    {os.status}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-cobalt-600 dark:group-hover:text-cobalt-400 transition-colors line-clamp-2">{os.product_description}</h3>
                                        </div>
                                    </div>

                                    <div className="flex justify-between text-[11px] font-bold uppercase mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                        <div className="text-gray-500 dark:text-zinc-500">
                                            Fecha Inicio: <span className="text-gray-800 dark:text-zinc-300">{new Date(os.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {os.deadline && (
                                            <div className="text-gray-500 dark:text-zinc-500">
                                                Entrega: <span className="text-gray-900 dark:text-white">{new Date(os.deadline).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {orders.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-500 dark:text-zinc-500 border-2 border-dashed border-gray-300 dark:border-zinc-800 rounded-2xl">
                                    No se encontraron órdenes activas para este cliente.
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
