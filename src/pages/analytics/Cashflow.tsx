import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import RegisterMovementModal from '../../components/RegisterMovementModal';

// Helper types
type Transaction = {
    id: string;
    description: string;
    type: 'income' | 'expense';
    amount: number;
    transaction_date: string;
    payment_method?: 'cash' | 'transfer' | 'check' | 'card' | 'other';
    created_by?: string;
}

export default function Cashflow() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({
        income: 0,
        expenses: 0,
        balance: 0,
        byMethod: {
            cash: 0,
            transfer: 0,
            check: 0,
            card: 0,
            other: 0
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, []);

    async function fetchTransactions() {
        setLoading(true);
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .order('transaction_date', { ascending: false })
            .limit(100); // Increased limit for better stats accuracy

        if (data) {
            setTransactions(data as any);

            // Calculate High Level Stats
            const income = data.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
            const expenses = data.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0);

            // Calculate Method Stats
            const byMethod = {
                cash: 0,
                transfer: 0,
                check: 0,
                card: 0,
                other: 0
            };

            data.forEach((t: any) => {
                let method = t.payment_method?.toLowerCase() || 'cash';

                // Normalize Spanish to English keys
                if (method === 'efectivo') method = 'cash';
                if (method === 'transferencia') method = 'transfer';
                if (method === 'cheque') method = 'check';
                if (method === 'tarjeta') method = 'card';
                if (method === 'otro') method = 'other';

                const amount = Number(t.amount);
                if (method in byMethod) {
                    if (t.type === 'income') {
                        byMethod[method as keyof typeof byMethod] += amount;
                    } else {
                        byMethod[method as keyof typeof byMethod] -= amount;
                    }
                }
            });

            setStats({ income, expenses, balance: income - expenses, byMethod });
        }
        setLoading(false);
    }

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

    const handleMovementSuccess = () => {
        fetchTransactions();
        setEditingTransaction(undefined);
    };

    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este movimiento?')) return;

        const { error } = await supabase.from('transactions').delete().eq('id', id);

        if (error) {
            console.error('Error deleting transaction:', error);
            alert('Error al eliminar movimiento');
        } else {
            fetchTransactions();
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Caja</h1>
                {/* Action Buttons */}
                <button
                    onClick={() => { setEditingTransaction(undefined); setIsModalOpen(true); }}
                    className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-cobalt-900/20"
                >
                    <DollarSign size={18} /> Registrar Movimiento
                </button>
            </div>

            <RegisterMovementModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingTransaction(undefined); }}
                onSuccess={handleMovementSuccess}
                transactionToEdit={editingTransaction}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                            <TrendingUp size={20} />
                        </div>
                        <p className="text-gray-500 dark:text-zinc-400 text-sm font-bold uppercase">Ingresos (Mes)</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">Gs. {stats.income.toLocaleString()}</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                            <TrendingDown size={20} />
                        </div>
                        <p className="text-gray-500 dark:text-zinc-400 text-sm font-bold uppercase">Egresos (Mes)</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">Gs. {stats.expenses.toLocaleString()}</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-cobalt-500/10 rounded-lg text-cobalt-400">
                                <DollarSign size={20} />
                            </div>
                            <p className="text-gray-500 dark:text-zinc-400 text-sm font-bold uppercase">Balance Neto</p>
                        </div>
                        <p className={`text-3xl font-bold font-mono ${stats.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500 dark:text-red-400'}`}>
                            Gs. {stats.balance.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Balances */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Saldos por Cuenta</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {Object.entries(stats.byMethod).map(([method, amount]) => (
                    <div key={method} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col">
                        <span className="text-gray-500 dark:text-zinc-500 text-xs font-bold uppercase mb-1">
                            {method === 'cash' && 'Efectivo'}
                            {method === 'transfer' && 'Banco / Transf.'}
                            {method === 'check' && 'Cheques'}
                            {method === 'card' && 'Tarjetas'}
                            {method === 'other' && 'Otros'}
                        </span>
                        <span className={`text-xl font-bold font-mono ${amount >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500 dark:text-red-400'}`}>
                            Gs. {amount.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            {/* Recent Transactions List */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
                    <h3 className="font-bold text-gray-900 dark:text-white">Movimientos Recientes</h3>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Descripción</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4 text-right">Monto</th>
                            <th className="px-6 py-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                        {transactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 group transition-colors">
                                <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 font-mono">{new Date(t.transaction_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                                    {t.description}
                                    <div className="text-xs text-gray-400 dark:text-zinc-500 uppercase mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                        {t.payment_method === 'cash' && 'Efectivo'}
                                        {t.payment_method === 'transfer' && 'Transferencia'}
                                        {t.payment_method === 'check' && 'Cheque'}
                                        {t.payment_method === 'card' && 'Tarjeta'}
                                        {t.payment_method === 'other' && 'Otro'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${t.type === 'income' ? 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/10'}`}>
                                        {t.type === 'income' ? 'Ingreso' : 'Egreso'}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-bold font-mono ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString()} Gs.
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(t)}
                                            className="p-1.5 text-gray-500 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-400/10 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="p-1.5 text-gray-500 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
