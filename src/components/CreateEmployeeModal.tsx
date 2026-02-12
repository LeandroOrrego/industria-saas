import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Loader2, User, FileText, Briefcase, Mail, Phone, DollarSign } from 'lucide-react';

interface CreateEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeToEdit?: any;
}

export default function CreateEmployeeModal({ isOpen, onClose, onSuccess, employeeToEdit }: CreateEmployeeModalProps) {
    const [loading, setLoading] = useState(false);

    const [fullName, setFullName] = useState('');
    const [documentId, setDocumentId] = useState('');
    const [position, setPosition] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [baseSalary, setBaseSalary] = useState('');

    useEffect(() => {
        if (employeeToEdit) {
            setFullName(employeeToEdit.full_name);
            setDocumentId(employeeToEdit.document_id || '');
            setPosition(employeeToEdit.position || '');
            setEmail(employeeToEdit.email || '');
            setPhone(employeeToEdit.phone || '');
            setBaseSalary(employeeToEdit.base_salary?.toString() || '');
        } else {
            setFullName('');
            setDocumentId('');
            setPosition('');
            setEmail('');
            setPhone('');
            setBaseSalary('');
        }
    }, [employeeToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) throw new Error('No organization found');

            const payload = {
                organization_id: profile.organization_id,
                full_name: fullName,
                document_id: documentId,
                position: position,
                email: email,
                phone: phone,
                base_salary: baseSalary ? parseFloat(baseSalary) : 0,
            };

            let error;
            if (employeeToEdit) {
                const { error: updateError } = await supabase
                    .from('employees')
                    .update(payload)
                    .eq('id', employeeToEdit.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('employees')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            onSuccess();
            onClose();

        } catch (error: any) {
            console.error('Error saving employee:', error);
            alert('Error al guardar funcionario: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-lg shadow-2xl animate-scale-in overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-zinc-800">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {employeeToEdit ? 'Editar Funcionario' : 'Registrar Funcionario'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Nombre Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                required
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 outline-none"
                                placeholder="Ej. Juan Pérez"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Document ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">CI / RUC</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 outline-none"
                                    placeholder="1.234.567"
                                    value={documentId}
                                    onChange={e => setDocumentId(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* TODO: Future implementation for IPS and Commissions
                            - IPS Obrero (9%)
                            - IPS Patronal (16.5%)
                            - Commissions %
                            - Overtime Hours
                        */}

                        {/* Position */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Cargo / Puesto</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 outline-none"
                                    placeholder="Ej. Vendedor"
                                    value={position}
                                    onChange={e => setPosition(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="tel"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 outline-none"
                                    placeholder="09xx..."
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Base Salary */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Salario Base</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="number"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 outline-none"
                                    placeholder="2500000"
                                    value={baseSalary}
                                    onChange={e => setBaseSalary(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email (Opcional)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-cobalt-500 outline-none"
                                placeholder="funcionario@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-cobalt-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
