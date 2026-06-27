'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, User, Mail, Lock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!name || !email || !password) {
      setError('Por favor, completa todos los campos.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ocurrió un error al registrarse.');
      } else {
        setSuccess('¡Registro exitoso! Redirigiendo...');
        // Auto redirect to home since cookie is already configured
        window.location.href = '/';
      }
    } catch (err: any) {
      setError('Error al intentar registrar. Inténtalo más tarde.');
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
          <p className="mt-2 text-base font-semibold text-gray-700 dark:text-gray-200">
            ¡Sumate al Prode!
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 font-medium">
            Creá tu cuenta y empezá a predecir
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-2xl flex items-center gap-2.5 text-sm font-semibold animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center py-4">
            <div className="bg-green-500/10 border border-green-500/30 text-green-500 p-4 rounded-2xl flex flex-col items-center gap-3 text-sm font-semibold">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <span>{success}</span>
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
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Tu nombre</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1B199A]/50 focus:border-[#1B199A] font-medium text-sm transition-all"
                    placeholder="Ej. Lucas Castro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Tu correo</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1B199A]/50 focus:border-[#1B199A] font-medium text-sm transition-all"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Elegí una contraseña</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-500/5 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1B199A]/50 focus:border-[#1B199A] font-medium text-sm transition-all"
                    placeholder="Mín. 6 caracteres"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#1B199A] text-white font-bold rounded-full shadow-lg hover:bg-[#342ede] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Registrarse</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">¿Ya tenés cuenta? </span>
              <Link href="/login" className="text-xs font-bold text-[#1B199A] hover:underline">
                Iniciá sesión acá
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
