import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calculator, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LiquidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employee: any;
}

export default function LiquidationModal({ isOpen, onClose, onSuccess, employee }: LiquidationModalProps) {
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Concepts
    const [baseSalary, setBaseSalary] = useState(0);
    const [commissions, setCommissions] = useState(0);
    const [extras, setExtras] = useState(0);
    const [advances, setAdvances] = useState(0); // Anticipos
    const [discounts, setDiscounts] = useState(0); // Otros descuentos

    useEffect(() => {
        if (employee) {
            // Determine base salary
            const dbSalary = Number(employee.base_salary) || 0;
            const estimated = (Number(employee.hourly_rate) || 0) * 190;
            setBaseSalary(dbSalary > 0 ? dbSalary : (estimated > 0 ? estimated : 2550307));

            setCommissions(0);
            setExtras(0);
            setDiscounts(0);

            // Fetch Advances
            fetchAdvances();
        }
    }, [employee, period, isOpen]);

    async function fetchAdvances() {
        if (!employee) return;

        const startOfMonth = `${period}-01`;
        // Calculate end of month roughly or just use next month start
        const nextMonthDate = new Date(period);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const endOfMonth = nextMonthDate.toISOString().slice(0, 10);

        // Fetch transactions: Expenses, Contact = Employee, Category = Anticipo Sueldo
        // We use the category name filter via joined table if possible, or just fetch all expenses for emp and filter.
        // For robustness, let's fetch all expenses for this employee in this period and filter by category name 
        // OR description containing "Anticipo" to be super safe. 
        // Ideally we use the unified category relation.

        const { data: transactions } = await supabase
            .from('transactions')
            .select(`
                amount,
                transaction_categories (name)
            `)
            .eq('contact_id', employee.id)
            .eq('type', 'expense')
            .gte('transaction_date', startOfMonth)
            .lt('transaction_date', endOfMonth);

        if (transactions) {
            const totalAdvances = transactions.reduce((sum, t: any) => {
                const catName = t.transaction_categories?.name?.toLowerCase() || '';
                // Check if category is 'anticipo sueldo'
                if (catName.includes('anticipo')) {
                    return sum + Number(t.amount);
                }
                return sum;
            }, 0);
            setAdvances(totalAdvances);
        } else {
            setAdvances(0);
        }
    }

    const totalIncome = baseSalary + commissions + extras;
    const totalDeductions = advances + discounts;
    const netToPay = totalIncome - totalDeductions;

    const handleSave = async () => {
        if (!employee) return;
        setLoading(true);

        try {
            // 1. Create Transaction (Expense)
            const description = `Liquidación Haberes - ${employee.full_name} - ${period}`;

            // Assuming 'transactions' table structure. 
            // We need to ensure we have a category for Salaries. 
            // If not, we put 'Otros' or create one.

            const { error } = await supabase.from('transactions').insert({
                description: description,
                amount: netToPay,
                type: 'expense',
                transaction_date: new Date().toISOString(),
                category: 'Salarios', // Ensure this category is text or ID based on schema
                // If reference to employee is needed:
                // employee_id: employee.id 
            });

            if (error) throw error;

            // 2. (Optional) Insert into a payroll_history table if it existed.

            onSuccess();
            onClose();
            alert('Liquidación registrada correctamente. Se ha generado un egreso en Caja.');

        } catch (error: any) {
            console.error('Error saving liquidation:', error);
            alert('Error al guardar liquidación: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !employee) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calculator size={20} className="text-cobalt-500" />
                            Liquidación de Sueldo
                        </h2>
                        <p className="text-sm text-zinc-500">{employee.full_name}</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                    {/* Period */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Periodo</label>
                        <input
                            type="month"
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-cobalt-500 outline-none"
                        />
                    </div>

                    {/* Income Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
                            <div className="p-1 bg-emerald-500/10 rounded text-emerald-500"><DollarSign size={14} /></div>
                            <span className="text-sm font-bold text-white uppercase">Ingresos</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Salario Base</label>
                                <input
                                    type="number"
                                    value={baseSalary}
                                    onChange={e => setBaseSalary(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Comisiones</label>
                                <input
                                    type="number"
                                    value={commissions}
                                    onChange={e => setCommissions(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-right"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-zinc-400 mb-1">Extras / Otros</label>
                                <input
                                    type="number"
                                    value={extras}
                                    onChange={e => setExtras(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-right"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Deductions Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
                            <div className="p-1 bg-red-500/10 rounded text-red-500"><DollarSign size={14} /></div>
                            <span className="text-sm font-bold text-white uppercase">Descuentos</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Anticipos</label>
                                <input
                                    type="number"
                                    value={advances}
                                    onChange={e => setAdvances(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Otros Desc.</label>
                                <input
                                    type="number"
                                    value={discounts}
                                    onChange={e => setDiscounts(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-right"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="pt-4 border-t border-zinc-800 mt-4">
                        <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                            <span className="text-zinc-400 font-bold uppercase text-sm">Neto a Pagar</span>
                            <span className="text-2xl font-bold text-emerald-400 font-mono">
                                {netToPay.toLocaleString('es-PY', { style: 'currency', currency: 'PYG' }).replace('PYG', 'Gs.')}
                            </span>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-400 hover:text-white font-medium text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-cobalt-900/20 disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : <><Save size={18} /> Confirmar Pago</>}
                    </button>
                </div>

            </div>
        </div>
    );
}
