import React from 'react';
import { HelpCircle, MessageSquare, Book, Phone } from 'lucide-react';

export default function HelpCenter() {
    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-zinc-100 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Centro de Ayuda</h1>
            <p className="text-zinc-400 mb-10">¿Cómo podemos ayudarte hoy?</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:border-cobalt-500/50 transition-colors cursor-pointer group">
                    <Book className="size-10 text-cobalt-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-white text-lg mb-2">Documentación</h3>
                    <p className="text-sm text-zinc-400">Guías paso a paso para configurar tu cuenta y usar el sistema.</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:border-emerald-500/50 transition-colors cursor-pointer group">
                    <MessageSquare className="size-10 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-white text-lg mb-2">Chat de Soporte</h3>
                    <p className="text-sm text-zinc-400">Habla con nuestro equipo técnico en tiempo real.</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:border-purple-500/50 transition-colors cursor-pointer group">
                    <Phone className="size-10 text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-white text-lg mb-2">Línea Directa</h3>
                    <p className="text-sm text-zinc-400">Soporte telefónico prioritario para urgencias.</p>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Preguntas Frecuentes</h2>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                    <h4 className="font-bold text-white mb-2">¿Cómo crear un nuevo usuario?</h4>
                    <p className="text-sm text-zinc-400">Ve a Datos Maestros > Roles y haz clic en "Nuevo Usuario". Asegúrate de tener los permisos de administrador.</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                    <h4 className="font-bold text-white mb-2">¿Cómo imprimo una factura?</h4>
                    <p className="text-sm text-zinc-400">Al finalizar la creación de una factura, verás un botón de "Imprimir". También puedes ir al historial y descargar el PDF.</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
                    <h4 className="font-bold text-white mb-2">¿Cómo ajusto el stock manualmente?</h4>
                    <p className="text-sm text-zinc-400">En Inventario, usa el botón "Ajustar" en la fila del producto deseado. Selecciona si es entrada o salida y agrega una nota.</p>
                </div>
            </div>
        </div>
    );
}
