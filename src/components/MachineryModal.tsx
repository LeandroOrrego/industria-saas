import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Machine = Database['public']['Tables']['machines']['Row'];

interface MachineryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    machineToEdit?: Machine | null;
}

export default function MachineryModal({ isOpen, onClose, onSuccess, machineToEdit }: MachineryModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        model: '',
        serial_number: '',
        status: 'active',
        next_maintenance_date: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (machineToEdit) {
            setFormData({
                name: machineToEdit.name,
                brand: machineToEdit.brand || '',
                model: machineToEdit.model || '',
                serial_number: machineToEdit.serial_number || '',
                status: machineToEdit.status || 'active',
                next_maintenance_date: machineToEdit.next_maintenance_date || ''
            });
        } else {
            setFormData({
                name: '',
                brand: '',
                model: '',
                serial_number: '',
                status: 'active',
                next_maintenance_date: ''
            });
        }
    }, [machineToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

            const payload = {
                organization_id: profile?.organization_id,
                name: formData.name,
                brand: formData.brand,
                model: formData.model,
                serial_number: formData.serial_number,
                status: formData.status,
                next_maintenance_date: formData.next_maintenance_date || null
            };

            if (machineToEdit) {
                const { error } = await supabase.from('machines').update(payload).eq('id', machineToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('machines').insert([payload]);
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving machine:', error);
            alert('Error al guardar maquinaria');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-white">
                        {machineToEdit ? 'Editar Maquinaria' : 'Nueva Maquinaria'}
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nombre</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                            placeholder="Ej. Torno CNC 1"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Marca</label>
                            <input
                                type="text"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                placeholder="Ej. Haas"
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Modelo</label>
                            <input
                                type="text"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Número de Serie</label>
                        <input
                            type="text"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                            placeholder="SN-123456"
                            value={formData.serial_number}
                            onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Estado</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="active">Operativa</option>
                                <option value="maintenance">En Mantenimiento</option>
                                <option value="repair">En Reparación</option>
                                <option value="out_of_service">Fuera de Servicio</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Prox. Mantenimiento</label>
                            <input
                                type="date"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-cobalt-500 outline-none [color-scheme:dark]"
                                value={formData.next_maintenance_date}
                                onChange={e => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
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
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
