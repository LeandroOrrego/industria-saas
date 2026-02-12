import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`, // We'll need a ResetPassword page later to handle the update
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: 'Correo enviado. Si existe una cuenta asociada a este correo, recibirás las instrucciones en breve.'
            });
        } catch (error) {
            setMessage({
                type: 'error',
                text: 'Error al enviar el correo: ' + (error as Error).message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex flex-col antialiased selection:bg-primary/30 selection:text-white overflow-hidden text-white">
            {/* Subtle Background Texture/Image matches Register/Login style or User provided gradient */}
            <div className="fixed inset-0 z-0 opacity-40 pointer-events-none mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #202b38 0%, #101922 100%)" }}>
            </div>

            {/* Navigation Bar */}
            <header className="relative z-10 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-border-dark px-6 py-4 lg:px-10 bg-background-dark/80 backdrop-blur-md">
                <div className="flex items-center gap-4 text-white">
                    <div className="size-8 text-primary">
                        <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd"></path>
                            <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd"></path>
                        </svg>
                    </div>
                    <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Industrial SaaS</h2>
                </div>
                <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
                    <div className="flex items-center gap-9">
                        <a className="text-gray-300 hover:text-white transition-colors text-sm font-medium leading-normal" href="#">Soporte</a>
                        <a className="text-gray-300 hover:text-white transition-colors text-sm font-medium leading-normal" href="#">Documentación</a>
                    </div>
                    <Link to="/login" className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 border border-border-dark text-white text-sm font-bold leading-normal hover:bg-card-dark transition-colors">
                        <span className="truncate">Log In</span>
                    </Link>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                {/* Recovery Card */}
                <div className="w-full max-w-md bg-card-dark rounded-xl border border-border-dark shadow-2xl p-8 space-y-8">
                    {/* Header Section */}
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-3xl">lock_reset</span>
                        </div>
                        <h2 className="text-white text-2xl font-bold leading-tight tracking-tight">
                            ¿Olvidaste tu contraseña?
                        </h2>
                        <p className="mt-3 text-gray-400 text-sm leading-relaxed max-w-[90%] mx-auto">
                            No te preocupes. Escribe tu correo electrónico y te enviaremos un enlace seguro para restablecerla.
                        </p>
                    </div>

                    {/* Form Section */}
                    <form className="space-y-6" onSubmit={handleResetPassword}>
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2" htmlFor="email">
                                Email Corporativo
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                    <span className="material-symbols-outlined text-[20px]">mail</span>
                                </div>
                                {/* Applying bg-transparent to match the requested style in previous steps, overriding the HTML's bg-input-bg which was solid */}
                                <input
                                    className="block w-full rounded-lg border border-[#3b4754] bg-transparent pl-10 pr-3 py-3 text-white placeholder:text-[#637588] focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-all duration-200 ease-in-out shadow-sm"
                                    id="email"
                                    name="email"
                                    placeholder="nombre@empresa.com"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-lg flex gap-3 items-start ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                <span className={`material-symbols-outlined ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {message.type === 'success' ? 'check_circle' : 'error'}
                                </span>
                                <div>
                                    <h4 className={`font-bold text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                        {message.type === 'success' ? 'Correo enviado' : 'Error'}
                                    </h4>
                                    <p className={`text-xs mt-1 ${message.type === 'success' ? 'text-green-200/80' : 'text-red-200/80'}`}>
                                        {message.text}
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            className="flex w-full cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-primary hover:bg-blue-600 active:bg-blue-700 text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-blue-900/20 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="border-t border-border-dark pt-6 mt-2">
                        <div className="flex items-center justify-center">
                            <Link to="/login" className="group flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">arrow_back</span>
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <p className="mt-8 text-center text-xs text-gray-600">
                    © 2024 Industrial SaaS Inc. Todos los derechos reservados.
                </p>
            </main>
        </div>
    );
}
