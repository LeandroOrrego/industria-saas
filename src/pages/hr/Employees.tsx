import React, { useEffect, useState } from 'react';
import { Search, Plus, User, Mail, Phone, Briefcase, Pencil, Trash2, RefreshCcw, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CreateEmployeeModal from '../../components/CreateEmployeeModal';

interface Employee {
    id: string;
    full_name: string;
    document_id: string;
    position: string;
    email: string;
    phone: string;
    base_salary: number;
}

export default function Employees() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | undefined>(undefined);

    useEffect(() => {
        fetchEmployees();
    }, []);

    async function fetchEmployees() {
        setLoading(true);
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .is('deleted_at', null)
            .order('full_name');

        if (!error) {
            setEmployees(data || []);
        } else {
            console.error('Error fetching employees:', error);
        }
        setLoading(false);
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este funcionario?')) return;

        try {
            const { error } = await supabase
                .from('employees')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            fetchEmployees();
        } catch (error: any) {
            alert('Error al borrar: ' + error.message);
        }
    };

    const handleEdit = (employee: Employee) => {
        setEmployeeToEdit(employee);
        setIsCreateModalOpen(true);
    };

    const handleNew = () => {
        setEmployeeToEdit(undefined);
        setIsCreateModalOpen(true);
    };

    const filteredEmployees = employees.filter(e =>
        e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-zinc-400">Funcionarios</h1>
                    <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Gestión de recursos humanos y personal.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchEmployees()}
                        className="bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-700 dark:text-white p-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 transition-all shadow-sm"
                        title="Actualizar"
                    >
                        <RefreshCcw size={18} />
                    </button>
                    <button
                        onClick={handleNew}
                        className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-cobalt-900/20 transition-all"
                    >
                        <Plus size={18} /> Nuevo Funcionario
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cargo..."
                        className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-1 focus:ring-cobalt-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Cargando funcionarios...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">No hay funcionarios registrados.</div>
                ) : (
                    filteredEmployees.map(employee => (
                        <div key={employee.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group relative">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(employee)} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded text-gray-500 hover:text-blue-600 transition-colors">
                                    <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDelete(employee.id)} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded text-gray-500 hover:text-red-600 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cobalt-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                    {employee.full_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{employee.full_name}</h3>
                                    <p className="text-sm text-cobalt-600 dark:text-cobalt-400 font-medium">{employee.position || 'Sin cargo'}</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 dark:text-zinc-400">
                                {employee.document_id && (
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-gray-400" />
                                        <span>CI: {employee.document_id}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-gray-400" />
                                    <span>{employee.email || 'Sin email'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-gray-400" />
                                    <span>{employee.phone || 'Sin teléfono'}</span>
                                </div>
                                {employee.base_salary > 0 && (
                                    <div className="flex items-center gap-2 pt-2 text-gray-900 dark:text-white font-bold">
                                        <DollarSign size={14} className="text-emerald-500" />
                                        <span>{employee.base_salary.toLocaleString('es-PY', { style: 'currency', currency: 'PYG' })} / mes</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateEmployeeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchEmployees}
                employeeToEdit={employeeToEdit}
            />
        </div>
    );
}
