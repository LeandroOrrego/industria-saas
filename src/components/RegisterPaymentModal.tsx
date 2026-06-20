import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, DollarSign, Loader2 } from 'lucide-react';
import { Database } from '../types/supabase';

type Invoice = Database['public']['Tables']['invoices']['Row'] & {
    clients: { name: string } | null;
    invoice_number: string | null;
};

interface RegisterPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    invoice: Invoice | null;
}

export default function RegisterPaymentModal({ isOpen, onClose, onSuccess, invoice }: RegisterPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('efectivo'); // efectivo, cheque, transferencia, tarjeta
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen && invoice) {
            // Determine default amount to show
            // If balance is present and > 0, use balance.
            // If balance is 0 (or null), use total_amount (assuming it's a new/unpaid invoice if we are here).
            const amountToShow = (invoice.balance && invoice.balance > 0)
                ? invoice.balance
                : invoice.total_amount;

            setAmount(amountToShow?.toString() || '0');
        }
    }, [isOpen, invoice?.id, invoice?.balance, invoice?.total_amount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoice) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const paymentAmount = parseFloat(amount);

            // 1. Registrar pago en tabla payments
            // Esto dispara tr_update_invoice_payment que actualiza invoices.balance y status
            const { error: paymentError } = await supabase.from('payments').insert([{
                invoice_id: invoice.id,
                amount: paymentAmount,
                payment_date: paymentDate,
                payment_method: paymentMethod,
                reference: reference,
                notes: notes,
                created_by: user?.id
            }]);
            if (paymentError) throw paymentError;

            // 2. Actualizar accounts_receivable para reflejar el cobro
            const { data: arRecord } = await supabase
                .from('accounts_receivable')
                .select('id, balance')
                .eq('invoice_id', invoice.id)
                .single();

            if (arRecord) {
                const newBalance = Math.max((arRecord.balance || 0) - paymentAmount, 0);
                const newStatus = newBalance <= 0 ? 'cobrado' : 'parcial';

                await supabase
                    .from('accounts_receivable')
                    .update({
                        balance: newBalance,
                        status: newStatus
                    })
                    .eq('id', arRecord.id);
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error registering payment:', error);
            alert('Error al registrar el pago: ' + (error.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !invoice) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <DollarSign className="text-emerald-500" size={20} /> Registrar Cobro
                        </h2>
                        <p className="text-xs text-zinc-400">Factura {invoice.invoice_number}</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-zinc-500">Cliente:</span>
                            <span className="text-white font-medium">{invoice.clients?.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Saldo Pendiente:</span>
                            <span className="text-red-400 font-bold font-mono">
                                {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(invoice.balance || 0)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">Fecha</label>
                            <input
                                type="date"
                                required
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">Monto a Cobrar</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max={invoice.balance || invoice.total_amount}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-bold text-right focus:ring-1 focus:ring-cobalt-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Forma de Pago</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                        >
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia Bancaria</option>
                            <option value="cheque">Cheque</option>
                            <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Referencia / Nro. Comprobante</label>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                            placeholder="Ej. Transferencia #123456"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Notas Adicionales</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none h-20 resize-none"
                            placeholder="Comentarios opcionales..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-zinc-800 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
                            Confirmar Cobro
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
