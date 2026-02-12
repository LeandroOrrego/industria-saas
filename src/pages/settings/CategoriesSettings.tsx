import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Tag, ArrowLeft, Loader2, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense';
    is_system: boolean;
}

export default function CategoriesSettings() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Category State
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        setLoading(true);
        const { data } = await supabase
            .from('transaction_categories')
            .select('*')
            .order('type', { ascending: false }) // Income first usually
            .order('name');

        if (data) setCategories(data);
        setLoading(false);
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de borrar esta categoría?')) return;

        const { error } = await supabase
            .from('transaction_categories')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error al borrar: ' + error.message);
        } else {
            fetchCategories();
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user?.id).single();

            if (!profile) throw new Error('No user profile');

            const { error } = await supabase.from('transaction_categories').insert({
                organization_id: profile.organization_id,
                name: newCatName,
                type: newCatType,
                is_system: false
            });

            if (error) throw error;

            setNewCatName('');
            setIsModalOpen(false);
            fetchCategories();

        } catch (error: any) {
            alert('Error creando categoría: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/settings" className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Categorías de Transacciones</h1>
                        <p className="text-gray-500 dark:text-zinc-500">Administra los conceptos de Ingresos y Egresos</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="ml-auto bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-cobalt-900/20"
                    >
                        <Plus size={18} /> Nueva Categoría
                    </button>
                </div>

                {/* Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Income */}
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between">
                            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                <Tag size={18} /> Ingresos
                            </h3>
                            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                {categories.filter(c => c.type === 'income').length}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {categories.filter(c => c.type === 'income').map(cat => (
                                <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <span className="font-medium">{cat.name}</span>
                                    {cat.is_system ? (
                                        <span className="textxs text-gray-400 italic text-[10px]">Sistema</span>
                                    ) : (
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Expense */}
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 flex items-center justify-between">
                            <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                <Tag size={18} /> Egresos
                            </h3>
                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">
                                {categories.filter(c => c.type === 'expense').length}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {categories.filter(c => c.type === 'expense').map(cat => (
                                <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <span className="font-medium">{cat.name}</span>
                                    <div className="flex items-center gap-2">
                                        {cat.is_system ? (
                                            <span className="textxs text-gray-400 italic text-[10px]">Sistema</span>
                                        ) : (
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-950">
                            <h3 className="font-bold text-lg">Nueva Categoría</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nombre</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-cobalt-500"
                                    placeholder="Ej. Viáticos, Alquiler..."
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tipo</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewCatType('income')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg border ${newCatType === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-500'}`}
                                    >
                                        Ingreso
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewCatType('expense')}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg border ${newCatType === 'expense' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-500'}`}
                                    >
                                        Egreso
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-cobalt-600 hover:bg-cobalt-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Guardar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
