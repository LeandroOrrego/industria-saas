import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, Shield, Zap, Star, Loader2, Copy } from 'lucide-react';

type Plan = {
    id: string;
    name: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    features: string[];
};

type Subscription = {
    id: string;
    status: string;
    plan_id: string;
    payment_status: string;
    end_date: string;
    plan?: Plan;
};

export default function Subscription() {
    const [loading, setLoading] = useState(true);
    const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]); // New state
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    // Error State
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Modal State
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [confirmingPayment, setConfirmingPayment] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        setErrorMsg(null);
        try {
            console.log("Loading subscription data start...");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { console.error("No user found"); return; }
            console.log("User found:", user.id);

            // Get Organization ID
            const { data: profile, error: profileError } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            if (profileError) console.error("Profile Error:", profileError);

            if (!profile?.organization_id) {
                console.error("No organization found for user");
                setErrorMsg("No se encontró una organización asociada a tu usuario.");
                return;
            }
            console.log("Org found:", profile.organization_id);

            // 1. Fetch Plans (Always)
            console.log("Fetching plans...");
            const { data: plans, error: plansError } = await supabase
                .from('plans')
                .select('*')
                .eq('is_active', true)
                .order('price_monthly', { ascending: true });

            if (plansError) {
                console.error('Error fetching plans:', plansError);
                setErrorMsg("Error al cargar planes: " + plansError.message);
            }
            if (plans) {
                console.log("Plans loaded:", plans.length);
                setAvailablePlans(plans);
            }

            // 1b. Fetch Active Bank Accounts
            const { data: banks } = await supabase
                .from('saas_bank_accounts')
                .select('*')
                .eq('is_active', true);

            setBankAccounts(banks || []);

            // 2. Fetch Subscription (Don't crash if missing)
            console.log("Fetching subscription...");
            const { data: sub, error: subError } = await supabase
                .from('subscriptions')
                .select('*, plan:plans(*)')
                .eq('organization_id', profile.organization_id)
                .maybeSingle();

            if (subError) {
                console.error('Error fetching subscription:', subError);
                // Don't block UI for this, but log it
            }
            if (sub) {
                console.log("Subscription found:", sub.id);
                setCurrentSubscription(sub);
            } else {
                console.log("No active subscription found (this is normal for new users).");
            }

        } catch (error: any) {
            console.error('CRITICAL ERROR loading data:', error);
            setErrorMsg("Error crítico: " + (error.message || error));
        } finally {
            setLoading(false);
        }
    }

    const handleSelectPlan = (plan: Plan) => {
        setSelectedPlan(plan);
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedPlan) return;
        setConfirmingPayment(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user?.id).single();

            if (!profile?.organization_id) throw new Error("No organization found");

            const price = billingCycle === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly;

            // Upsert Subscription
            const { error } = await supabase.from('subscriptions').upsert({
                organization_id: profile.organization_id,
                plan_id: selectedPlan.id,
                status: 'active', // Allowed to use while pending
                payment_status: 'pending',
                billing_cycle: billingCycle,
                amount: price,
                start_date: new Date().toISOString(),
                // end_date calculated by trigger or backend ideally, logic for now:
                end_date: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: 'organization_id' });

            if (error) throw error;

            alert('¡Solicitud enviada! Tu plan está activo. Por favor realiza la transferencia para evitar bloqueos.');
            setShowPaymentModal(false);
            loadData();

        } catch (error) {
            alert('Error al procesar: ' + (error as Error).message);
        } finally {
            setConfirmingPayment(false);
        }
    };

    if (loading) return <div className="p-8 text-gray-500 dark:text-zinc-500">Cargando suscripción...</div>;

    if (errorMsg) return (
        <div className="p-8 text-red-500 border border-red-500/20 bg-red-500/10 rounded-lg m-4">
            <h3 className="font-bold text-lg mb-2">Error</h3>
            <p>{errorMsg}</p>
            <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">Reintentar</button>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Suscripción</h1>
                    <p className="text-gray-500 dark:text-zinc-400">Gestiona tu plan y facturación.</p>
                </div>

                {/* Billing Toggle */}
                <div className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg flex items-center gap-1">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Anual <span className="text-[10px] text-green-600 dark:text-green-500 ml-1 font-bold">-20%</span>
                    </button>
                </div>
            </div>

            {/* Current Plan Status */}
            {currentSubscription && (
                <div className="bg-white dark:bg-gradient-to-r dark:from-zinc-900 dark:to-zinc-800 rounded-xl p-6 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-cobalt-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <p className="text-gray-500 dark:text-zinc-400 text-xs uppercase tracking-widest font-bold mb-1">Plan Actual</p>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{currentSubscription.plan?.name || 'Gratuito'}</h2>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${currentSubscription.status === 'active' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'}`}>
                                    {currentSubscription.status === 'active' ? 'Activo' : 'Pendiente'}
                                </span>
                                {currentSubscription.payment_status === 'pending' && (
                                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 animate-pulse">
                                        Pago Pendiente
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-500 dark:text-zinc-400 text-xs">Renovación</p>
                            <p className="font-mono text-lg text-gray-900 dark:text-white">{new Date(currentSubscription.end_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map(plan => {
                    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                    const isCurrent = currentSubscription?.plan_id === plan.id;

                    return (
                        <div key={plan.id} className={`bg-white dark:bg-zinc-900 border ${isCurrent ? 'border-cobalt-500 ring-1 ring-cobalt-500/50' : 'border-gray-200 dark:border-zinc-800'} rounded-2xl p-6 flex flex-col gap-4 hover:border-cobalt-500/50 transition-all shadow-sm`}>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-zinc-400 min-h-[40px]">{plan.description}</p>
                            </div>

                            <div className="flex items-baseline gap-1 my-2">
                                <span className="text-4xl font-black text-gray-900 dark:text-white">
                                    {new Intl.NumberFormat('es-PY', { style: 'currency', currency: plan.currency, maximumFractionDigits: 0 }).format(price)}
                                </span>
                                <span className="text-gray-500 text-sm">/{billingCycle === 'monthly' ? 'mes' : 'año'}</span>
                            </div>

                            <ul className="space-y-3 flex-1">
                                {plan.features?.map((feature, idx) => (
                                    <li key={idx} className="flex gap-3 text-sm text-gray-600 dark:text-zinc-300">
                                        <Check size={16} className="text-cobalt-600 dark:text-cobalt-500 mt-0.5 shrink-0" />
                                        <span className="leading-tight">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSelectPlan(plan)}
                                disabled={isCurrent}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-all shadow-lg ${isCurrent
                                    ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                                    : 'bg-cobalt-600 hover:bg-cobalt-500 text-white hover:scale-[1.02] shadow-cobalt-900/20'
                                    }`}
                            >
                                {isCurrent ? 'Plan Actual' : 'Seleccionar Plan'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
                        <div className="p-6 bg-cobalt-600 text-white">
                            <h3 className="text-lg font-bold">Confirma tu Suscripción</h3>
                            <p className="text-cobalt-100 text-sm mt-1">Has elegido el plan <strong className="text-white">{selectedPlan.name}</strong>.</p>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Summary */}
                            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                                <span className="text-gray-600 dark:text-zinc-400 text-sm">Total a pagar ({billingCycle === 'monthly' ? 'Mensual' : 'Anual'})</span>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">
                                    {new Intl.NumberFormat('es-PY', { style: 'currency', currency: selectedPlan.currency, maximumFractionDigits: 0 }).format(billingCycle === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly)}
                                </span>
                            </div>

                            {/* Bank Details */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos para Transferencia</label>

                                {bankAccounts.length === 0 ? (
                                    <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/30 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
                                        No hay cuentas bancarias configuradas. Por favor contacta a soporte.
                                    </div>
                                ) : (
                                    bankAccounts.map((account: any) => (
                                        <div key={account.id} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-lg space-y-2 bg-white dark:bg-zinc-950 mb-2 last:mb-0">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Banco:</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">{account.bank_name}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Titular:</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">{account.account_holder}</span>
                                            </div>
                                            <div className="flex justify-between text-sm items-center">
                                                <span className="text-gray-500">Cuenta Nº:</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-semibold text-gray-900 dark:text-white">{account.account_number}</span>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(account.account_number)}
                                                        className="text-cobalt-600 dark:text-cobalt-500 hover:text-cobalt-700 dark:hover:text-cobalt-600"
                                                        title="Copiar"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {account.ruc_document && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">RUC / Doc:</span>
                                                    <span className="font-semibold text-gray-900 dark:text-white">{account.ruc_document}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <p className="text-xs text-gray-500 text-center leading-relaxed">
                                Al confirmar, tu plan se activará inmediatamente. <br />
                                Por favor envía el comprobante a <strong className="text-gray-700 dark:text-zinc-300">pagos@metalsaas.com</strong> para validar la transacción.
                            </p>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 py-3 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmPayment}
                                    disabled={confirmingPayment}
                                    className="flex-1 py-3 bg-cobalt-600 hover:bg-cobalt-500 text-white rounded-lg font-bold shadow-lg shadow-cobalt-900/20 disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {confirmingPayment && <Loader2 className="animate-spin" size={18} />}
                                    {confirmingPayment ? 'Procesando...' : 'Confirmar Transferencia'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
