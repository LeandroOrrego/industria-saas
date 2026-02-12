import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, DollarSign, Calendar, Briefcase, ChevronRight } from 'lucide-react';
import LiquidationModal from '../../components/finance/LiquidationModal';

export default function Payroll() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    async function fetchEmployees() {
        const { data } = await supabase.from('employees').select('*').is('deleted_at', null).order('full_name');
        setEmployees(data || []);
        setLoading(false);
    }

    const handleLiquidar = (employee: any) => {
        setSelectedEmployee(employee);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        // Here we could refresh a history list if we had one
        fetchEmployees();
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100 font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Nómina & Sueldos</h1>
                    <p className="text-gray-500 dark:text-zinc-500 mt-1">Gestión de funcionarios y liquidación de haberes.</p>
                </div>
                <div className="hidden md:block p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 text-sm">
                        <Calendar size={16} />
                        <span>Periodo Actual: <span className="text-gray-900 dark:text-white font-bold">{new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span></span>
                    </div>
                </div>
            </div>

            {/* Employee List */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users size={18} className="text-cobalt-500" />
                        Lista de Funcionarios
                    </h3>
                    <span className="text-xs bg-white border border-gray-200 dark:border-zinc-700 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 px-2 py-1 rounded-full">{employees.length} Activos</span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-zinc-500 animate-pulse">Cargando nómina...</div>
                    ) : employees.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-zinc-500">No hay funcionarios registrados.</div>
                    ) : (
                        employees.map(emp => (
                            <div key={emp.id} className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 border border-gray-200 dark:border-zinc-600 flex items-center justify-center text-gray-600 dark:text-zinc-300 font-bold text-lg shadow-inner">
                                        {emp.full_name ? emp.full_name[0].toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">{emp.full_name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-zinc-500">
                                            <span className="flex items-center gap-1"><Briefcase size={12} /> {emp.position || 'Sin Cargo'}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
                                            <span>ID: {emp.document_id || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                    <div className="text-right hidden md:block mr-4">
                                        <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase font-bold">Base Estimada</p>
                                        <p className="text-gray-700 dark:text-zinc-300 font-mono">
                                            {((emp.hourly_rate || 0) * 190).toLocaleString('es-PY', { style: 'currency', currency: 'PYG' }).replace('PYG', 'Gs.')}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleLiquidar(emp)}
                                        className="bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 group-hover:shadow-lg shadow-gray-200 dark:shadow-black/50"
                                    >
                                        <DollarSign size={16} className="text-emerald-500" />
                                        Liquidar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <LiquidationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                employee={selectedEmployee}
            />
        </div>
    );
}
