import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Printer, FileText, Download, DollarSign } from 'lucide-react';
import { numberToText } from '../../utils/numberToText';
import RegisterPaymentModal from '../../components/RegisterPaymentModal';

export default function InvoiceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<any>(null);
    const [lines, setLines] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchInvoiceDetails();
        }
    }, [id]);

    async function fetchInvoiceDetails() {
        try {
            // Fetch Header + Org Settings
            const { data: invData, error: invError } = await supabase
                .from('invoices')
                .select('*, clients(*), organizations(*)') // Fetch Org Settings
                .eq('id', id)
                .single();

            if (invError) throw invError;
            setInvoice(invData);

            // Set default margins from Org Settings
            if (invData.organizations) {
                setMarginTop(invData.organizations.print_margin_top || 0);
                setMarginLeft(invData.organizations.print_margin_left || 0);
            }

            // Fetch Lines
            const { data: linesData, error: linesError } = await supabase
                .from('invoice_lines')
                .select('*')
                .eq('invoice_id', id);

            if (linesError) throw linesError;
            setLines(linesData || []);

            // Fetch Payments
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('payments')
                .select('*')
                .eq('invoice_id', id)
                .order('payment_date', { ascending: true });

            if (paymentsError) throw paymentsError;
            setPayments(paymentsData || []);

        } catch (error) {
            console.error('Error fetching invoice:', error);
            alert('Error al cargar la factura');
        } finally {
            setLoading(false);
        }
    }

    // Print Calibration State
    const [isPrePrinted, setIsPrePrinted] = useState(false);
    const [marginTop, setMarginTop] = useState(0);
    const [marginLeft, setMarginLeft] = useState(0);
    const [copyLabel, setCopyLabel] = useState('ORIGINAL');

    const handleUpdateMargins = async () => {
        if (!invoice?.organization_id) return;
        try {
            await supabase.from('organizations').update({
                print_margin_top: marginTop,
                print_margin_left: marginLeft
            }).eq('id', invoice.organization_id);
            alert('Márgenes guardados como predeterminados');
        } catch (error) {
            console.error(error);
            alert('Error al guardar márgenes');
        }
    };

    // Payment Modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const handlePaymentSuccess = () => {
        fetchInvoiceDetails(); // Refresh to update balance/status
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PY').format(amount);
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando factura...</div>;
    if (!invoice) return <div className="p-8 text-center text-zinc-500">Factura no encontrada</div>;

    // DEBUG: Re-enable numberToText
    const totalInWords = numberToText(invoice.total_amount || 0);
    // const totalInWords = 'PRUEBA (SAFE MODE)';

    return (
        <div className="p-6 max-w-5xl mx-auto bg-gray-50 dark:bg-zinc-950 min-h-screen text-gray-900 dark:text-zinc-100 font-sans print:bg-white print:text-black print:p-0">

            {/* Navbar / Controls (Hidden in Print) */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 print:hidden gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/finance/billing')} className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors">
                        <ArrowLeft size={20} /> Volver
                    </button>
                    <div className="bg-gray-50 dark:bg-zinc-950 px-3 py-1 rounded border border-gray-200 dark:border-zinc-800 flex items-center gap-2">
                        <label className="text-sm font-bold text-gray-500 dark:text-zinc-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isPrePrinted}
                                onChange={(e) => setIsPrePrinted(e.target.checked)}
                                className="mr-2"
                            />
                            Modo Pre-impreso
                        </label>
                    </div>
                </div>

                {isPrePrinted && (
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <label className="text-gray-500 dark:text-zinc-500">M. Superior (mm):</label>
                            <input
                                type="number"
                                value={marginTop}
                                onChange={(e) => setMarginTop(Number(e.target.value))}
                                className="w-16 bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-2 py-1 text-gray-900 dark:text-white text-right"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-gray-500 dark:text-zinc-500">M. Izquierdo (mm):</label>
                            <input
                                type="number"
                                value={marginLeft}
                                onChange={(e) => setMarginLeft(Number(e.target.value))}
                                className="w-16 bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded px-2 py-1 text-gray-900 dark:text-white text-right"
                            />
                        </div>
                        <button onClick={handleUpdateMargins} className="text-cobalt-600 dark:text-cobalt-400 hover:text-cobalt-700 dark:hover:text-white text-xs underline">
                            Guardar como Predet.
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {invoice?.status !== 'paid' && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                        >
                            <DollarSign size={18} /> Registrar Cobro
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-cobalt-900/20"
                    >
                        <Printer size={18} /> Imprimir
                    </button>
                </div>
            </div>

            <RegisterPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={handlePaymentSuccess}
                invoice={invoice}
            />

            {/* Copy Selector (Print only one, but allow changing label) */}
            <div className="print:hidden mb-4 flex justify-center gap-4">
                {['ORIGINAL', 'DUPLICADO', 'TRIPLICADO'].map((label) => (
                    <button
                        key={label}
                        onClick={() => setCopyLabel(label)}
                        className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${copyLabel === label
                            ? 'bg-gray-200 dark:bg-zinc-100 text-gray-900 dark:text-zinc-900 border-gray-300 dark:border-zinc-300'
                            : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-500 border-gray-200 dark:border-zinc-800 hover:text-gray-900 dark:hover:text-zinc-300'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Invoice Document Container */}
            <div
                className={`bg-white text-black mx-auto min-h-[297mm] relative shadow-xl print:shadow-none print:w-full overflow-hidden ${isPrePrinted ? 'print:border-none' : 'p-8 rounded-none'
                    }`}
                style={{
                    width: '210mm',
                    paddingTop: isPrePrinted ? `${marginTop}mm` : undefined,
                    paddingLeft: isPrePrinted ? `${marginLeft}mm` : undefined,
                }}
            >
                {!isPrePrinted ? (
                    // --- STANDARD DESIGN (Industria_65 Style) ---
                    <div className="flex flex-col h-full border-2 border-black">

                        {/* Header Section */}
                        <div className="flex border-b-2 border-black">
                            {/* Logo & Company Info (Left) */}
                            <div className="w-[65%] p-4 border-r-2 border-black flex items-start gap-4">
                                {invoice.organizations?.logo_url ? (
                                    <img src={invoice.organizations.logo_url} alt="Logo" className="h-24 w-auto object-contain" />
                                ) : (
                                    <div className="h-24 w-24 bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold border border-dashed border-gray-400">
                                        SIN LOGO
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h1 className="text-xl font-bold uppercase text-black leading-tight mb-1">{invoice.organizations?.name || 'NOMBRE EMPRESA'}</h1>
                                    <p className="text-xs font-bold text-black mb-1">{invoice.organizations?.activity_description}</p>
                                    <p className="text-xs text-black">{invoice.organizations?.address}</p>
                                    <p className="text-xs text-black font-bold mt-1">
                                        Tel: {invoice.organizations?.phone} <br />
                                        Email: {invoice.organizations?.email} <br />
                                        Web: {invoice.organizations?.website}
                                    </p>
                                </div>
                            </div>

                            {/* VAT & Invoice Info (Right) */}
                            <div className="w-[35%] p-4">
                                <p className="text-sm font-bold text-black mb-1">RUC: {invoice.organizations?.tax_id}</p>
                                <p className="text-sm font-bold text-black mb-2">Timbrado: {invoice.organizations?.current_timbrado}</p>

                                <div className="text-xs text-black mb-4 space-y-0.5">
                                    <p>Inicio Vigencia: {invoice.organizations?.timbrado_start_date ? new Date(invoice.organizations.timbrado_start_date).toLocaleDateString('es-PY') : '-'}</p>
                                    <p>Fin Vigencia: {invoice.organizations?.timbrado_expiration ? new Date(invoice.organizations.timbrado_expiration).toLocaleDateString('es-PY') : '-'}</p>
                                </div>

                                <h2 className="text-xl font-bold text-black uppercase mb-1">Factura</h2>
                                <h3 className="text-lg font-mono font-bold text-black tracking-widest">
                                    Nº {invoice.invoice_number}
                                </h3>
                                <p className="text-xs font-bold text-black mt-1 border border-black px-2 py-0.5 inline-block rounded-sm bg-gray-100">
                                    {copyLabel}
                                </p>
                            </div>
                        </div>

                        {/* Client Info Section */}
                        <div className="border-b-2 border-black p-2 text-xs">
                            <div className="grid grid-cols-[150px_1fr] gap-y-1 items-center mb-1">
                                <span className="font-bold">Fecha de Emisión:</span>
                                <span>{new Date(invoice.created_at).toLocaleString('es-PY')}</span>
                            </div>
                            <div className="grid grid-cols-[150px_1fr_150px_1fr] gap-y-1 items-center">
                                <span className="font-bold">Razón Social:</span>
                                <span className="uppercase">{invoice.clients?.name}</span>
                                <span className="font-bold">RUC / CI:</span>
                                <span>{invoice.clients?.tax_id}</span>

                                <span className="font-bold">Dirección:</span>
                                <span className="col-span-3 uppercase">{invoice.clients?.address || invoice.clients?.city || 'Sin dirección'}</span>

                                <span className="font-bold">Email:</span>
                                <span className="col-span-3">{invoice.clients?.email || '-'}</span>

                                <span className="font-bold">Condición de Venta:</span>
                                <span className="uppercase font-bold">{invoice.condition || 'CONTADO'}</span>
                                <span className="font-bold">Forma de Pago:</span>
                                <span className="uppercase">{
                                    {
                                        cash: 'Efectivo',
                                        transfer: 'Transferencia',
                                        check: 'Cheque',
                                        card: 'Tarjeta',
                                        other: 'Otro'
                                    }[invoice.payment_method as string] || invoice.payment_method || '-'
                                }</span>
                                <span className="font-bold">Teléfono:</span>
                                <span>{invoice.clients?.phone || '-'}</span>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="flex-grow">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-black text-[10px] uppercase font-bold text-center bg-gray-100">
                                        <th className="py-1 border-r border-black w-16">Código</th>
                                        <th className="py-1 border-r border-black w-12 text-center">Cant.</th>
                                        <th className="py-1 border-r border-black text-left px-2">Descripción</th>
                                        <th className="py-1 border-r border-black w-20">Precio Unit.</th>
                                        <th className="py-1 border-r border-black w-20">Exentas</th>
                                        <th className="py-1 border-r border-black w-20">5%</th>
                                        <th className="py-1 w-20">10%</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {lines.map((line, idx) => {
                                        const subtotal = line.quantity * line.unit_price;
                                        return (
                                            <tr key={idx} className="border-b border-gray-300">
                                                <td className="py-1 px-1 border-r border-black text-center font-mono text-[10px]">{idx + 1}</td>
                                                <td className="py-1 px-1 border-r border-black text-center">{line.quantity}</td>
                                                <td className="py-1 px-2 border-r border-black uppercase truncate max-w-[200px]">{line.description}</td>
                                                <td className="py-1 px-1 border-r border-black text-right font-mono">{formatCurrency(line.unit_price)}</td>
                                                <td className="py-1 px-1 border-r border-black text-right font-mono">-</td>
                                                <td className="py-1 px-1 border-r border-black text-right font-mono">-</td>
                                                <td className="py-1 px-1 text-right font-mono">{formatCurrency(subtotal)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Fill Empty Rows to maintain height if needed, or just let it expand */}
                                </tbody>
                            </table>
                        </div>

                        {/* Payments History (Standard Design) - Only if there are payments */}
                        {payments.length > 0 && (
                            <div className="mb-4 text-xs">
                                <h4 className="font-bold border-b border-black mb-1">PAGOS REALIZADOS</h4>
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="py-1">Fecha</th>
                                            <th className="py-1">Forma Pago</th>
                                            <th className="py-1">Ref.</th>
                                            <th className="py-1 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((p) => (
                                            <tr key={p.id} className="border-b border-dotted border-gray-300">
                                                <td className="py-1">{new Date(p.payment_date).toLocaleDateString('es-PY')}</td>
                                                <td className="py-1 capitalize">{p.payment_method}</td>
                                                <td className="py-1">{p.reference || '-'}</td>
                                                <td className="py-1 text-right font-mono">{formatCurrency(p.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer Totals */}
                        <div className="border-t-2 border-black text-xs">
                            {/* Subtotals Row */}
                            <div className="flex border-b border-black">
                                <div className="flex-1 p-1 font-bold text-right border-r border-black">SUBTOTALES:</div>
                                <div className="w-20 p-1 text-right border-r border-black font-mono">-</div>
                                <div className="w-20 p-1 text-right border-r border-black font-mono">-</div>
                                <div className="w-20 p-1 text-right font-mono">{formatCurrency(invoice.total_amount || 0)}</div>
                            </div>

                            {/* Total Row */}
                            <div className="flex border-b border-black">
                                <div className="flex-[3] p-1 font-bold">
                                    TOTAL A PAGAR:
                                </div>
                                <div className="flex-[1] p-1 text-right font-bold text-sm bg-gray-200">
                                    Gs. {formatCurrency(invoice.total_amount || 0)}
                                </div>
                            </div>

                            {/* Total in Words */}
                            <div className="p-2 border-b border-black font-bold uppercase">
                                SON: {totalInWords}
                            </div>

                            {/* Liquidation IVA */}
                            <div className="flex p-2 text-[10px] font-bold">
                                <span className="mr-8">LIQUIDACIÓN DEL IVA:</span>
                                <span className="mr-8">(5%) 0</span>
                                <span className="mr-8">(10%) {formatCurrency(Math.round((invoice.total_amount || 0) / 11))}</span>
                                <span>TOTAL IVA: {formatCurrency(Math.round((invoice.total_amount || 0) / 11))}</span>
                            </div>
                        </div>

                        {/* Signature Box for Credit */}
                        {invoice.condition === 'credito' && (
                            <div className="border-t-2 border-black p-4 flex justify-between items-end mt-auto min-h-[100px]">
                                <div className="text-xs space-y-4 w-1/2">
                                    <p>Debo(emos) y pagaré(mos) incondicionalmente a la orden de {invoice.organizations?.name}</p>
                                    <p>La suma de guaraníes {formatCurrency(invoice.total_amount || 0)}</p>
                                </div>
                                <div className="text-center w-1/3">
                                    <div className="border-b border-black w-full mb-1"></div>
                                    <p className="text-xs font-bold uppercase">Firma del Cliente</p>
                                    <p className="text-[10px]">{invoice.clients?.name}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // --- PRE-PRINTED MODE ---
                    <div className="relative h-full text-sm font-mono leading-relaxed" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

                        {/* Date */}
                        <div className="absolute top-[40mm] left-[130mm] w-[60mm]">
                            <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Client Info */}
                        <div className="absolute top-[55mm] left-[20mm] w-[150mm] space-y-[4mm]">
                            <div className="flex">
                                <span className="w-[20mm]"></span>
                                <span className="uppercase font-bold">{invoice.clients?.name}</span>
                            </div>
                            <div className="flex">
                                <span className="w-[20mm]"></span>
                                <span>{invoice.clients?.address}</span>
                            </div>
                            <div className="flex">
                                <span className="w-[20mm]"></span>
                                <span>{invoice.clients?.tax_id}</span>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="absolute top-[90mm] left-[10mm] w-[190mm]">
                            {lines.map((line, idx) => (
                                <div key={idx} className="flex mb-2">
                                    <div className="w-[15mm] text-center">{line.quantity}</div>
                                    <div className="w-[115mm] px-2 truncate uppercase">{line.description}</div>
                                    <div className="w-[30mm] text-right px-2">{formatCurrency(line.unit_price)}</div>
                                    <div className="w-[30mm] text-right">{formatCurrency(line.quantity * line.unit_price)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-[40mm] left-[160mm] w-[40mm] text-right font-bold">
                            {formatCurrency(invoice.total_amount || 0)}
                        </div>
                        <div className="absolute bottom-[30mm] left-[60mm] w-[40mm]">
                            {formatCurrency(Math.round((invoice.total_amount || 0) / 11))}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
