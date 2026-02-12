import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Tag } from 'lucide-react';

interface CategorySelectProps {
    type: 'income' | 'expense';
    value: string;
    onChange: (value: string) => void;
}

export default function CategorySelect({ type, value, onChange }: CategorySelectProps) {
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCategories() {
            setLoading(true);
            const { data } = await supabase
                .from('transaction_categories')
                .select('*')
                .eq('type', type)
                .order('name');

            if (data) {
                setCategories(data);
                // Auto-select first if no value
                if (!value && data.length > 0) {
                    // Optional: onChange(data[0].id);
                }
            }
            setLoading(false);
        }
        fetchCategories();
    }, [type]);

    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                <Tag size={12} /> Categoría
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={loading}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-cobalt-500 outline-none disabled:opacity-50"
            >
                <option value="">Seleccionar Categoría</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>
        </div>
    );
}
