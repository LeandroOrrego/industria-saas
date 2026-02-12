import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (error) {
            alert('Error al iniciar sesión: ' + (error as Error).message);
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

                    {/* Login Card */}
                    <div className="flex flex-col rounded-xl border border-[#3b4754] bg-[#1c2127] shadow-2xl shadow-black/50 overflow-hidden">
                        {/* Header Section */}
                        <div className="flex flex-col gap-2 p-8 pb-0 text-center">
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                                <span className="material-symbols-outlined text-3xl">precision_manufacturing</span>
                            </div>
                            <h1 className="text-white text-3xl font-extrabold leading-tight tracking-[-0.033em]">
                                Bienvenido
                            </h1>
                            <p className="text-[#9dabb9] text-sm font-normal leading-normal">
                                Ingresa tus credenciales para acceder al sistema de gestión.
                            </p>
                        </div>

                        {/* Form Section */}
                        <form onSubmit={handleLogin} className="flex flex-col gap-5 p-8">
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

                            {/* Actions Row */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        className="h-4 w-4 rounded border-[#3b4754] bg-[#111418] text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 transition duration-150 ease-in-out cursor-pointer"
                                        type="checkbox"
                                    />
                                    <span className="text-[#9dabb9] text-sm font-normal leading-normal group-hover:text-white transition-colors">Recordarme</span>
                                </label>
                                <Link to="/forgot-password" className="text-primary text-sm font-semibold hover:text-blue-400 transition-colors hover:underline">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 flex w-full items-center justify-center rounded-lg bg-primary py-3 px-4 text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-blue-600 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                            </button>

                            <div className="flex items-center justify-center pt-4">
                                <span className="text-[#9dabb9] text-sm font-normal leading-normal">¿No tienes cuenta? </span>
                                <Link to="/register" className="ml-1 text-primary text-sm font-semibold hover:text-blue-400 transition-colors hover:underline">
                                    Regístrate aquí
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
