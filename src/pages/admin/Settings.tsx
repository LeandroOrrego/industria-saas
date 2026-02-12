import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Building, Printer, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [org, setOrg] = useState<any>(null);

    // Form Stats
    const [formData, setFormData] = useState({
        name: '',
        legal_name: '',
        tax_id: '',
        activity_description: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        current_timbrado: '',
        timbrado_expiration: '',
        timbrado_start_date: '',
        invoice_prefix: '',
        next_invoice_number: 1,
        print_margin_top: 0,
        print_margin_left: 0,
        logo_url: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user's org
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (profile?.organization_id) {
                const { data: orgData, error } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', profile.organization_id)
                    .single();

                if (error) throw error;
                setOrg(orgData);
                setFormData({
                    name: orgData.name || '',
                    legal_name: orgData.legal_name || '',
                    tax_id: orgData.tax_id || '',
                    activity_description: orgData.activity_description || '',
                    email: orgData.email || '',
                    phone: orgData.phone || '',
                    website: orgData.website || '',
                    address: orgData.address || '',
                    current_timbrado: orgData.current_timbrado || '',
                    timbrado_expiration: orgData.timbrado_expiration || '',
                    timbrado_start_date: orgData.timbrado_start_date || '',
                    invoice_prefix: orgData.invoice_prefix || '001-001',
                    next_invoice_number: orgData.next_invoice_number || 1,
                    print_margin_top: orgData.print_margin_top || 0,
                    print_margin_left: orgData.print_margin_left || 0,
                    logo_url: orgData.logo_url || ''
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!org) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update(formData)
                .eq('id', org.id);

            if (error) throw error;
            alert('Configuración guardada correctamente');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-zinc-500">Cargando configuración...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Configuración</h1>
                    <p className="text-gray-500 dark:text-zinc-400">Administra los datos de la empresa y preferencias.</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/settings/categories"
                        className="bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all border border-gray-200 dark:border-zinc-700 shadow-sm"
                    >
                        <Tag size={18} className="text-purple-600 dark:text-purple-500" />
                        Categorías
                    </Link>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* General Info */}
                <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Building size={20} className="text-cobalt-600 dark:text-cobalt-500" />
                        Datos de la Empresa
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Nombre Comercial</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-cobalt-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">URL del Logo</label>
                            <input
                                name="logo_url"
                                value={formData.logo_url}
                                onChange={handleChange}
                                placeholder="https://..."
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-cobalt-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Razón Social</label>
                            <input
                                name="legal_name"
                                value={formData.legal_name}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-cobalt-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">RUC / CUIT</label>
                            <input
                                name="tax_id"
                                value={formData.tax_id}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-cobalt-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Rubro / Actividad</label>
                            <input
                                name="activity_description"
                                value={formData.activity_description}
                                onChange={handleChange}
                                placeholder="Ej: Servicios Metalúrgicos"
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-cobalt-500 outline-none transition-colors"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Dirección</label>
                            <input
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-cobalt-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Teléfono</label>
                            <input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-cobalt-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Email</label>
                            <input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-cobalt-500 outline-none transition-colors"
                            />
                        </div>
                    </div>
                </section>

                {/* Billing Config */}
                <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Printer size={20} className="text-emerald-600 dark:text-emerald-500" />
                        Facturación e Impresión
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Timbrado Actual</label>
                            <input
                                name="current_timbrado"
                                value={formData.current_timbrado}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Inicio Vigencia</label>
                            <input
                                type="date"
                                name="timbrado_start_date"
                                value={formData.timbrado_start_date}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Vencimiento</label>
                            <input
                                type="date"
                                name="timbrado_expiration"
                                value={formData.timbrado_expiration}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Punto de Exp. (Ej: 001-001)</label>
                            <input
                                name="invoice_prefix"
                                value={formData.invoice_prefix}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Próximo Número</label>
                            <input
                                type="number"
                                name="next_invoice_number"
                                value={formData.next_invoice_number}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-8 mb-4">Calibración de Impresión (Pre-impresos)</h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4">Ajuste los márgenes en milímetros (mm) para alinear el contenido con su hoja pre-impresa.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Margen Superior (mm)</label>
                            <input
                                type="number"
                                name="print_margin_top"
                                value={formData.print_margin_top}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Margen Izquierdo (mm)</label>
                            <input
                                type="number"
                                name="print_margin_left"
                                value={formData.print_margin_left}
                                onChange={handleChange}
                                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-3 py-2 text-gray-900 dark:text-white focus:border-emerald-500 outline-none transition-colors"
                            />
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Save size={20} />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}
