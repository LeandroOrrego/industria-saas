import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Ban, CheckCircle, Building2 } from 'lucide-react';

type BankAccount = {
    id: string;
    bank_name: string;
    account_holder: string;
    account_number: string;
    ruc_document: string | null;
    is_active: boolean;
};

export default function BankAccountsManager() {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        bank_name: '',
        account_holder: '',
        account_number: '',
        ruc_document: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('saas_bank_accounts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            alert('Error al cargar cuentas: ' + error.message);
        } else {
            setAccounts(data || []);
        }
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('saas_bank_accounts')
                .insert([{ ...formData, is_active: true }]);

            if (error) throw error;

            setShowModal(false);
            setFormData({ bank_name: '', account_holder: '', account_number: '', ruc_document: '' });
            fetchAccounts();
            alert('Cuenta agregada exitosamente.');
        } catch (error: any) {
            alert('Error al crear cuenta: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('saas_bank_accounts')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) {
            alert('Error al actualizar: ' + error.message);
        } else {
            fetchAccounts();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta cuenta?')) return;

        const { error } = await supabase
            .from('saas_bank_accounts')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            fetchAccounts();
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando cuentas...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cuentas Bancarias</h1>
                    <p className="text-gray-500 dark:text-zinc-400">Gestiona las cuentas donde recibirás los pagos de las suscripciones.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-lg font-semibold shadow-lg shadow-cobalt-900/20 transition-all"
                >
                    <Plus size={18} /> Nueva Cuenta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(account => (
                    <div key={account.id} className={`bg-white dark:bg-zinc-900 rounded-xl border ${account.is_active ? 'border-gray-200 dark:border-zinc-800' : 'border-red-200 dark:border-red-900/30'} p-6 shadow-sm relative group`}>
                        {!account.is_active && (
                            <div className="absolute top-4 right-4 text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                                INACTIVA
                            </div>
                        )}

                        <div className="flex items-start gap-4 mb-4">
                            <div className="size-12 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 dark:text-zinc-500">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{account.bank_name}</h3>
                                <p className="text-sm text-gray-500 dark:text-zinc-400">{account.account_holder}</p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-zinc-800/50">
                                <span className="text-gray-500">Cuenta Nº</span>
                                <span className="font-mono font-medium text-gray-900 dark:text-white">{account.account_number}</span>
                            </div>
                            <div className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-zinc-800/50">
                                <span className="text-gray-500">RUC / Doc</span>
                                <span className="font-medium text-gray-900 dark:text-white">{account.ruc_document || '-'}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => toggleStatus(account.id, account.is_active)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${account.is_active ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40' : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40'}`}
                            >
                                {account.is_active ? <><Ban size={16} /> Desactivar</> : <><CheckCircle size={16} /> Activar</>}
                            </button>
                            <button
                                onClick={() => handleDelete(account.id)}
                                className="size-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* CREATE MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md shadow-2xl p-6 animate-scale-in">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Agregar Cuenta Bancaria</h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Nombre del Banco</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500"
                                    placeholder="Ej. Banco Itaú"
                                    value={formData.bank_name}
                                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Titular de la Cuenta</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500"
                                    placeholder="Nombre completo o Razón Social"
                                    value={formData.account_holder}
                                    onChange={e => setFormData({ ...formData, account_holder: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Número de Cuenta</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500"
                                        placeholder="000000000"
                                        value={formData.account_number}
                                        onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">RUC / Documento</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 focus:border-cobalt-500"
                                        placeholder="Opcional"
                                        value={formData.ruc_document}
                                        onChange={e => setFormData({ ...formData, ruc_document: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-lg font-bold shadow-lg shadow-cobalt-900/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Guardando...' : 'Guardar Cuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
