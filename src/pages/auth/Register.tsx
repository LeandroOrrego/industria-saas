import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

export default function Register() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [searchParams] = useSearchParams();
    const inviteOrgId = searchParams.get('invite');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Sign Up
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (user) {
                if (inviteOrgId) {
                    // --- INVITED USER FLOW ---
                    // User joins EXISTING organization
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({
                            organization_id: inviteOrgId,
                            role: 'operario', // Default role for invited users, Admin can change later
                            onboarding_completed: true // SKIP ONBOARDING for invited users
                        })
                        .eq('id', user.id);

                    if (profileError) console.error("Profile update (Invite) failed", profileError);
                } else {
                    // --- NEW ORG FLOW ---
                    // Create "Personal Organization"
                    const { data: org, error: orgError } = await supabase
                        .from('organizations')
                        .insert({ name: `${fullName}'s Org` })
                        .select()
                        .single();

                    if (orgError) {
                        console.error("Org creation failed", orgError);
                    } else {
                        const { error: profileError } = await supabase
                            .from('profiles')
                            .update({
                                organization_id: org.id,
                                role: 'admin' // Creator is Admin
                            })
                            .eq('id', user.id);

                        if (profileError) console.error("Profile update failed", profileError);
                    }
                }

                alert('Registro exitoso! Por favor inicia sesión.');
                navigate('/login');
            }
        } catch (error) {
            alert('Error al registrarse: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-display bg-background-dark text-white min-h-screen relative flex flex-col">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <div
                    className="h-full w-full bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBn8lvvBc1N6zrRbcPh5H8pvNJRiwmOyKm2ROIn0mDIPXEhGFf8hwqdwncpO1CZNAKTYtlBdOOT1AAbcSawRgskodiDy3nqqx5pEVBltDA8CT4iHCXpiUp9yHq47fcy70KWavocICLoUyp2NMC0X4pJOTNmQ3phsJklSJ1qwAN_rd219Oc2y2pw_u1Tv7AKFAM16uqdKNgZHlchH2f6UQrQCma9oueBw4_AI8GTLKF3rkK8oukbiOI2h-H4AhFxQjd7x4Yf7cwAzdCa')" }}
                />
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-[#111418]/85 backdrop-blur-[2px]"></div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-[480px] flex flex-col gap-6 animate-fade-in-up">

                    {/* Register Card */}
                    <div className="flex flex-col rounded-xl border border-[#3b4754] bg-[#1c2127] shadow-2xl shadow-black/50 overflow-hidden">
                        {/* Header Section */}
                        <div className="flex flex-col gap-2 p-8 pb-0 text-center">
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                                <span className="material-symbols-outlined text-3xl">person_add</span>
                            </div>
                            <h1 className="text-white text-3xl font-extrabold leading-tight tracking-[-0.033em]">
                                Crear Cuenta
                            </h1>
                            <p className="text-[#9dabb9] text-sm font-normal leading-normal">
                                Regístrate para comenzar a gestionar tu industria.
                            </p>
                        </div>

                        {/* Form Section */}
                        <form onSubmit={handleRegister} className="flex flex-col gap-5 p-8">

                            {/* Full Name Input */}
                            <label className="flex flex-col gap-2">
                                <span className="text-white text-sm font-medium leading-normal">Nombre Completo</span>
                                <div className="flex w-full items-stretch rounded-lg border border-[#3b4754] bg-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-200">
                                    <div className="flex items-center justify-center pl-4 text-[#9dabb9]">
                                        <span className="material-symbols-outlined text-[20px]">badge</span>
                                    </div>
                                    <input
                                        className="flex w-full min-w-0 flex-1 resize-none border-none bg-transparent px-3 py-3 text-white placeholder:text-[#586370] focus:ring-0 text-sm focus:outline-none"
                                        placeholder="Juan Pérez"
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                            </label>

                            {/* Email Input */}
                            <label className="flex flex-col gap-2">
                                <span className="text-white text-sm font-medium leading-normal">Correo Electrónico</span>
                                <div className="flex w-full items-stretch rounded-lg border border-[#3b4754] bg-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-200">
                                    <div className="flex items-center justify-center pl-4 text-[#9dabb9]">
                                        <span className="material-symbols-outlined text-[20px]">mail</span>
                                    </div>
                                    <input
                                        className="flex w-full min-w-0 flex-1 resize-none border-none bg-transparent px-3 py-3 text-white placeholder:text-[#586370] focus:ring-0 text-sm focus:outline-none"
                                        placeholder="nombre@industria.com"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </label>

                            {/* Password Input */}
                            <label className="flex flex-col gap-2">
                                <span className="text-white text-sm font-medium leading-normal">Contraseña</span>
                                <div className="flex w-full items-stretch rounded-lg border border-[#3b4754] bg-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-200">
                                    <div className="flex items-center justify-center pl-4 text-[#9dabb9]">
                                        <span className="material-symbols-outlined text-[20px]">lock</span>
                                    </div>
                                    <input
                                        className="flex w-full min-w-0 flex-1 resize-none border-none bg-transparent px-3 py-3 text-white placeholder:text-[#586370] focus:ring-0 text-sm focus:outline-none"
                                        placeholder="••••••••"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <div className="flex items-center justify-center pr-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="flex items-center justify-center text-[#9dabb9] hover:text-white transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">
                                                {showPassword ? 'visibility' : 'visibility_off'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </label>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 flex w-full items-center justify-center rounded-lg bg-primary py-3 px-4 text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Registrando...' : 'Registrarse'}
                            </button>

                            <div className="flex items-center justify-center pt-2">
                                <span className="text-[#9dabb9] text-sm font-normal leading-normal">¿Ya tienes cuenta? </span>
                                <Link to="/login" className="ml-1 text-primary text-sm font-semibold hover:text-blue-400 transition-colors hover:underline">
                                    Inicia Sesión
                                </Link>
                            </div>

                        </form>

                        {/* Card Footer */}
                        <div className="bg-[#161a1f] px-8 py-4 border-t border-[#3b4754] flex justify-center gap-6">
                            <a className="text-[#9dabb9] text-xs hover:text-white transition-colors" href="#">Soporte</a>
                            <a className="text-[#9dabb9] text-xs hover:text-white transition-colors" href="#">Privacidad</a>
                            <a className="text-[#9dabb9] text-xs hover:text-white transition-colors" href="#">Términos</a>
                        </div>
                    </div>

                    {/* Page Footer */}
                    <p className="text-center text-[#586370] text-sm">
                        © 2024 Industrial SaaS. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
}
