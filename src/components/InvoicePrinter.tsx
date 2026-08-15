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
    layout?: typeof DEFAULT_POS;       // optional per-organization layout override
    hideVat5Column?: boolean;  // some pre-printed forms only have EXENTAS + 10%
    pageWidth?: string;
    pageHeight?: string;
}

/* ────────────────── Helpers ────────────────── */

const fmt = (n: number) => new Intl.NumberFormat('es-PY').format(n);

const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/* ─────────────────────── CSS Variables for positions (easy tuning) ─────────────────────── */

export const DEFAULT_POS = {
    // Header
    dateCity:       { top: '3.2cm',  left: '2.5cm' },
    dateDay:        { top: '3.2cm',  left: '11.8cm' },
    dateMonth:      { top: '3.2cm',  left: '13.5cm' },
    dateYear:       { top: '3.2cm',  left: '17cm' },

    // Client info
    clientName:     { top: '4.5cm',  left: '2.0cm' },
    clientRuc:      { top: '4.5cm',  left: '14.5cm' },
    clientAddress:  { top: '5.2cm',  left: '2.0cm' },
    clientPhone:    { top: '5.2cm',  left: '14.5cm' },
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



const ROW_HEIGHT = '0.55cm';
const MAX_ROWS = 14; // physical rows available on the pre-printed form


/* ═══════════════════════════ COMPONENT ═══════════════════════════ */

export default function InvoicePrinter({
    invoice,
    lines: linesProp,
    layout,
    hideVat5Column = false,
    pageWidth = '21.5cm',
    pageHeight = '21cm',
}: InvoicePrinterProps) {
    const POS = layout ?? DEFAULT_POS;
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
                    width: pageWidth,
                    height: pageHeight,
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
                                        className="relative flex items-center"
                                        style={{
                                            height: ROW_HEIGHT,
                                            ...(debug ? { outline: '1px dashed red', background: idx % 2 === 0 ? 'rgba(255,0,0,0.03)' : 'rgba(255,0,0,0.07)' } : {}),
                                        }}
                                    >
                                        {/* Cantidad */}
                                        <div className="absolute text-center" style={{ left: '1.0cm', width: '1.5cm' }}>
                                            {line.quantity}
                                        </div>

                                        {/* Descripción */}
                                        <div className="absolute overflow-hidden whitespace-nowrap text-ellipsis uppercase" style={{ left: '3.0cm', width: '10cm' }}>
                                            {line.description}
                                        </div>

                                        {/* Precio Unitario */}
                                        <div className="absolute text-right" style={{ left: '13.5cm', width: '2.5cm' }}>
                                            {fmt(line.unit_price)}
                                        </div>

                                        {/* Exentas */}
                                        <div className="absolute text-right" style={{ left: '15.5cm', width: '1.8cm' }}>
                                            {vatRate === 0 ? fmt(subtotal) : ''}
                                        </div>

                                        {/* 10% (si el form no tiene columna 5%, todo lo gravado cae acá) */}
                                        <div className="absolute text-right" style={{ left: hideVat5Column ? '17.3cm' : '17.5cm', width: '2.8cm' }}>
                                            {vatRate !== 0 ? fmt(subtotal) : ''}
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

                {/* ─── Subtotal IVA 5% (oculta en formularios sin columna 5%) ─── */}
                {!hideVat5Column && (
                    <div className="absolute text-right" style={{ ...POS.subtotalIva5, width: '2cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                        {totalIva5 > 0 ? fmt(totalIva5) : ''}
                    </div>
                )}

                {/* ─── Subtotal IVA 10% ─── */}
                <div className="absolute text-right" style={{ ...POS.subtotalIva10, width: '2.5cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {fmt(totalIva10 || total)}
                </div>

                {/* ─── Total Numérico ─── */}
                <div className="absolute text-right font-bold" style={{ ...POS.totalNumerico, width: '3cm', fontSize: '12px', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                    {fmt(total)}
                </div>

                {/* ─── Liquidación IVA 5% (oculta en formularios sin columna 5%) ─── */}
                {!hideVat5Column && (
                    <div className="absolute text-right" style={{ ...POS.liqIva5, width: '2.5cm', ...(debug ? { outline: '1px dashed red', background: 'rgba(255,0,0,0.06)' } : {}) }}>
                        {liqIva5 > 0 ? fmt(liqIva5) : '0'}
                    </div>
                )}

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
                    html, body {
                        height: ${pageHeight} !important;
                        width: ${pageWidth} !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    @page {
                        size: ${pageWidth} ${pageHeight};
                        margin: 0;
                    }

                    /* Ocultar TODO el resto de la app (sidebar, header, etc) */
                    body * {
                        visibility: hidden;
                    }

                    /* Pero mostrar nuestro documento de factura y sus hijos */
                    .invoice-printer-page,
                    .invoice-printer-page * {
                        visibility: visible;
                    }

                    .invoice-printer-page {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: ${pageWidth} !important;
                        height: ${pageHeight} !important;
                        box-shadow: none !important;
                        overflow: hidden;
                    }

                    /* Ocultar explícitamente los elementos marcados como print:hidden */
                    .print\\:hidden {
                        display: none !important;
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

// Layout calibrado para Cezemer Tornería (papel 22cm x 22cm, sin columna 5%)
export const CEZEMER_LAYOUT: typeof DEFAULT_POS = {
    dateCity:       { top: '3.2cm',  left: '2.5cm' },
    dateDay:        { top: '3.2cm',  left: '11.8cm' },
    dateMonth:      { top: '3.2cm',  left: '13.5cm' },
    dateYear:       { top: '3.2cm',  left: '17cm' },

    clientName:     { top: '4.6cm',  left: '2.5cm' },
    clientRuc:      { top: '4.6cm',  left: '15.5cm' },
    clientAddress:  { top: '5.3cm',  left: '2.5cm' },
    clientPhone:    { top: '5.3cm',  left: '15.5cm' },
    clientRemision: { top: '6.0cm',  left: '5cm' },

    condContado:    { top: '6.6cm',  left: '16.3cm' },
    condCredito:    { top: '6.6cm',  left: '19.3cm' },

    itemsStart:     { top: '7.6cm',  left: '0.3cm' },

    totalLetras:    { top: '17.6cm', left: '2.0cm' },

    subtotalExent:  { top: '18.5cm', left: '17.5cm' },
    subtotalIva5:   { top: '18.5cm', left: '17.5cm' }, // sin uso en este formulario
    subtotalIva10:  { top: '18.9cm', left: '17.5cm' },

    descuento:      { top: '19.3cm', left: '17.5cm' },
    totalNumerico:  { top: '20.1cm', left: '17.5cm' },

    liqIva5:        { top: '20.6cm', left: '5cm' },   // sin uso
    totalIva:       { top: '20.6cm', left: '11cm' },
    liqIva10:       { top: '20.6cm', left: '8cm' },
};
