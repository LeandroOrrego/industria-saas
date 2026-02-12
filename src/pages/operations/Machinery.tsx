import React, { useEffect, useState } from 'react';
import { Plus, Search, Settings, Tool, AlertTriangle, Calendar, PenTool, History } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import MachineryModal from '../../components/MachineryModal';
// import MaintenanceModal from '../../components/MaintenanceModal'; // To be implemented

type Machine = Database['public']['Tables']['machines']['Row'];

export default function Machinery() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [machineToEdit, setMachineToEdit] = useState<Machine | null>(null);

    useEffect(() => {
        fetchMachines();
    }, []);

    async function fetchMachines() {
        try {
            const { data, error } = await supabase
                .from('machines')
                .select('*')
                .order('name');

            if (error) throw error;
            setMachines(data || []);
        } catch (error) {
            console.error('Error fetching machines:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleEdit = (machine: Machine) => {
        setMachineToEdit(machine);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setMachineToEdit(null);
        setIsModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold uppercase">Operativa</span>;
            case 'maintenance': return <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold uppercase flex items-center gap-1"><Tool size={12} /> Mantenimiento</span>;
            case 'repair': return <span className="px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold uppercase flex items-center gap-1"><AlertTriangle size={12} /> Reparación</span>;
            default: return <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 text-xs font-bold uppercase">Fuera de Servicio</span>;
        }
    };

    const filteredMachines = machines.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-zinc-950 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Maquinaria y Mantenimiento</h1>
                    <p className="text-zinc-500 text-sm mt-1">Gestión de activos y programación de mantenimientos.</p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2.5 rounded-lg flex items-center transition-all shadow-lg shadow-cobalt-900/20 text-sm font-semibold border border-cobalt-500/20"
                >
                    <Plus size={18} className="mr-2" />
                    Nueva Máquina
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    type="text"
                    placeholder="Buscar máquina..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg focus:ring-1 focus:ring-cobalt-500 text-zinc-200 text-sm outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    <div className="text-zinc-500 col-span-full text-center py-12">Cargando maquinaria...</div>
                ) : filteredMachines.length === 0 ? (
                    <div className="text-zinc-500 col-span-full text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
                        No hay máquinas registradas.
                    </div>
                ) : (
                    filteredMachines.map(machine => (
                        <div key={machine.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-cobalt-500/30 transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-zinc-950 rounded-lg text-cobalt-500 border border-zinc-800">
                                    <Settings size={24} />
                                </div>
                                <button onClick={() => handleEdit(machine)} className="text-zinc-600 hover:text-white transition-colors">
                                    <PenTool size={16} />
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1">{machine.name}</h3>
                            <p className="text-sm text-zinc-500 mb-4">{machine.brand} {machine.model}</p>

                            <div className="flex items-center justify-between mb-4">
                                {getStatusBadge(machine.status || 'out_of_service')}
                            </div>

                            <div className="space-y-2 pt-4 border-t border-zinc-800/50">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500 flex items-center gap-1.5">
                                        <Calendar size={12} /> Prox. Mantenimiento:
                                    </span>
                                    <span className={`font-mono font-bold ${machine.next_maintenance_date && new Date(machine.next_maintenance_date) < new Date()
                                            ? 'text-red-400'
                                            : 'text-zinc-300'
                                        }`}>
                                        {machine.next_maintenance_date ? new Date(machine.next_maintenance_date).toLocaleDateString() : '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500 flex items-center gap-1.5">
                                        <History size={12} /> Último Service:
                                    </span>
                                    <span className="text-zinc-400">
                                        {machine.last_maintenance_date ? new Date(machine.last_maintenance_date).toLocaleDateString() : '-'}
                                    </span>
                                </div>
                            </div>

                            <button className="w-full mt-4 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white py-2 rounded border border-zinc-800 transition-colors text-xs font-bold uppercase">
                                Registrar Mantenimiento
                            </button>
                        </div>
                    ))
                )}
            </div>

            <MachineryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchMachines}
                machineToEdit={machineToEdit}
            />
        </div>
    );
}
