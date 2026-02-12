export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    organization_id: string | null
                    email: string | null
                    role: 'admin' | 'operario' | 'administrativo'
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string | null
                    email?: string | null
                    role?: 'admin' | 'operario' | 'administrativo'
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string | null
                    email?: string | null
                    role?: 'admin' | 'operario' | 'administrativo'
                    created_at?: string
                }
            }
            products: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    type: 'ferreteria' | 'material'
                    unit: 'un' | 'm' | 'm2' | 'kg'
                    conversion_factor: number
                    min_stock: number
                    current_stock: number
                    cost_price?: number // Added
                    sale_price?: number // Added
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string
                    name: string
                    type: 'ferreteria' | 'material'
                    unit: 'un' | 'm' | 'm2' | 'kg'
                    conversion_factor?: number
                    min_stock?: number
                    current_stock?: number
                    cost_price?: number
                    sale_price?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    type?: 'ferreteria' | 'material'
                    unit?: 'un' | 'm' | 'm2' | 'kg'
                    conversion_factor?: number
                    min_stock?: number
                    current_stock?: number
                    cost_price?: number
                    sale_price?: number
                    created_at?: string
                }
            }
            clients: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    tax_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string
                    name: string
                    tax_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    tax_id?: string | null
                    created_at?: string
                }
            }
            service_orders: {
                Row: {
                    id: string
                    organization_id: string
                    client_id: string
                    status: 'abierta' | 'en_proceso' | 'control_calidad' | 'finalizada' | 'facturada'
                    priority?: 'baja' | 'media' | 'alta' | 'urgente'
                    description?: string
                    delivery_date?: string
                    start_date?: string | null // Added
                    labor_cost: number // Added
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string
                    client_id: string
                    status?: 'abierta' | 'en_proceso' | 'finalizada' | 'facturada'
                    priority?: 'baja' | 'media' | 'alta' | 'urgente'
                    description?: string
                    delivery_date?: string
                    start_date?: string | null // Added
                    labor_cost?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    client_id?: string
                    status?: 'abierta' | 'en_proceso' | 'finalizada' | 'facturada'
                    priority?: 'baja' | 'media' | 'alta' | 'urgente'
                    description?: string
                    delivery_date?: string
                    labor_cost?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            service_order_items: {
                Row: {
                    id: string
                    os_id: string
                    product_id: string
                    quantity: number
                    is_billed: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    os_id: string
                    product_id: string
                    quantity: number
                    is_billed?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    os_id?: string
                    product_id?: string
                    quantity?: number
                    is_billed?: boolean
                    created_at?: string
                }
            }
            invoices: {
                Row: {
                    id: string
                    organization_id: string
                    client_id: string
                    os_id: string | null
                    total_amount: number
                    status: 'draft' | 'issued' | 'paid' | 'cancelled'
                    balance: number
                    created_at: string
                    invoice_number: string | null
                    type: string | null
                    payment_method: string | null
                    timbrado: string | null
                    due_date: string | null
                }
                Insert: {
                    id?: string
                    organization_id?: string
                    client_id: string
                    os_id?: string | null
                    total_amount?: number
                    status?: 'draft' | 'issued' | 'paid' | 'cancelled'
                    balance?: number
                    created_at?: string
                    invoice_number?: string | null
                    type?: string | null
                    payment_method?: string | null
                    timbrado?: string | null
                    due_date?: string | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    client_id?: string
                    os_id?: string | null
                    total_amount?: number
                    status?: 'draft' | 'issued' | 'paid' | 'cancelled'
                    balance?: number
                    created_at?: string
                    invoice_number?: string | null
                    type?: string | null
                    payment_method?: string | null
                    timbrado?: string | null
                    due_date?: string | null
                }
            }
            invoice_lines: {
                Row: {
                    id: string
                    invoice_id: string
                    os_item_id: string | null
                    description: string
                    quantity: number
                    unit_price: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    invoice_id: string
                    os_item_id?: string | null
                    description: string
                    quantity: number
                    unit_price: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    invoice_id?: string
                    os_item_id?: string | null
                    description?: string
                    quantity?: number
                    unit_price?: number
                    created_at?: string
                }
            }
            providers: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    identification: string | null
                    email: string | null
                    phone: string | null
                    address: string | null
                    status: 'active' | 'inactive'
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string
                    name: string
                    identification?: string | null
                    email?: string | null
                    phone?: string | null
                    address?: string | null
                    status?: 'active' | 'inactive'
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    identification?: string | null
                    email?: string | null
                    phone?: string | null
                    address?: string | null
                    status?: 'active' | 'inactive'
                    created_at?: string
                }
            }
            purchase_orders: {
                Row: {
                    id: string
                    organization_id: string
                    provider_id: string
                    status: 'draft' | 'ordered' | 'received' | 'cancelled'
                    order_date: string
                    delivery_date: string
                    total_amount: number
                    invoice_number: string | null
                    invoice_type: string | null
                    payment_method: string | null
                    description: string | null
                    notes: string | null
                    iva_5: number
                    iva_10: number
                    exempt_amount: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string
                    provider_id: string
                    status?: 'draft' | 'ordered' | 'received' | 'cancelled'
                    order_date?: string
                    delivery_date?: string
                    total_amount?: number
                    invoice_number?: string | null
                    invoice_type?: string | null
                    payment_method?: string | null
                    description?: string | null
                    notes?: string | null
                    iva_5?: number
                    iva_10?: number
                    exempt_amount?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    provider_id?: string
                    status?: 'draft' | 'ordered' | 'received' | 'cancelled'
                    order_date?: string
                    delivery_date?: string
                    total_amount?: number
                    invoice_number?: string | null
                    invoice_type?: string | null
                    payment_method?: string | null
                    description?: string | null
                    notes?: string | null
                    iva_5?: number
                    iva_10?: number
                    exempt_amount?: number
                    created_at?: string
                }
            }
            purchase_order_items: {
                Row: {
                    id: string
                    po_id: string
                    product_id: string
                    quantity: number
                    unit_price: number
                    received_quantity: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    po_id: string
                    product_id: string
                    quantity: number
                    unit_price: number
                    received_quantity?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    po_id?: string
                    product_id?: string
                    quantity?: number
                    unit_price?: number
                    received_quantity?: number
                    created_at?: string
                }
            }
            stock_movements: {
                Row: {
                    id: string
                    organization_id: string
                    product_id: string
                    type: 'in' | 'out' | 'adjustment'
                    quantity: number
                    notes: string | null
                    user_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    product_id: string
                    type: 'in' | 'out' | 'adjustment'
                    quantity: number
                    notes?: string | null
                    user_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    product_id?: string
                    type?: 'in' | 'out' | 'adjustment'
                    quantity?: number
                    notes?: string | null
                    user_id?: string
                    created_at?: string
                }
            }
            payments: {
                Row: {
                    id: string
                    invoice_id: string
                    amount: number
                    payment_date: string
                    payment_method: string
                    reference: string | null
                    notes: string | null
                    created_by: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    invoice_id: string
                    amount: number
                    payment_date?: string
                    payment_method: string
                    reference?: string | null
                    notes?: string | null
                    created_by?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    invoice_id?: string
                    amount?: number
                    payment_date?: string
                    payment_method?: string
                    reference?: string | null
                    notes?: string | null
                    created_by?: string | null
                    created_at?: string
                }
            }
        }
    }
