import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus,
    Edit,
    Trash2,
    Check,
    X,
    LayoutDashboard,
    Receipt,
    Loader2
} from 'lucide-react';

type Plan = {
    id: string;
    name: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    limits: any;
    features: string[]; // JSONB stored as array
    is_active: boolean;
};

export default function Plans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priceMonthly, setPriceMonthly] = useState(0);
    const [priceYearly, setPriceYearly] = useState(0);
    const [currency, setCurrency] = useState('PYG');
    const [featuresText, setFeaturesText] = useState(''); // Comma separated for simplicity

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        setLoading(true);
        const { data, error } = await supabase.from('plans').select('*').order('price_monthly', { ascending: true });
        if (error) {
            console.error(error);
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    }

    function openModal(plan?: Plan) {
        if (plan) {
            setEditingId(plan.id);
            setName(plan.name);
            setDescription(plan.description || '');
            setPriceMonthly(plan.price_monthly || 0);
            setPriceYearly(plan.price_yearly || 0);
            setCurrency(plan.currency || 'PYG');
            setFeaturesText(Array.isArray(plan.features) ? plan.features.join('\n') : '');
        } else {
            setEditingId(null);
            resetForm();
        }
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();

        const featuresArray = featuresText.split('\n').map(f => f.trim()).filter(f => f !== '');

        const payload = {
            name,
            description,
            price_monthly: priceMonthly,
            price_yearly: priceYearly,
            currency,
            features: featuresArray,
            is_active: true
        };

        try {
            let error;
            if (editingId) {
                const { error: updateError } = await supabase.from('plans').update(payload).eq('id', editingId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('plans').insert({ ...payload, limits: {} });
                error = insertError;
            }

            if (error) throw error;
            setShowModal(false);
            resetForm();
            fetchPlans();
        } catch (error) {
            alert('Error al guardar plan: ' + (error as Error).message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Estás seguro de desactivar este plan?')) return;
        try {
            const { error } = await supabase.from('plans').update({ is_active: false }).eq('id', id);
            if (error) throw error;
            fetchPlans();
        } catch (error) {
            alert('Error: ' + (error as Error).message);
        }
    }

    function resetForm() {
        setName('');
        setDescription('');
        setPriceMonthly(0);
        setPriceYearly(0);
        setFeaturesText('');
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-sm">SaaS Admin</span>
                    <span className="text-zinc-600 text-sm">/</span>
                    <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-widest">Planes de Suscripción</h2>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8 h-full flex flex-col">

                    {/* Title & Action */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2">GESTIÓN DE PLANES</h1>
                            <p className="text-zinc-400 text-sm max-w-lg">Configura los niveles de servicio y precios para tus clientes.</p>
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 px-6 py-3 bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-cobalt-900/20 hover:scale-105 active:scale-95"
                        >
                            <Plus size={20} />
                            Nuevo Plan
                        </button>
                    </div>

                    {/* Plans Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-zinc-500 gap-2">
                            <Loader2 className="animate-spin" /> Cargando planes...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map(plan => (
                                <div key={plan.id} className={`bg-zinc-900 border ${plan.is_active ? 'border-zinc-800' : 'border-red-900/30 bg-red-900/5'} rounded-xl p-6 flex flex-col gap-4 relative group hover:border-zinc-700 transition-colors`}>
                                    {!plan.is_active && <span className="absolute top-4 right-4 text-xs font-bold text-red-500 uppercase tracking-widest">Inactivo</span>}

                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                                        <p className="text-sm text-zinc-400 h-10 line-clamp-2">{plan.description}</p>
                                    </div>

                                    <div className="space-y-1 my-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-500 font-medium">Mensual</span>
                                            <span className="font-bold text-white">
                                                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: plan.currency }).format(plan.price_monthly || 0)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-500 font-medium">Anual</span>
                                            <span className="font-bold text-cobalt-400">
                                                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: plan.currency }).format(plan.price_yearly || 0)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Features List Preview */}
                                    <div className="flex-1 space-y-2 overflow-hidden min-h-[100px]">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Incluye:</p>
                                        <div className="space-y-1">
                                            {Array.isArray(plan.features) && plan.features.slice(0, 5).map((feat, idx) => (
                                                <div key={idx} className="flex gap-2 text-xs text-zinc-400 items-start">
                                                    <Check size={14} className="text-cobalt-500 shrink-0 mt-0.5" />
                                                    <span className="leading-tight">{feat}</span>
                                                </div>
                                            ))}
                                            {Array.isArray(plan.features) && plan.features.length > 5 && (
                                                <div className="text-[10px] text-zinc-600 pl-6 italic">
                                                    + {plan.features.length - 5} más...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                                        <button
                                            onClick={() => openModal(plan)}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                            title="Editar Plan"
                                        >
                                            <Edit size={18} />
                                        </button>

                                        {plan.is_active && (
                                            <button
                                                onClick={() => handleDelete(plan.id)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors"
                                                title="Desactivar Plan"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-white">{editingId ? 'Editar Plan' : 'Nuevo Plan'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-6">
                            <form id="planForm" onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nombre del Plan</label>
                                    <input
                                        value={name} onChange={e => setName(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-cobalt-500 focus:outline-none transition-colors"
                                        placeholder="Ej: Plan Pro"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Descripción</label>
                                    <input
                                        value={description} onChange={e => setDescription(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-cobalt-500 focus:outline-none transition-colors"
                                        placeholder="Breve descripción"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Precio Mensual</label>
                                        <input
                                            type="number"
                                            value={priceMonthly} onChange={e => setPriceMonthly(Number(e.target.value))}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-cobalt-500 focus:outline-none transition-colors"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Precio Anual</label>
                                        <input
                                            type="number"
                                            value={priceYearly} onChange={e => setPriceYearly(Number(e.target.value))}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-cobalt-500 focus:outline-none transition-colors"
                                            min="0"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Características (una por línea)</label>
                                    <textarea
                                        value={featuresText} onChange={e => setFeaturesText(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-cobalt-500 focus:outline-none transition-colors h-32 text-sm leading-relaxed"
                                        placeholder="Facturación ilimitada&#10;Soporte 24/7&#10;..."
                                    />
                                    <p className="text-[10px] text-zinc-500 mt-1">Cada línea aparecerá como un ítem con check en la lista.</p>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 shrink-0 bg-zinc-900">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-zinc-400 hover:text-white font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                form="planForm"
                                type="submit"
                                className="px-6 py-2 bg-cobalt-600 hover:bg-cobalt-500 text-white rounded font-bold transition-colors shadow-lg shadow-cobalt-900/20"
                            >
                                Guardar Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
