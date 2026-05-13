import { useState } from 'react';
import { Printer, Bug, Wrench, List } from 'lucide-react';
import { numberToText } from '../utils/numberToText';

/* ─────────────────────────── Types ─────────────────────────── */

export interface InvoiceLine {
    id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate?: number; // 0 = exenta, 5, 10
}

export interface InvoiceClient {
    name?: string;
    tax_id?: string;   // RUC / CI
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
}

export interface InvoiceMachine {
    type?: string;
    brand?: string;
    model?: string;
    chassis?: string;
    year?: string | number;
}

export interface InvoiceData {
    id?: string;
    invoice_number?: string;
    created_at?: string;
    total_amount?: number;
    condition?: string;        // 'contado' | 'credito'
    payment_method?: string;
    clients?: InvoiceClient;
    lines?: InvoiceLine[];
    machine?: InvoiceMachine;  // optional machine data for "Modo Máquina"
}

interface InvoicePrinterProps {
    invoice: InvoiceData;
    lines?: InvoiceLine[];     // alternatively pass lines separately
}

/* ────────────────── Helpers ────────────────── */

const fmt = (n: number) => new Intl.NumberFormat('es-PY').format(n);

const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/* ─────────────────────── CSS Variables for positions (easy tuning) ─────────────────────── */

const POS = {
    // Header
    dateCity:       { top: '3.2cm',  left: '2.5cm' },
    dateDay:        { top: '3.2cm',  left: '11.8cm' },
    dateMonth:      { top: '3.2cm',  left: '13.5cm' },
    dateYear:       { top: '3.2cm',  left: '17cm' },

    // Client info
    clientName:     { top: '4.5cm',  left: '3cm' },
    clientRuc:      { top: '5.2cm',  left: '3cm' },
    clientAddress:  { top: '5.1cm',  left: '3cm' },
    clientPhone:    { top: '5.1cm',  left: '15.5cm' },
    clientRemision: { top: '5.9cm',  left: '5cm' },

    // Condición Venta (X marks)
    condContado:    { top: '5.9cm',  left: '16cm' },
    condCredito:    { top: '5.9cm',  left: '18.8cm' },

    // Items table
    itemsStart:     { top: '7.5cm',  left: '0.3cm' },

    // Footer
    totalLetras:    { top: '16.7cm', left: '3.5cm' },

    subtotalExent:  { top: '17.3cm', left: '13.2cm' },
    subtotalIva5:   { top: '17.3cm', left: '15.4cm' },
    subtotalIva10:  { top: '17.3cm', left: '17.5cm' },

    descuento:      { top: '17.8cm', left: '17.5cm' },
    totalNumerico:  { top: '18.8cm', left: '17.5cm' },

    liqIva5:        { top: '19.2cm', left: '5cm' },
    totalIva:       { top: '19.2cm', left: '11cm' },
    liqIva10:       { top: '19.2cm', left: '8cm' },
};

/* Column widths for items table (must add up to ~20cm) */
const COL = {
    codigo: '2.2cm',
    cant:   '1.5cm',
    desc:   '8cm',
    punit:  '2.8cm',
    exenta: '2cm',
    iva10:  '3cm',
};

const ROW_HEIGHT = '0.55cm';
const MAX_ROWS = 14; // physical rows available on the pre-printed form


/* ═══════════════════════════ COMPONENT ═══════════════════════════ */

export default function InvoicePrinter({ invoice, lines: linesProp }: InvoicePrinterProps) {
    const [debug, setDebug] = useState(false);
    const [mode, setMode] = useState<'detail' | 'machine'>('detail');

    const allLines = linesProp ?? invoice.lines ?? [];
    const date = invoice.created_at ? new Date(invoice.created_at) : new Date();
    const total = invoice.total_amount ?? 0;
    const totalWords = numberToText(total);
    const client = Array.isArray(invoice.clients) ? (invoice.clients[0] || {}) : (invoice.clients || {});

    // VAT calculations
    const sumByVat = (rate: number) =>
        allLines
            .filter(l => (l.vat_rate ?? 10) === rate)
            .reduce((s, l) => s + l.quantity * l.unit_price, 0);

    const totalExempt = sumByVat(0);
    const totalIva5   = sumByVat(5);
    const totalIva10  = sumByVat(10);

    const liqIva5  = totalIva5 > 0 ? Math.round(totalIva5 / 21) : 0;
    const liqIva10 = totalIva10 > 0 ? Math.round(totalIva10 / 11) : 0;
    const totalIva = liqIva5 + liqIva10;




    /* ──────── Render ──────── */
    return (
        <>
            {/* ═══════ Toolbar (hidden in print) ═══════ */}
            <div className="print:hidden flex flex-wrap items-center gap-3 mb-6 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">

                {/* Mode toggle */}
                <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-zinc-700">
                    <button
                        onClick={() => setMode('detail')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${
                            mode === 'detail'
                                ? 'bg-cobalt-600 text-white'
                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                    >
                        <List size={14} /> Detalle
                    </button>
                    <button
                        onClick={() => setMode('machine')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${
                            mode === 'machine'
                                ? 'bg-cobalt-600 text-white'
                                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                    >
                        <Wrench size={14} /> Máquina
                    </button>
                </div>

                {/* Debug toggle */}
                <button
                    onClick={() => setDebug(!debug)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        debug
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500 border-gray-300 dark:border-zinc-700 hover:text-gray-700 dark:hover:text-zinc-300'
                    }`}
                >
                    <Bug size={14} /> {debug ? 'Debug ON' : 'Debug'}
                </button>

                <div className="flex-1" />

                {/* Print button */}
                <button
                    onClick={() => window.print()}
                    className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-cobalt-900/20"
                >
                    <Printer size={18} /> Imprimir
                </button>
            </div>

            {/* ═══════ Print Area ═══════ */}
            <div
                className="invoice-printer-page bg-white text-black mx-auto relative overflow-hidden shadow-xl print:shadow-none"
                style={{
                    width: '21.5cm',
                    height: '21cm',
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: '11px',
                    lineHeight: '1.3',
                }}
            >
                {/* ─── Date: City ─── */}
                <div className="absolute" style={{ ...POS.dateCity, ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    Naranjal
                </div>

                {/* ─── Date: Day ─── */}
                <div className="absolute text-center" style={{ ...POS.dateDay, width: '1.5cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {date.getDate()}
                </div>

                {/* ─── Date: Month ─── */}
                <div className="absolute text-center" style={{ ...POS.dateMonth, width: '3cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {MONTHS_ES[date.getMonth()]}
                </div>

                {/* ─── Date: Year ─── */}
                <div className="absolute text-center" style={{ ...POS.dateYear, width: '2cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {date.getFullYear()}
                </div>


                {/* ─── Client: Name ─── */}
                <div className="absolute uppercase" style={{ ...POS.clientName, width: '12cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {client.name || ''}
                </div>

                {/* ─── Client: RUC ─── */}
                <div className="absolute" style={{ ...POS.clientRuc, width: '5cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {client.tax_id || ''}
                </div>

                {/* ─── Client: Address ─── */}
                <div className="absolute uppercase" style={{ ...POS.clientAddress, width: '12cm', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {client.address || client.city || ''}
                </div>

                {/* ─── Client: Phone ─── */}
                <div className="absolute" style={{ ...POS.clientPhone, width: '5cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {client.phone || ''}
                </div>

                {/* ─── Nota de Remisión ─── */}
                <div className="absolute" style={{ ...POS.clientRemision, width: '8cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {/* Placeholder for remission note */}
                </div>

                {/* ─── Condición: Contado ─── */}
                <div className="absolute font-bold text-center" style={{ ...POS.condContado, width: '1cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {(invoice.condition === 'contado' || !invoice.condition) ? 'X' : ''}
                </div>

                {/* ─── Condición: Crédito ─── */}
                <div className="absolute font-bold text-center" style={{ ...POS.condCredito, width: '1cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {invoice.condition === 'credito' ? 'X' : ''}
                </div>


                {/* ═══════════════════ BODY: Items or Machine ═══════════════════ */}
                <div className="absolute" style={{ ...POS.itemsStart, width: '20.5cm' }}>

                    {mode === 'detail' ? (
                        /* ─── Mode: Detail (line items) ─── */
                        <div>
                            {allLines.slice(0, MAX_ROWS).map((line, idx) => {
                                const subtotal = line.quantity * line.unit_price;
                                const vatRate = line.vat_rate ?? 10;

                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center"
                                        style={{
                                            height: ROW_HEIGHT,
                                            ...(debug ? { outline: '1px dashed red', background: idx % 2 === 0 ? 'rgba(255,0,0,0.03)' : 'rgba(255,0,0,0.07)' } : {}),
                                        }}
                                    >
                                        {/* Código */}
                                        <div style={{ width: COL.codigo, textAlign: 'center', flexShrink: 0 }}>
                                            {/* empty - no product code */}
                                        </div>

                                        {/* Cantidad */}
                                        <div style={{ width: COL.cant, textAlign: 'center', flexShrink: 0 }}>
                                            {line.quantity}
                                        </div>

                                        {/* Descripción */}
                                        <div style={{ width: COL.desc, paddingLeft: '2mm', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textTransform: 'uppercase', flexShrink: 0 }}>
                                            {line.description}
                                        </div>

                                        {/* Precio Unitario */}
                                        <div style={{ width: COL.punit, textAlign: 'right', paddingRight: '2mm', flexShrink: 0 }}>
                                            {fmt(line.unit_price)}
                                        </div>

                                        {/* Exentas */}
                                        <div style={{ width: COL.exenta, textAlign: 'right', paddingRight: '2mm', flexShrink: 0 }}>
                                            {vatRate === 0 ? fmt(subtotal) : ''}
                                        </div>

                                        {/* 10% */}
                                        <div style={{ width: COL.iva10, textAlign: 'right', paddingRight: '2mm', flexShrink: 0 }}>
                                            {vatRate === 10 ? fmt(subtotal) : (vatRate === 5 ? fmt(subtotal) : '')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    ) : (
                        /* ─── Mode: Machine ─── */
                        <div style={{ padding: '2mm 0 0 5mm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.04)' } : {}) }}>
                            {invoice.machine ? (
                                <div className="space-y-1 uppercase" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                    <div><strong>TIPO:</strong> {invoice.machine.type || '-'}</div>
                                    <div><strong>MARCA:</strong> {invoice.machine.brand || '-'}</div>
                                    <div><strong>MODELO:</strong> {invoice.machine.model || '-'}</div>
                                    <div><strong>CHASIS Nº:</strong> {invoice.machine.chassis || '-'}</div>
                                    <div><strong>AÑO:</strong> {invoice.machine.year || '-'}</div>
                                    <div className="mt-3">
                                        <strong>SERVICIO REALIZADO:</strong>
                                    </div>
                                    {/* Optionally list line descriptions as services */}
                                    {allLines.map((l, i) => (
                                        <div key={i} style={{ paddingLeft: '5mm' }}>
                                            - {l.description} {l.quantity > 1 ? `(x${l.quantity})` : ''}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-400 italic">
                                    Sin datos de máquina. Asigne datos de máquina a esta factura.
                                </div>
                            )}
                        </div>
                    )}
                </div>


                {/* ═══════════════════ FOOTER ═══════════════════ */}

                {/* ─── Total en Letras ─── */}
                <div className="absolute uppercase" style={{ ...POS.totalLetras, width: '14cm', fontSize: '10px', lineHeight: '1.2', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {totalWords}
                </div>

                {/* ─── Subtotal Exentas ─── */}
                <div className="absolute text-right" style={{ ...POS.subtotalExent, width: '2cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {totalExempt > 0 ? fmt(totalExempt) : ''}
                </div>

                {/* ─── Subtotal IVA 5% ─── */}
                <div className="absolute text-right" style={{ ...POS.subtotalIva5, width: '2cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {totalIva5 > 0 ? fmt(totalIva5) : ''}
                </div>

                {/* ─── Subtotal IVA 10% ─── */}
                <div className="absolute text-right" style={{ ...POS.subtotalIva10, width: '2.5cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {fmt(totalIva10 || total)}
                </div>

                {/* ─── Total Numérico ─── */}
                <div className="absolute text-right font-bold" style={{ ...POS.totalNumerico, width: '3cm', fontSize: '12px', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {fmt(total)}
                </div>

                {/* ─── Liquidación IVA 5% ─── */}
                <div className="absolute text-right" style={{ ...POS.liqIva5, width: '2.5cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {liqIva5 > 0 ? fmt(liqIva5) : '0'}
                </div>

                {/* ─── Liquidación IVA 10% ─── */}
                <div className="absolute text-right" style={{ ...POS.liqIva10, width: '2.5cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {fmt(liqIva10)}
                </div>

                {/* ─── Total IVA ─── */}
                <div className="absolute text-right" style={{ ...POS.totalIva, width: '3cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {fmt(totalIva)}
                </div>

            </div>

            {/* ═══════ Print-specific CSS ═══════ */}
            <style>{`
                @media print {
                    /* Page size for pre-printed form */
                    @page {
                        size: 21.5cm 21cm;
                        margin: 0;
                    }

                    /* Hide everything except the print area */
                    body * {
                        visibility: hidden;
                    }
                    .invoice-printer-page,
                    .invoice-printer-page * {
                        visibility: visible;
                    }
                    .invoice-printer-page {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 21.5cm !important;
                        height: 21cm !important;
                        box-shadow: none !important;
                        overflow: hidden;
                    }

                    /* Hide debug outlines in actual print */
                    .invoice-printer-page [style*="outline"] {
                        outline: none !important;
                        background: transparent !important;
                    }
                }
            `}</style>
        </>
    );
}
