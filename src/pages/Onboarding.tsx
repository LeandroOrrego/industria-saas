import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Helper to get default sectors based on industry
const getAllSuggestions = (industry: string) => {
    switch (industry) {
        case 'metalurgica':
        case 'torneria':
        case 'herreria':
            return ['Corte', 'Soldadura', 'Mecanizado', 'Pintura', 'Montaje', 'Calidad', 'Oficina Técnica', 'Expedición', 'Mantenimiento'];
        case 'automotriz':
            return ['Mecánica', 'Chapa y Pintura', 'Electricidad', 'Diagnóstico', 'Lavado', 'Repuestos', 'Recepción', 'Administración'];
        case 'textil':
            return ['Corte', 'Costura', 'Estampado', 'Planchado', 'Empaque', 'Diseño', 'Control de Calidad'];
        case 'muebleria':
            return ['Corte de Madera', 'Lijado', 'Ensamblaje', 'Barnizado', 'Tapicería', 'Lustre', 'Empaque'];
        default:
            return ['Producción', 'Depósito', 'Mantenimiento', 'Administración', 'Ventas', 'Logística', 'Compras'];
    }
};

export default function Onboarding() {
    const navigate = useNavigate();

    // Global State
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Step 1 State: Company
    const [companyName, setCompanyName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [industry, setIndustry] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Step 2 State: Sectors
    const [sectors, setSectors] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [newSector, setNewSector] = useState('');

    // Step 3 State: Team
    const [teamEmails, setTeamEmails] = useState<string[]>(['']);

    useEffect(() => {
        // Fetch current organization on load
        async function fetchOrg() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (profile?.organization_id) {
                setOrgId(profile.organization_id);
                const { data: org } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
                if (org) {
                    if (org.name && org.name !== 'Organización Demo') setCompanyName(org.name);
                    if (org.tax_id) setTaxId(org.tax_id);
                    if (org.industry) setIndustry(org.industry);
                    if (org.address) setAddress(org.address);
                    if (org.phone) setPhone(org.phone);
                }
            }
        }
        fetchOrg();
    }, []);

    // Initialize suggestions when industry changes or step 2 is reached
    useEffect(() => {
        if (industry) {
            const allSuggestions = getAllSuggestions(industry);
            // Filter out already selected sectors from suggestions
            setSuggestions(allSuggestions.filter(s => !sectors.includes(s)));
        }
    }, [step, industry, sectors]);

    // Handle Logo Selection
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    // --- STEP 1 HANDLER: Company ---
    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            if (orgId) {
                // UPDATE
                const { error } = await supabase
                    .from('organizations')
                    .update({
                        name: companyName,
                        tax_id: taxId,
                        industry: industry,
                        address: address,
                        phone: phone
                    })
                    .eq('id', orgId);
                if (error) throw error;
            } else {
                // CREATE (RPC)
                const { data: newOrg, error: createError } = await supabase.rpc('create_organization_for_user', {
                    org_name: companyName,
                    org_tax_id: taxId,
                    org_industry: industry,
                    org_address: address,
                    org_phone: phone
                });

                if (createError) throw createError;
                setOrgId(newOrg.id);
            }

            setStep(2);
        } catch (error) {
            console.error('Error saving org:', error);
            // alert('Error al guardar los datos: ' + (error as Error).message);
            alert(`Error detallado: ${JSON.stringify(error, null, 2)} \n\n Mensaje: ${(error as any).message || 'Sin mensaje'}`);
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 2 HANDLER: Sectors ---
    const addSector = (name: string) => {
        const trimmed = name.trim();
        if (trimmed && !sectors.includes(trimmed)) {
            setSectors([...sectors, trimmed]);
            setNewSector('');
        }
    };

    const removeSector = (name: string) => {
        setSectors(sectors.filter(s => s !== name));
    };

    const handleStep2Submit = async () => {
        setLoading(true);
        try {
            if (!orgId) throw new Error("No Organization ID found");

            // USE RPC FOR SECURE INSERT
            if (sectors.length > 0) {
                const { error } = await supabase.rpc('add_organization_sectors', {
                    sector_names: sectors
                });
                if (error) throw error;
            }

            setStep(3);
        } catch (error) {
            console.error('Error saving sectors:', error);
            alert('Error al guardar sectores: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 3 HANDLER: Team ---
    const updateEmail = (index: number, value: string) => {
        const newEmails = [...teamEmails];
        newEmails[index] = value;
        setTeamEmails(newEmails);
    };

    const addEmailField = () => {
        setTeamEmails([...teamEmails, '']);
    };

    const handleStep3Submit = async () => {
        setLoading(true);
        try {
            if (!orgId) throw new Error("No Organization ID found");

            const validEmails = teamEmails.filter(email => email.includes('@') && email.includes('.'));

            if (validEmails.length > 0) {
                const invitationsToInsert = validEmails.map(email => ({
                    organization_id: orgId,
                    email: email,
                    role: 'operario', // default role
                    status: 'pending' // need to cast or ensure matches DB enum/text
                }));

                // Intentionally using 'any' status string here to match DB text column if enum not strict yet
                const { error } = await supabase.from('organization_invitations').insert(invitationsToInsert);

                if (error) {
                    // Ignore duplicates
                    if (error.code !== '23505') throw error;
                }
            }

            navigate('/');
        } catch (error) {
            console.error('Error saving invitations:', error);
            alert('Error al enviar invitaciones: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            {/* Header */}
            <header className="w-full border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">factory</span>
                        </div>
                        <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">SaaS Industrial</h2>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <main className="flex-grow flex flex-col items-center justify-start pt-8 pb-12 px-4 sm:px-6">
                <div className="w-full max-w-3xl flex flex-col gap-6">
                    {/* Stepper (Restored Design) */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end mb-2">
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                                {step === 1 && "Datos de la empresa"}
                                {step === 2 && "Sectores de planta"}
                                {step === 3 && "Invita a tu equipo"}
                            </h1>
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-primary mb-1">Paso {step} de 3</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {step === 1 && "33%"}
                                    {step === 2 && "66%"}
                                    {step === 3 && "100%"}
                                    {" completado"}
                                </span>
                            </div>
                        </div>
                        {/* Progress Bar Track */}
                        <div className="h-2 w-full bg-slate-200 dark:bg-border-dark rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}></div>
                        </div>
                        {/* Steps Text Indicators */}
                        <div className="flex justify-between text-xs mt-1 text-slate-400 dark:text-slate-500 font-medium px-1">
                            <span className={step >= 1 ? "text-primary font-bold" : ""}>1. Empresa</span>
                            <span className={step >= 2 ? "text-primary font-bold" : ""}>2. Sectores</span>
                            <span className={step >= 3 ? "text-primary font-bold" : ""}>3. Equipo</span>
                        </div>
                    </div>

                    {/* Card */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-xl p-6 sm:p-10">

                        {/* STEP 1 */}
                        {step === 1 && (
                            <form className="flex flex-col gap-6" onSubmit={handleStep1Submit}>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nombre de la empresa *</label>
                                        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-[#111418] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all" required />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">CI / RUC *</label>
                                            <input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-[#111418] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all" required />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Industria</label>
                                            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-[#111418] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all" required>
                                                <option disabled value="">Selecciona...</option>
                                                <option value="metalurgica">Metalúrgica</option>
                                                <option value="torneria">Tornería</option>
                                                <option value="herreria">Herrería</option>
                                                <option value="muebleria">Mueblería</option>
                                                <option value="automotriz">Automotriz</option>
                                                <option value="textil">Textil</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dirección</label>
                                        <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-[#111418] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all" required />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Teléfono</label>
                                        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-lg border bg-slate-50 dark:bg-[#111418] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:outline-none transition-all" type="tel" />
                                    </div>

                                    {/* Logo Upload */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Logo de la empresa <span className="text-slate-400 font-normal ml-1">(Opcional)</span></label>
                                        <div className="flex items-center justify-center w-full">
                                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-[#111418] hover:bg-slate-100 dark:hover:bg-[#161b22] transition-colors relative overflow-hidden group">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Logo Preview" className="h-full object-contain" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <span className="material-symbols-outlined text-3xl text-slate-400 mb-2 group-hover:text-primary transition-colors">cloud_upload</span>
                                                        <p className="mb-1 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold">Clic para subir imagen</span></p>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button type="submit" disabled={loading} className="px-8 py-2.5 bg-primary hover:bg-primary-hover rounded-lg text-white font-bold transition-all shadow-lg shadow-primary/20">
                                        {loading ? 'Guardando...' : 'Siguiente Paso'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Selecciona tus sectores</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Elige de la lista sugerida o crea nuevos.</p>
                                </div>

                                {/* Selection Area */}
                                <div className="flex flex-col gap-4 bg-slate-50 dark:bg-[#111418] p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mis Sectores (Activos)</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {sectors.map((s) => (
                                            <button key={s} onClick={() => removeSector(s)} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center gap-2 group">
                                                {s}
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        ))}
                                        {sectors.length === 0 && <span className="text-slate-400 text-sm italic">Ningún sector seleccionado</span>}
                                    </div>
                                </div>

                                {/* Suggestions Area */}
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sugerencias (Clic para agregar)</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestions.map((s) => (
                                            <button key={s} onClick={() => addSector(s)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium hover:bg-primary hover:text-white hover:border-primary transition-colors">
                                                + {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Input */}
                                <div className="flex gap-2 mt-2">
                                    <input
                                        value={newSector}
                                        onChange={(e) => setNewSector(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addSector(newSector)}
                                        placeholder="Agregar otro sector..."
                                        className="flex-1 px-4 py-2 rounded-lg border bg-white dark:bg-[#161b22] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                    <button onClick={() => addSector(newSector)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors font-medium">Agregar</button>
                                </div>

                                <div className="flex justify-between pt-4 border-t border-border-light dark:border-border-dark mt-4">
                                    <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium">Atrás</button>
                                    <button onClick={handleStep2Submit} disabled={loading} className="px-8 py-2.5 bg-primary hover:bg-primary-hover rounded-lg text-white font-bold transition-all shadow-lg shadow-primary/20">
                                        {loading ? 'Guardando...' : 'Siguiente Paso'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Invita a tu equipo</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Agrega los correos de tus colaboradores.</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {teamEmails.map((email, idx) => (
                                        <div key={idx} className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none text-[20px]">mail</span>
                                            <input value={email} onChange={(e) => updateEmail(idx, e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-lg border bg-slate-50 dark:bg-[#111418] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="correo@empresa.com" />
                                        </div>
                                    ))}
                                    <button onClick={addEmailField} className="text-primary text-sm font-bold text-left hover:underline flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">add</span> Agregar otro
                                    </button>
                                </div>
                                <div className="flex justify-between pt-4 border-t border-border-light dark:border-border-dark mt-4">
                                    <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium">Atrás</button>
                                    <button onClick={handleStep3Submit} disabled={loading} className="px-8 py-2.5 bg-primary hover:bg-primary-hover rounded-lg text-white font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                                        {loading ? 'Finalizando...' : 'Finalizar y Entrar'}
                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
