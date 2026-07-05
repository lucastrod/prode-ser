'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Lock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Enlace inválido o incompleto. Asegurate de copiar el enlace entero del correo.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password || !confirmPassword) {
      setError('Por favor, completa ambos campos.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'No se pudo restablecer la contraseña.');
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
            Nueva Contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-semibold text-center">
            Establecé tu nueva clave de acceso
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
              <h3 className="font-bold text-lg">¡Contraseña cambiada!</h3>
              <p className="text-sm">
                Ya podés iniciar sesión con tu nueva contraseña.
              </p>
            </div>
            <Link 
              href="/login" 
              className="w-full py-3.5 bg-[#1B199A] text-white font-bold rounded-full shadow-lg hover:bg-[#342ede] transition-all flex items-center justify-center gap-2"
            >
              Ir a Iniciar Sesión <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-2xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Nueva Contraseña</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1B199A]/50 focus:border-[#1B199A] font-medium text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Repetir Contraseña</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1B199A]/50 focus:border-[#1B199A] font-medium text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full py-3.5 bg-[#1B199A] text-white font-bold rounded-full shadow-lg hover:bg-[#342ede] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Guardar Contraseña'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0B0F19] text-gray-500 font-medium">Cargando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
