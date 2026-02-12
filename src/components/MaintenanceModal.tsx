import React, { useState } from 'react';
import { X, Save, Calendar, DollarSign, User, FileText, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Machine = Database['public']['Tables']['machines']['Row'];

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    machine: Machine | null;
}

export default function MaintenanceModal({ isOpen, onClose, onSuccess, machine }: MaintenanceModalProps) {
    const [formData, setFormData] = useState({
        type: 'preventive',
        description: '',
        cost: '',
        performed_by: '',
        maintenance_date: new Date().toISOString().split('T')[0],
        next_due_date: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!machine) return;
        setLoading(true);

        try {
            // calculated numeric cost
            const numericCost = formData.cost ? parseFloat(formData.cost) : 0;

            const payload = {
                machine_id: machine.id,
                type: formData.type,
                description: formData.description,
                cost: numericCost,
                performed_by: formData.performed_by,
                maintenance_date: formData.maintenance_date,
                next_due_date: formData.next_due_date || null
            };

            const { error } = await supabase.from('maintenance_logs').insert([payload]);
            if (error) throw error;

            onSuccess();
            onClose();
            // Reset form (optional, but good UX)
            setFormData({
                type: 'preventive',
                description: '',
                cost: '',
                performed_by: '',
                maintenance_date: new Date().toISOString().split('T')[0],
                next_due_date: ''
            });

        } catch (error) {
            console.error('Error logging maintenance:', error);
            alert('Error al registrar mantenimiento');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !machine) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Wrench size={20} className="text-cobalt-500" />
                            Registrar Mantenimiento
                        </h2>
                        <p className="text-sm text-zinc-500 mt-1">{machine.name} - {machine.brand}</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Type & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Tipo</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="preventive">Preventivo</option>
                                <option value="corrective">Correctivo (Reparación)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Fecha Realizado</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="date"
                                    required
                                    className="w-full pl-10 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none [color-scheme:dark]"
                                    value={formData.maintenance_date}
                                    onChange={e => setFormData({ ...formData, maintenance_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Descripción del Trabajo</label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Detalle de las tareas realizadas..."
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none resize-none"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Cost & Performed By */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Costo ($)</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full pl-10 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                    value={formData.cost}
                                    onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Realizado Por</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Técnico o Empresa"
                                    className="w-full pl-10 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                    value={formData.performed_by}
                                    onChange={e => setFormData({ ...formData, performed_by: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Next Due Date */}
                    <div className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
                        <label className="block text-xs font-bold text-cobalt-400 uppercase mb-1 flex items-center gap-2">
                            📅 Próximo Mantenimiento (Agenda)
                        </label>
                        <input
                            type="date"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none [color-scheme:dark]"
                            value={formData.next_due_date}
                            onChange={e => setFormData({ ...formData, next_due_date: e.target.value })}
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">
                            Al guardar, se actualizará la fecha de alerta de la máquina.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-zinc-400 hover:text-white font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-6 py-2 rounded-lg font-bold flex items-center transition-all shadow-lg shadow-cobalt-900/20"
                        >
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save size={18} className="mr-2" />
                                    Registrar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
