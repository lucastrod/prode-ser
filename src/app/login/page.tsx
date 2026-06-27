'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isVerified = searchParams.get('verified');
    const hasError = searchParams.get('error');

    if (isVerified === 'true') {
      setSuccess('¡Cuenta verificada y activada con éxito! Ya puedes iniciar sesión.');
    } else if (hasError) {
      if (hasError === 'token_invalid') {
        setError('El enlace de verificación es inválido o ya expiró.');
      } else if (hasError === 'token_missing') {
        setError('Falta el token de verificación.');
      } else if (hasError === 'server_error') {
        setError('Ocurrió un error en el servidor al intentar verificar tu cuenta.');
      } else {
        setError(decodeURIComponent(hasError));
      }
    }
  }, [searchParams]);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Credenciales inválidas.');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0B0F19] px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 sya-glass p-8 sm:p-10 relative overflow-hidden animate-slide-up border-t-6 border-[#1B199A]">
        
        {/* Decorative corner element */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#1B199A]/10 rounded-bl-full flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-[#1B199A] animate-pulse" />
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img src="/logos/LOGO SER.png" alt="Logo SER" className="h-24 w-auto object-contain mb-4" />
          <h2 className="text-3xl font-extrabold font-serif bg-gradient-to-r from-[#1B199A] to-[#4b3be2] bg-clip-text text-transparent">
            PRODE SER
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-semibold tracking-wider uppercase text-center">
            Torneo de Pronósticos
          </p>
        </div>

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm font-semibold animate-fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-2xl flex items-center gap-2.5 text-sm font-semibold animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <User className="w-5 h-5" />
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

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Contraseña</label>
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
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1B199A] text-white font-bold rounded-full shadow-lg hover:bg-[#342ede] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Ingresar'
              )}
            </button>
          </div>

          <div className="text-center mt-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">¿No tienes cuenta? </span>
            <Link href="/register" className="text-xs font-bold text-[#1B199A] hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </form>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0B0F19] text-gray-500 font-medium">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
