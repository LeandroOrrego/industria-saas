import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft, CheckCircle, Search, Plus, Trash2, Zap,
  ShoppingCart, User, CreditCard, Package, Printer, Wrench
} from 'lucide-react';

type Client = { id: string; name: string; tax_id: string | null };
type Product = { id: string; name: string; current_stock: number; sale_price?: number; unit: string };

interface SaleItem {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  unit: string;
  stock: number;
  isLabor?: boolean;
}

type NotificationType = 'success' | 'error' | null;

export default function QuickSale() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form header
  const [selectedClient, setSelectedClient] = useState('');
  const [saleCondition, setSaleCondition] = useState<'contado' | 'credito'>('contado');

  // Product search
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  // Labor fields
  const [laborAmount, setLaborAmount] = useState(0);
  const [laborDesc, setLaborDesc] = useState('');

  // Sale items
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Notification
  const [notification, setNotification] = useState<{ type: NotificationType; message: string }>({ type: null, message: '' });

  // Success state
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function fetchData() {
    const [{ data: cl }, { data: pr }] = await Promise.all([
      supabase.from('clients').select('id, name, tax_id'),
      supabase.from('products').select('id, name, current_stock, sale_price, unit')
    ]);
    setClients(cl || []);
    setProducts(pr || []);
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setItemPrice(product.sale_price || 0);
    setItemQty(1);
    setShowDropdown(false);
  };

  const handleAddItem = () => {
    if (!selectedProduct) return showNotification('error', 'Seleccione un producto.');
    if (itemQty <= 0) return showNotification('error', 'La cantidad debe ser mayor a 0.');
    if (itemPrice <= 0) return showNotification('error', 'El precio debe ser mayor a 0.');

    setItems(prev => [...prev, {
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      quantity: itemQty,
      unit_price: itemPrice,
      unit: selectedProduct.unit,
      stock: selectedProduct.current_stock
    }]);

    // Reset
    setSelectedProduct(null);
    setSearchTerm('');
    setItemQty(1);
    setItemPrice(0);
  };

  const handleAddLabor = () => {
    if (!laborDesc.trim()) return showNotification('error', 'Debe ingresar una descripción para el servicio.');
    if (laborAmount <= 0) return showNotification('error', 'El monto del servicio debe ser mayor a 0.');

    setItems(prev => [...prev, {
      product_id: null,
      name: laborDesc.trim(),
      quantity: 1,
      unit_price: laborAmount,
      unit: 'srv',
      stock: 0,
      isLabor: true,
    }]);

    // Reset
    setLaborAmount(0);
    setLaborDesc('');
  };

  const handleRemoveItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const total = Math.max(subtotal - discountAmount, 0);

  const formatGs = (n: number) =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(n).replace('PYG', 'Gs.');

  function showNotification(type: 'success' | 'error', message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: null, message: '' }), 4000);
  }

  const handleSubmit = async () => {
    if (!selectedClient) return showNotification('error', 'Seleccione un cliente.');
    if (items.length === 0) return showNotification('error', 'Agregue al menos un ítem.');

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      // 1. Insert invoice
      const { data: inv, error: invError } = await supabase.from('invoices').insert([{
        organization_id: profile?.organization_id,
        client_id: selectedClient,
        total_amount: total,
        status: 'issued',
        payment_method: saleCondition === 'contado' ? 'cash' : 'credit',
        due_date: new Date().toISOString(),
      }]).select().single();

      if (invError) throw invError;

      // 2. Insert invoice_lines (product_id null for labor items)
      const lines = items.map(i => ({
        invoice_id: inv.id,
        product_id: i.product_id || null,
        description: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }));
      const { error: linesError } = await supabase.from('invoice_lines').insert(lines);
      if (linesError) throw linesError;

      // 3. Conditional logic based on sale condition
      const clientName = clients.find(c => c.id === selectedClient)?.name || 'Cliente';

      if (saleCondition === 'credito') {
        // Credit: insert accounts_receivable
        const { error: arError } = await supabase.from('accounts_receivable').insert([{
          client_id: selectedClient,
          invoice_id: inv.id,
          total_amount: total,
          balance: total,
          status: 'pendiente',
        }]);
        if (arError) throw arError;
      } else {
        // Contado: insert accounts_receivable with balance 0 and status pagado
        const { error: arError } = await supabase.from('accounts_receivable').insert([{
          client_id: selectedClient,
          invoice_id: inv.id,
          total_amount: total,
          balance: 0,
          status: 'pagado',
        }]);
        if (arError) throw arError;

        // Contado: insert cash income into transactions (caja)
        const { error: txError } = await supabase.from('transactions').insert([{
          organization_id: profile?.organization_id,
          description: `Cobro Venta Mostrador - ${clientName}`,
          type: 'income',
          amount: total,
          payment_method: 'cash',
          transaction_date: new Date().toISOString().split('T')[0],
          invoice_id: inv.id,
          created_by: user?.id,
        }]);
        if (txError) throw txError;
      }

      setInvoiceId(inv.id);
      showNotification('success', '¡Venta registrada exitosamente!');
    } catch (error: any) {
      console.error(error);
      showNotification('error', `Error al facturar: ${error.message || 'Intente de nuevo.'}`);
    } finally {
      setLoading(false);
    }
  };

  // ---- Success View ----
  if (invoiceId) {
    return (
      <div className="p-6 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center text-zinc-100">
        <div className="relative">
          <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
          <CheckCircle className="text-emerald-500 mb-4 relative" size={72} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 mt-4">¡Venta Registrada!</h2>
        <p className="text-gray-500 dark:text-zinc-500 mb-8 text-center">El comprobante ha sido generado y el stock fue actualizado correctamente.</p>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
            <Printer size={20} /> Imprimir
          </button>
          <button onClick={() => { setInvoiceId(null); setItems([]); setSelectedClient(''); setDiscountAmount(0); }} className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-cobalt-900/20">
            <Zap size={20} /> Nueva Venta
          </button>
          <button onClick={() => navigate('/finance/billing')} className="bg-gray-100 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-800 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">
            Ir a Facturación
          </button>
        </div>
      </div>
    );
  }

  // ---- Main View ----
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto min-h-screen text-gray-900 dark:text-zinc-100">
      {/* Notification Toast */}
      {notification.type && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-[slideIn_0.3s_ease-out] ${
          notification.type === 'success'
            ? 'bg-emerald-600 text-white shadow-emerald-900/30'
            : 'bg-red-600 text-white shadow-red-900/30'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <span>⚠</span>}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Zap size={24} className="text-amber-500" />
            </div>
            Venta de Mostrador
          </h1>
          <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Facturación rápida sin orden de servicio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sale Header */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User size={14} /> Cabecera de Venta
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1.5">Cliente</label>
                <select
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 text-gray-900 dark:text-white focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 transition-all text-sm"
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1.5">Condición de Venta</label>
                <div className="flex gap-2">
                  {(['contado', 'credito'] as const).map(cond => (
                    <button
                      key={cond}
                      onClick={() => setSaleCondition(cond)}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 border ${
                        saleCondition === cond
                          ? cond === 'contado'
                            ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-600/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {cond === 'contado' ? <ShoppingCart size={16} /> : <CreditCard size={16} />}
                      {cond === 'contado' ? 'Contado' : 'Crédito'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Product Search */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package size={14} /> Carga Rápida de Ítems
            </h3>
            <div className="flex flex-col md:flex-row gap-3">
              {/* Product search with dropdown */}
              <div className="flex-1 relative" ref={searchRef}>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    className="w-full pl-9 pr-3 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-cobalt-500 focus:border-cobalt-500 transition-all"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); setSelectedProduct(null); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                </div>
                {showDropdown && searchTerm.length > 0 && (
                  <div className="absolute z-30 top-full mt-1 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 dark:text-zinc-500 text-center">Sin resultados.</p>
                    ) : (
                      filteredProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 last:border-0 transition-colors"
                        >
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{p.name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            p.current_stock > 0
                              ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            Stock: {p.current_stock} {p.unit}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="w-24">
                <input
                  type="number"
                  min={1}
                  placeholder="Cant."
                  className="w-full py-3 px-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm text-right focus:ring-1 focus:ring-cobalt-500 transition-all"
                  value={itemQty}
                  onChange={e => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div className="w-36 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 text-xs font-bold">Gs.</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Precio"
                  className="w-full py-3 pl-9 pr-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm text-right focus:ring-1 focus:ring-cobalt-500 transition-all"
                  value={itemPrice || ''}
                  onChange={e => setItemPrice(parseInt(e.target.value) || 0)}
                />
              </div>

              <button
                onClick={handleAddItem}
                className="bg-cobalt-600 hover:bg-cobalt-500 text-white px-5 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-cobalt-900/20 whitespace-nowrap"
              >
                <Plus size={18} /> Agregar
              </button>
            </div>

            {/* Quick Service */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
              <h4 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Wrench size={14} /> Agregar Servicio Rápido
              </h4>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Descripción (ej: Servicio de Soldadura, Tornería...)"
                  className="flex-1 py-3 px-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-cobalt-500 transition-all"
                  value={laborDesc}
                  onChange={e => setLaborDesc(e.target.value)}
                />
                <div className="w-40 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 text-xs font-bold">Gs.</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Monto"
                    className="w-full py-3 pl-9 pr-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm text-right focus:ring-1 focus:ring-cobalt-500 transition-all"
                    value={laborAmount || ''}
                    onChange={e => setLaborAmount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <button
                  onClick={handleAddLabor}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-900/20 whitespace-nowrap"
                >
                  <Wrench size={16} /> Agregar Servicio
                </button>
              </div>
            </div>
          </div>

          {/* Sale Grid */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart size={14} /> Detalle de Venta
              </h3>
              <span className="text-xs text-gray-500 dark:text-zinc-500 font-mono">{items.length} ítem(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-500 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-5 py-3">Producto</th>
                    <th className="px-5 py-3 text-right">Cant.</th>
                    <th className="px-5 py-3 text-right">Precio Unit.</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                    <th className="px-5 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-400 dark:text-zinc-600">
                        <Package size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Agregue productos para comenzar la venta.</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                            {item.isLabor && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">M.O.</span>
                            )}
                          </div>
                          {item.isLabor
                            ? <p className="text-xs text-gray-400 dark:text-zinc-500">Servicio</p>
                            : <p className="text-xs text-gray-400 dark:text-zinc-500">Stock: {item.stock} {item.unit}</p>
                          }
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-zinc-300">{item.quantity}</td>
                        <td className="px-5 py-3 text-right font-mono text-gray-700 dark:text-zinc-300">{formatGs(item.unit_price)}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-gray-900 dark:text-white">{formatGs(item.quantity * item.unit_price)}</td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-gray-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Totals Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm sticky top-6 space-y-5">
            <h3 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Resumen</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-zinc-400">Subtotal</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{formatGs(subtotal)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1.5">Descuento (Gs.)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full py-2.5 px-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm text-right font-mono focus:ring-1 focus:ring-cobalt-500 transition-all"
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-500">Descuento</span>
                  <span className="font-mono font-bold text-red-500">-{formatGs(discountAmount)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-zinc-800 pt-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase">Total a Pagar</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{formatGs(total)}</span>
                </div>
              </div>
            </div>

            {saleCondition === 'credito' && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠ Esta venta se registrará como <strong>cuenta a cobrar</strong> pendiente.
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || items.length === 0}
              className="w-full bg-cobalt-600 hover:bg-cobalt-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cobalt-900/20 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Procesando...
                </span>
              ) : (
                <><CheckCircle size={18} /> Confirmar y Facturar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
