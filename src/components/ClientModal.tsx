import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Loader2 } from 'lucide-react';
import { Database } from '../types/supabase';

// Manually extending the type since the DB types might not be updated yet
type Client = Database['public']['Tables']['clients']['Row'] & {
    phone?: string | null;
    city?: string | null;
    status?: string | null;
    category?: string | null;
    address?: string | null;
    email?: string | null;
};

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clientToEdit?: Client | null;
}

export default function ClientModal({ isOpen, onClose, onSuccess, clientToEdit }: ClientModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        tax_id: '',
        phone: '',
        city: '',
        address: '',
        email: '',
        category: 'industrial', // Default
        status: 'active'       // Default
    });

    useEffect(() => {
        if (clientToEdit) {
            setFormData({
                name: clientToEdit.name,
                tax_id: clientToEdit.tax_id || '',
                phone: clientToEdit.phone || '',
                city: clientToEdit.city || '',
                address: clientToEdit.address || '',
                email: clientToEdit.email || '',
                category: clientToEdit.category || 'industrial',
                status: clientToEdit.status || 'active'
            });
        } else {
            setFormData({
                name: '',
                tax_id: '',
                phone: '',
                city: '',
                address: '',
                email: '',
                category: 'industrial',
                status: 'active'
            });
        }
    }, [clientToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            // Fetch organization_id (assuming the user has one profile)
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) throw new Error('No organization found');

            const payload = {
                organization_id: profile.organization_id,
                name: formData.name,
                tax_id: formData.tax_id,
                phone: formData.phone,
                city: formData.city,
                address: formData.address,
                email: formData.email,
                category: formData.category,
                status: formData.status
            };

            if (clientToEdit) {
                const { error } = await supabase
                    .from('clients')
                    .update(payload)
                    .eq('id', clientToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('clients')
                    .insert([payload]);
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Error al guardar el cliente');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h2 className="text-lg font-bold text-white">
                        {clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Razón Social / Nombre</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                            placeholder="Ej. Metalúrgica Andina S.A.C."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">CI / RUC</label>
                            <input
                                type="text"
                                value={formData.tax_id}
                                onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                                placeholder="8001234-5"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">Teléfono</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                                placeholder="+595 983 600000"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                            placeholder="cliente@empresa.com"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Dirección</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                            placeholder="Av. Principal 123"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-400">Ciudad / Zona</label>
                        <input
                            type="text"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                            placeholder="Ej. Asunción"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">Categoría</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                            >
                                <option value="industrial">Industrial</option>
                                <option value="construccion">Construcción</option>
                                <option value="retail">Retail / Minorista</option>
                                <option value="servicios">Servicios</option>
                                <option value="otros">Otros</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-400">Estado</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 outline-none"
                            >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                                <option value="pending">Pendiente</option>
                            </select>
                        </div>
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
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-cobalt-600 hover:bg-cobalt-500 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar Cliente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
