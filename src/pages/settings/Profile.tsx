import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Mail, Shield, Calendar } from 'lucide-react';

interface ProfileData {
    email: string;
    role: string;
    organization_name: string;
    created_at: string;
}

export default function Profile() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profileData, error } = await supabase
                    .from('profiles')
                    .select(`
                        email,
                        role,
                        created_at,
                        organizations (
                            name
                        )
                    `)
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (profileData) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const org = profileData.organizations as any;
                    const orgName = Array.isArray(org) ? org[0]?.name : org?.name;

                    setProfile({
                        email: profileData.email || user.email || '',
                        role: profileData.role,
                        organization_name: orgName || 'Sin Organización',
                        created_at: profileData.created_at
                    });
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, []);

    if (loading) {
        return <div className="p-8 text-gray-500 dark:text-zinc-500">Cargando perfil...</div>;
    }

    if (!profile) {
        return <div className="p-8 text-red-500">No se pudo cargar el perfil.</div>;
    }

    const formattedDate = new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date(profile.created_at));

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mi Perfil</h1>
            <p className="text-gray-500 dark:text-zinc-400 mb-8">Información de tu cuenta y organización.</p>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="h-32 bg-cobalt-600/10 dark:bg-cobalt-500/10 w-full relative">
                    <div className="absolute -bottom-12 left-8">
                        <div className="size-24 rounded-full bg-white dark:bg-zinc-800 p-1">
                            <div className="w-full h-full rounded-full bg-cobalt-100 dark:bg-zinc-700 flex items-center justify-center text-3xl font-bold text-cobalt-600 dark:text-cobalt-400 border border-gray-100 dark:border-zinc-600">
                                {profile.email.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-8 px-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{profile.email}</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cobalt-100 text-cobalt-800 dark:bg-cobalt-500/20 dark:text-cobalt-300 capitalize">
                        {profile.role}
                    </span>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800/50">
                            <div className="p-2 rounded bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 shadow-sm">
                                <Building2 size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Organización</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{profile.organization_name}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800/50">
                            <div className="p-2 rounded bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 shadow-sm">
                                <Mail size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Correo Electrónico</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{profile.email}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800/50">
                            <div className="p-2 rounded bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 shadow-sm">
                                <Shield size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Rol de Usuario</p>
                                <p className="font-semibold text-gray-900 dark:text-white capitalize">{profile.role}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800/50">
                            <div className="p-2 rounded bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500 shadow-sm">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Miembro Desde</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {formattedDate}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
