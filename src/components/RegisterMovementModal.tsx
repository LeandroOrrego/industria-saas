import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, DollarSign, Loader2, FileText, Calendar } from 'lucide-react';
import CategorySelect from './finance/CategorySelect';
import ContactSearch, { Contact } from './finance/ContactSearch';

interface RegisterMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transactionToEdit?: any; // Using any for simplicity here, but better to import Transaction type
}

export default function RegisterMovementModal({ isOpen, onClose, onSuccess, transactionToEdit }: RegisterMovementModalProps) {
    const [loading, setLoading] = useState(false);

    // Form State
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [contact, setContact] = useState<Contact | null>(null);
    const [documentNumber, setDocumentNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen) {
            if (transactionToEdit) {
                // Populate form for editing
                setType(transactionToEdit.type);
                setAmount(transactionToEdit.amount.toString());
                setDescription(transactionToEdit.description);
                setCategoryId(transactionToEdit.category_id || '');
                setDocumentNumber(transactionToEdit.document_number || '');
                setPaymentMethod(transactionToEdit.payment_method || 'cash');
                // Extract date part only just in case
                setMovementDate(transactionToEdit.transaction_date.split('T')[0]);

                // Contact population is tricky if we don't have the full contact object.
                // We depend on what `transactionToEdit` has.
                // Assuming we might need to fetch it or it is passed.
                // For now, if we have contact_id and contact_type, we might need to reconstruct it or leave it blank if complex.
                // Let's try to set it if basic info is there, otherwise we might need a fetch.
                // Ideally `Cashflow` passes a transaction object that JOINs contact info?
                // Or we fetch it here.
                if (transactionToEdit.contact_id) {
                    // We can't easily populate the Contact object for the Search component without name.
                    // The Search component expects {id, name, type}.
                    // If `transactionToEdit` doesn't have name, we might show "Loading..." or similar?
                    // Let's see if we can get it from the prop or just accept incomplete state for now.
                    // Creating a dummy contact to satisfy state if we assume it's valid.
                    // But better practice: fetch it.
                    fetchContactDetails(transactionToEdit.contact_id, transactionToEdit.contact_type);
                } else {
                    setContact(null);
                }

            } else {
                resetForm();
            }
        }
    }, [isOpen, transactionToEdit]);

    const fetchContactDetails = async (id: string, type: string) => {
        // Optimistic: try to find in clients or employees based on type
        // This is a bit "hacky" inside the modal, but robust enough for this context.
        let table = 'clients';
        if (type === 'employee') table = 'employees';
        if (type === 'provider') table = 'providers';

        // 'other' or unknowns might fail.
        if (table) {
            const { data } = await supabase.from(table).select('name').eq('id', id).single();
            if (data) {
                setContact({ id, type: type as any, name: data.name });
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Get Organization ID
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user?.id)
                .single();

            if (!profile?.organization_id) throw new Error('No organization found');

            const payload = {
                organization_id: profile.organization_id,
                description: description,
                type: type,
                amount: parseFloat(amount),
                payment_method: paymentMethod,
                transaction_date: movementDate,
                // created_by: user?.id, // Don't override on edit usually, but okay for new

                // New Fields
                category_id: categoryId || null,
                contact_id: contact?.id || null,
                contact_type: contact?.type || null,
                document_number: documentNumber || null
            };

            let error;
            if (transactionToEdit) {
                // Update
                const { error: updateError } = await supabase
                    .from('transactions')
                    .update(payload)
                    .eq('id', transactionToEdit.id);
                error = updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('transactions')
                    .insert([{ ...payload, created_by: user?.id }]);
                error = insertError;
            }

            if (error) throw error;

            alert(transactionToEdit ? 'Movimiento actualizado correctamente' : 'Movimiento registrado correctamente');
            onSuccess();
            onClose();
            if (!transactionToEdit) resetForm();
        } catch (error) {
            console.error('Error saving movement:', error);
            alert('Error al guardar movimiento');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setCategoryId('');
        setContact(null);
        setDocumentNumber('');
        setType('income');
        setPaymentMethod('cash');
        setMovementDate(new Date().toISOString().split('T')[0]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <DollarSign className={type === 'income' ? "text-emerald-500" : "text-red-500"} size={20} />
                        {transactionToEdit ? 'Editar Operación' : 'Nueva Operación'}
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Type Selector */}
                    <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mb-4">
                        <button
                            type="button"
                            onClick={() => { setType('income'); setCategoryId(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'income'
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Ingreso / Cobro
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('expense'); setCategoryId(''); }}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'expense'
                                ? 'bg-red-600 text-white shadow'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Egreso / Pago
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Benficiario */}
                        <div className="col-span-2">
                            <ContactSearch value={contact} onChange={setContact} />
                        </div>

                        {/* Category */}
                        <CategorySelect type={type} value={categoryId} onChange={setCategoryId} />

                        {/* Amount */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">Monto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-bold">Gs.</span>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3 py-2 text-sm text-white font-bold text-right focus:ring-1 focus:ring-cobalt-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1"><Calendar size={12} /> Fecha</label>
                            <input
                                type="date"
                                required
                                value={movementDate}
                                onChange={(e) => setMovementDate(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                            />
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">Forma de Pago</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                            >
                                <option value="cash">Efectivo</option>
                                <option value="transfer">Transferencia Bancaria</option>
                                <option value="check">Cheque</option>
                                <option value="card">Tarjeta Crédito/Débito</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>

                        {/* Document Number */}
                        <div className="space-y-1 col-span-2 md:col-span-1">
                            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1"><FileText size={12} /> Nro. Comprobante (Opcional)</label>
                            <input
                                type="text"
                                value={documentNumber}
                                onChange={(e) => setDocumentNumber(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                placeholder="Ej. Fac-001-001-123456"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs font-medium text-zinc-400">Concepto / Descripción</label>
                            <input
                                type="text"
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                placeholder="Descripción del movimiento..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-zinc-800 mt-4">
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
                            className={`flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${type === 'income'
                                ? 'bg-emerald-600 hover:bg-emerald-500'
                                : 'bg-red-600 hover:bg-red-500'
                                }`}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {transactionToEdit ? 'Actualizar Operación' : 'Guardar Operación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
