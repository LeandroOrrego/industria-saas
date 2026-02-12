import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Types
type Profile = {
    id: string;
    email: string;
    role: string;
    organization_id: string;
};

type AppPermission = {
    code: string;
    category: string;
    description: string;
};

type UserPermission = {
    permission_code: string;
};

export default function Roles() {
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [showPanel, setShowPanel] = useState(false);

    // Data State
    const [users, setUsers] = useState<Profile[]>([]);
    const [allPermissions, setAllPermissions] = useState<AppPermission[]>([]);
    const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Fetch Initial Data
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // 1. Get current user's Org ID
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: myProfile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                if (!myProfile?.organization_id) return;

                // 2. Fetch Users in this Org
                const { data: orgUsers } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('organization_id', myProfile.organization_id);

                if (orgUsers) setUsers(orgUsers);

                // 3. Fetch App Permissions Catalog
                const { data: perms } = await supabase
                    .from('app_permissions')
                    .select('*');

                if (perms) setAllPermissions(perms);

                // Select first user by default
                if (orgUsers && orgUsers.length > 0) {
                    setSelectedUser(orgUsers[0]);
                    // Don't show panel by default on mobile, maybe on desktop? 
                    // Let's keep panel closed or open based on screen size? 
                    // For now defaults to closed or user interaction.
                    setShowPanel(window.innerWidth > 1024);
                }

            } catch (error) {
                console.error('Error loading roles data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Fetch Permissions for Selected User
    useEffect(() => {
        async function fetchUserPerms() {
            if (!selectedUser) return;
            // Fetch User Permissions
            const { data } = await supabase
                .from('user_permissions')
                .select('permission_code')
                .eq('user_id', selectedUser.id)
                .eq('organization_id', selectedUser.organization_id);

            if (data) {
                const paramSet = new Set(data.map(p => p.permission_code));
                setUserPermissions(paramSet);
            } else {
                setUserPermissions(new Set());
            }
        }
        fetchUserPerms();
    }, [selectedUser]);

    // Handle Permission Toggle
    const togglePermission = async (permCode: string, isChecked: boolean) => {
        if (!selectedUser) return;

        // Optimistic UI Update
        const nextSet = new Set(userPermissions);
        if (isChecked) nextSet.add(permCode);
        else nextSet.delete(permCode);
        setUserPermissions(nextSet);

        try {
            if (isChecked) {
                const { error } = await supabase.from('user_permissions').insert({
                    user_id: selectedUser.id,
                    organization_id: selectedUser.organization_id,
                    permission_code: permCode
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('user_permissions').delete()
                    .eq('user_id', selectedUser.id)
                    .eq('organization_id', selectedUser.organization_id)
                    .eq('permission_code', permCode);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error toggling permission:', error);
            // Revert on error
            setUserPermissions(userPermissions);
            alert('Error al actualizar permiso');
        }
    };

    // Group permissions by category
    const permissionsByCategory = allPermissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, AppPermission[]>);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100 overflow-hidden">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-zinc-500 text-sm">Configuración</span>
                    <span className="material-symbols-outlined text-gray-400 dark:text-zinc-600 text-sm">chevron_right</span>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 uppercase tracking-widest">Roles y Accesos</h2>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8 h-full flex flex-col">

                    {/* Title */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">GESTIÓN DE ACCESOS</h1>
                            <p className="text-gray-500 dark:text-zinc-400 text-sm max-w-lg">Configura los permisos técnicos por usuario.</p>
                        </div>
                        <button
                            onClick={() => {
                                if (users.length > 0 && users[0].organization_id) {
                                    const link = `${window.location.origin}/register?invite=${users[0].organization_id}`;
                                    navigator.clipboard.writeText(link);
                                    alert('Link de invitación copiado al portapapeles!');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-cobalt-900/20"
                        >
                            <span className="material-symbols-outlined text-[18px]">link</span>
                            Copiar Link de Invitación
                        </button>
                    </div>

                    <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">

                        {/* Users List */}
                        <div className={`${showPanel ? 'col-span-12 lg:col-span-7' : 'col-span-12'} transition-all duration-300 flex flex-col min-h-0`}>
                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-full">
                                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
                                    <div className="relative w-full md:w-64">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 text-lg">search</span>
                                        <input className="w-full bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-300 text-xs rounded pl-10 h-9 focus:ring-cobalt-600 focus:border-cobalt-600 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none" placeholder="Filtrar por email..." type="text" />
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full text-left text-xs uppercase tracking-wider table-auto">
                                        <thead className="bg-gray-50 dark:bg-zinc-950/50 text-gray-500 dark:text-zinc-500 font-bold border-b border-gray-200 dark:border-zinc-800 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-4">Usuario</th>
                                                <th className="px-6 py-4">Rol</th>
                                                <th className="px-6 py-4 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                                            {loading ? (
                                                <tr><td colSpan={3} className="p-6 text-center text-gray-500 dark:text-zinc-500">Cargando usuarios...</td></tr>
                                            ) : users.map((user) => (
                                                <tr
                                                    key={user.id}
                                                    onClick={() => { setSelectedUser(user); setShowPanel(true); }}
                                                    className={`${selectedUser?.id === user.id ? 'bg-cobalt-50 dark:bg-cobalt-950/20 border-l-2 border-cobalt-600' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/30 border-l-2 border-transparent'} transition-colors cursor-pointer group`}
                                                >
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="size-10 rounded bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-500 font-black">
                                                                {user.email.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                {/* Name missing in DB, using Email */}
                                                                <div className="font-bold text-gray-900 dark:text-zinc-100 mb-0.5">{user.email.split('@')[0]}</div>
                                                                <div className="text-[10px] text-gray-500 dark:text-zinc-500 lowercase">{user.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded text-[10px] font-bold border border-gray-200 dark:border-zinc-700">{user.role}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        {selectedUser?.id === user.id ? (
                                                            <span className="material-symbols-outlined text-cobalt-600 dark:text-cobalt-400 text-lg">arrow_forward_ios</span>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-gray-400 dark:text-zinc-600 group-hover:text-gray-600 dark:group-hover:text-zinc-300 text-lg">more_vert</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Permissions Panel */}
                        {showPanel && selectedUser && (
                            <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
                                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-2xl flex flex-col sticky top-0 max-h-full">
                                    <div className="p-6 border-b border-gray-200 dark:border-zinc-800 shrink-0">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[10px] font-black text-cobalt-600 dark:text-cobalt-500 uppercase tracking-[0.2em] mb-1">Seguridad</p>
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">PERMISOS</h3>
                                            </div>
                                            <button onClick={() => setShowPanel(false)} className="material-symbols-outlined text-gray-400 dark:text-zinc-600 cursor-pointer hover:text-gray-900 dark:hover:text-white">close</button>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-zinc-950 rounded border border-gray-200 dark:border-zinc-800">
                                            <div className="size-12 rounded bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-500 font-black text-xl">
                                                {selectedUser.email.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white uppercase truncate">{selectedUser.email}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500 dark:text-zinc-500">Rol:</span>
                                                    <select
                                                        value={selectedUser.role}
                                                        onChange={async (e) => {
                                                            const newRole = e.target.value;
                                                            // Optimistic update
                                                            const updatedUser = { ...selectedUser, role: newRole };
                                                            setSelectedUser(updatedUser);
                                                            setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));

                                                            try {
                                                                const { error } = await supabase
                                                                    .from('profiles')
                                                                    .update({ role: newRole })
                                                                    .eq('id', selectedUser.id);
                                                                if (error) throw error;
                                                            } catch (err) {
                                                                alert('Error al actualizar rol');
                                                                // Revert? For now simply alert
                                                            }
                                                        }}
                                                        className="bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 text-xs text-gray-900 dark:text-white rounded px-2 py-0.5 focus:ring-1 focus:ring-cobalt-500 outline-none"
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="operario">Operario</option>
                                                        <option value="administrativo">Administrativo</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-8 overflow-y-auto flex-1">
                                        {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                            <div key={category} className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-gray-400 dark:text-zinc-500">lock</span>
                                                        <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-zinc-100">{category}</span>
                                                    </div>
                                                </div>
                                                <div className="ml-8 space-y-3 border-l border-gray-200 dark:border-zinc-800 pl-6">
                                                    {perms.map(perm => (
                                                        <div key={perm.code} className="flex items-center justify-between group">
                                                            <span className="text-[11px] text-gray-500 dark:text-zinc-400 uppercase tracking-wider group-hover:text-gray-900 dark:group-hover:text-zinc-200 transition-colors">{perm.description}</span>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only peer"
                                                                    checked={userPermissions.has(perm.code)}
                                                                    onChange={(e) => togglePermission(perm.code, e.target.checked)}
                                                                />
                                                                <div className="w-9 h-5 bg-gray-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-zinc-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cobalt-600 peer-checked:after:bg-white"></div>
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
