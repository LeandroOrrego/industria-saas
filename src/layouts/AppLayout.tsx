import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Menu } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';

export default function AppLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile, sidebar handles desktop static
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false); // New State

    useEffect(() => {
        async function getSession() {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate('/login');
                setLoading(false);
                return;
            }

            setUserEmail(session.user.email ?? 'Usuario');

            // ...
            // Fetch Role & Super Admin Status
            // Fetch Role, Super Admin, and FLOW STATUS
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*, organization:organizations(*)')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                }

                if (profile) {
                    setUserRole(profile.role);
                    const isAdmin = profile.is_super_admin === true;
                    setIsSuperAdmin(isAdmin);

                    // --- FLOW GUARD RAILS ---
                    // Don't run checks if we are already on the target pages
                    const isSubscriptionPage = location.pathname === '/settings/subscription';
                    const isOnboardingPage = location.pathname === '/onboarding';
                    const isLoginPage = location.pathname === '/login';

                    if (!isLoginPage && !isSuperAdmin) {
                        // 1. Check Subscription (Skip for Super Admin)
                        // We need to check if there is an active (or pending) subscription for this org
                        if (profile.organization_id) {
                            const { data: sub } = await supabase
                                .from('subscriptions')
                                .select('status')
                                .eq('organization_id', profile.organization_id)
                                .maybeSingle();

                            // If no subscription, redirect to Plans
                            if (!sub && !isSubscriptionPage) {
                                console.log("No subscription found. Redirecting to plans...");
                                navigate('/settings/subscription');
                                return; // Stop further checks
                            }
                        }

                        // 2. Check Onboarding
                        // If subscription exists (or skipped), check onboarding
                        if (!profile.onboarding_completed && !isOnboardingPage && !isSubscriptionPage) {
                            console.log("Onboarding not completed. Redirecting...");
                            navigate('/onboarding');
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching session data:', error);
            } finally {
                setLoading(false);
            }
        }

        getSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                navigate('/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate, location.pathname]);

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white">Cargando...</div>;

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100">

            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                userEmail={userEmail}
                userRole={userRole}
                isSuperAdmin={isSuperAdmin} // Pass Prop
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-zinc-950">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center px-4 sticky top-0 z-10 shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="ml-4 text-lg font-semibold text-gray-900 dark:text-white tracking-widest uppercase">MetalSaaS</span>
                </header>

                <main className="flex-1 overflow-auto flex flex-col relative w-full">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
