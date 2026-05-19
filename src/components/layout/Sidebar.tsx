import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    LayoutDashboard,
    Wrench,
    Package,
    ShoppingCart,
    Receipt,
    Wallet,
    Users,
    Briefcase,
    BarChart,
    PieChart,
    Book,
    LogOut,
    X,
    FolderKanban,
    Settings,
    Sun,
    Moon,
    Building,
    DollarSign,
    Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../context/ThemeContext';

// Helper for conditional classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function Sidebar({ isOpen, setIsOpen, userEmail, userRole, isSuperAdmin = false }: { isOpen: boolean, setIsOpen: (v: boolean) => void, userEmail: string | null, userRole: string | null, isSuperAdmin?: boolean }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    // Role-Based Access Definition
    const canAccess = (categoryTitle: string) => {
        // 1. Special Check for SaaS Admin (Must be first)
        if (categoryTitle === 'SaaS Admin') return isSuperAdmin === true;

        if (!userRole) return false; // Safety check
        if (userRole === 'admin') return true; // generic admin access for other menus

        const title = categoryTitle;

        if (userRole === 'operario') {
            return [
                "Principal",
                "Taller y Producción",
                "Stock y Compras",
                "Soporte"
            ].includes(title);
        }

        if (userRole === 'administrativo') {
            return [
                "Principal",
                "Administración",
                "Datos Maestros",
                "Soporte",
                "Inteligencia" // Maybe?
            ].includes(title);
        }

        return false;
    };


    const categories = [
        {
            title: "SaaS Admin",
            items: [
                { name: 'Visión General', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Planes y Licencias', href: '/admin/plans', icon: Receipt },
                { name: 'Cuentas Bancarias', href: '/admin/bank-accounts', icon: Wallet }
            ]
        },
        {
            title: "Principal",
            items: [
                { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            ]
        },
        {
            title: "Administración",
            items: [
                { name: 'Venta Rápida', href: '/finance/quick-sale', icon: Zap },
                { name: 'Caja', href: '/finance/cashflow', icon: Wallet },
                { name: 'Cuentas a Cobrar', href: '/finance/receivable', icon: DollarSign },
                { name: 'Facturación', href: '/finance/billing', icon: Receipt },
                { name: 'Sueldos', href: '/finance/payroll', icon: Briefcase },
            ]
        },
        {
            title: "Taller y Producción",
            items: [
                { name: 'Nueva Orden (OS)', href: '/operations/new-os', icon: Wrench },
                { name: 'Tablero de Control', href: '/operations/dashboard', icon: FolderKanban },
                { name: 'Maquinaria', href: '/operations/machinery', icon: Settings },
            ]
        },
        {
            title: "Stock y Compras",
            items: [
                { name: 'Inventario', href: '/inventory', icon: Package },
                { name: 'Compras / Reposición', href: '/inventory/purchases', icon: ShoppingCart },
            ]
        },
        {
            title: "Datos Maestros",
            items: [
                { name: 'Clientes', href: '/master-data/clients', icon: Users },
                { name: 'Proveedores', href: '/master-data/providers', icon: Users },
                { name: 'Funcionarios', href: '/hr/employees', icon: Users },
                { name: 'Roles y Permisos', href: '/master-data/roles', icon: Users },
            ]
        },
        {
            title: 'Inteligencia',
            items: [
                { name: 'Reportes de Gestión', href: '/analytics/reports', icon: BarChart },
                { name: 'Rentabilidad', href: '/analytics/profitability', icon: PieChart },
            ]
        },
        {
            title: "Configuración",
            items: [
                { name: 'Empresa', href: '/settings', icon: Building }, // New
                { name: 'Mi Plan', href: '/settings/subscription', icon: Receipt }, // Changed icon to Receipt or keep Settings
            ]
        },
        {
            title: "Soporte",
            items: [
                { name: 'Centro de Ayuda', href: '/help/center', icon: Book },
            ]
        }
    ];

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm",
                    isOpen ? "block" : "hidden"
                )}
                onClick={() => setIsOpen(false)}
            />

            <aside
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col border-r transform transition-transform duration-200 ease-in-out lg:transform-none",
                    "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo Area */}
                <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded bg-cobalt-600 flex items-center justify-center text-white shadow-lg shadow-cobalt-900/20">
                            <span className="material-symbols-outlined fill text-xl">precision_manufacturing</span>
                        </div>
                        <h1 className="text-sm font-bold tracking-widest uppercase text-gray-900 dark:text-white">
                            MetalSaaS
                            <span className="ml-2 text-[8px] bg-blue-500 text-white px-1 rounded">{userRole}</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="ml-auto lg:hidden text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
                    {categories.filter(cat => canAccess(cat.title)).map((cat, idx) => (
                        <div key={idx}>
                            {cat.title && <h3 className="px-3 text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2">{cat.title}</h3>}
                            <div className="space-y-1">
                                {cat.items.map((item) => {
                                    const isActive = location.pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded transition-all group",
                                                isActive
                                                    ? "bg-cobalt-600/10 text-cobalt-600 dark:text-cobalt-400 border border-cobalt-600/20"
                                                    : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white"
                                            )}
                                        >
                                            <item.icon size={18} className={isActive ? "text-cobalt-600 dark:text-cobalt-400" : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-900 dark:group-hover:text-white"} />
                                            <span className="text-xs font-bold uppercase tracking-wide">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User Profile (Footer) */}
                <div className="p-4 border-t border-gray-200 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-zinc-800/50">
                        <Link to="/settings/profile" className="flex items-center gap-3 flex-1 min-w-0 group cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700/50 p-1.5 -ml-1.5 rounded transition-colors">
                            <div className="size-8 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white border border-gray-200 dark:border-zinc-600 shadow-sm group-hover:border-cobalt-500/50 transition-colors">
                                {userEmail?.substring(0, 2).toUpperCase() || 'US'}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs font-semibold truncate text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-cobalt-600 dark:group-hover:text-cobalt-400 transition-colors">Mi Perfil</p>
                                <p className="text-[10px] text-gray-500 dark:text-zinc-500 truncate">{userEmail}</p>
                            </div>
                        </Link>

                        <div className="flex items-center border-l border-gray-300 dark:border-zinc-700 pl-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleTheme();
                                }}
                                className="flex items-center justify-center text-gray-500 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-yellow-400 transition-colors mr-1 cursor-pointer p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
                                title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                            >
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <button onClick={handleLogout} className="flex items-center justify-center text-gray-500 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700" title="Cerrar Sesión">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside >
        </>
    );
}
