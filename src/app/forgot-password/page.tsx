'use client';

import React, { useState } from 'react';
import { Sparkles, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Por favor, ingresá tu correo electrónico.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al intentar enviar el correo.');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError('Ocurrió un error inesperado de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0B0F19] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 sya-glass p-8 sm:p-10 relative overflow-hidden animate-slide-up border-t-6 border-[#1B199A]">
        
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#1B199A]/10 rounded-bl-full flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-[#1B199A] animate-pulse" />
        </div>

        <div className="flex flex-col items-center justify-center mb-8">
          <img src="/logos/LOGO SER.png" alt="Logo SER" className="h-24 w-auto object-contain mb-4" />
          <h2 className="text-3xl font-extrabold font-serif bg-gradient-to-r from-[#1B199A] to-[#4b3be2] bg-clip-text text-transparent">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-semibold text-center">
            Ingresá tu correo y te enviaremos las instrucciones.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-2xl flex items-center gap-2.5 text-sm font-semibold animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 p-4 rounded-2xl flex flex-col items-center gap-2.5 text-center">
              <CheckCircle className="w-12 h-12 mb-2" />
              <h3 className="font-bold text-lg">Correo enviado</h3>
              <p className="text-sm">
                Si existe una cuenta asociada a ese correo, te enviaremos un enlace para cambiar tu contraseña. 
                Revisá tu bandeja de entrada (y la de spam).
              </p>
            </div>
            <Link 
              href="/login" 
              className="w-full py-3.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
            >
              Volver al Login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-2xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Correo Electrónico</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1B199A]/50 focus:border-[#1B199A] font-medium text-sm transition-all"
                    placeholder="Ej. lucas@correo.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#1B199A] text-white font-bold rounded-full shadow-lg hover:bg-[#342ede] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Enviar Enlace de Recuperación'
                )}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <Link href="/login" className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#1B199A] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
