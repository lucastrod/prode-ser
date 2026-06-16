'use client';

import React from 'react';
import { Lock, Trophy, Award, Target, HelpCircle } from 'lucide-react';

export default function KnockoutPage() {
  return (
    <div className="space-y-6 pb-12 relative min-h-[80vh]">
      
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-sya-orange pl-3">
          Fase Eliminatoria
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Seguí de cerca el fixture de eliminación directa del Mundial 2026.
        </p>
      </div>

      {/* Main Bracket Mockup (to be blurred) */}
      <div className="relative border border-gray-200 dark:border-gray-800 rounded-3xl p-6 overflow-hidden bg-white/40 dark:bg-black/20 select-none">
        
        {/* The Blurring overlay */}
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md z-10 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-6 sya-glass p-8 sm:p-10 border-t-8 border-sya-orange scale-100 animate-slide-up shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-sya-orange/10 flex items-center justify-center mx-auto text-sya-orange animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold font-serif text-gray-800 dark:text-white">
                🏆 Fase Eliminatoria
              </h2>
              <span className="inline-block px-3 py-1 bg-sya-blue/15 text-sya-blue text-xs font-bold rounded-full uppercase tracking-wider">
                Próximamente
              </span>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
              La fase eliminatoria estará disponible una vez finalizada la fase de grupos. 
              <br />
              Seguí sumando puntos y preparate para la próxima etapa.
            </p>

            <div className="h-px bg-gray-200 dark:bg-gray-800 my-4"></div>

            <div className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sya-orange" />
              <span>Las predicciones abrirán al definirse los clasificados.</span>
            </div>
          </div>
        </div>

        {/* Mocked Bracket Structure (Visual eye candy for the background) */}
        <div className="grid grid-cols-5 gap-4 opacity-15">
          {/* Round of 32 */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-center text-gray-400 border-b pb-2">16vos de Final</h3>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 border rounded-xl space-y-2 bg-gray-50 dark:bg-gray-900">
                <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>

          {/* Round of 16 */}
          <div className="space-y-12 pt-8">
            <h3 className="text-xs font-bold text-center text-gray-400 border-b pb-2">8vos de Final</h3>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-3 border rounded-xl space-y-2 bg-gray-55 dark:bg-gray-850">
                <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-16 bg-gray-205 dark:bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>

          {/* Quarter Finals */}
          <div className="space-y-24 pt-16">
            <h3 className="text-xs font-bold text-center text-gray-400 border-b pb-2">Cuartos</h3>
            <div className="p-3 border rounded-xl space-y-2 bg-gray-60 dark:bg-gray-800">
              <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-850 rounded"></div>
            </div>
          </div>

          {/* Semis */}
          <div className="space-y-48 pt-24">
            <h3 className="text-xs font-bold text-center text-gray-400 border-b pb-2">Semis</h3>
            <div className="p-3 border rounded-xl bg-sya-orange/5 border-sya-orange/20 space-y-2">
              <div className="h-4 w-20 bg-sya-orange/20 rounded"></div>
              <div className="h-4 w-16 bg-sya-orange/10 rounded"></div>
            </div>
          </div>

          {/* Final */}
          <div className="flex flex-col justify-center items-center h-full pt-16 space-y-6">
            <h3 className="text-xs font-bold text-center text-sya-orange border-b border-sya-orange/30 pb-2 w-full">Final</h3>
            <div className="w-full p-4 border border-sya-orange rounded-2xl bg-sya-orange/10 shadow-lg text-center relative">
              <Award className="w-8 h-8 text-sya-orange mx-auto mb-2" />
              <div className="h-4 w-24 bg-sya-orange/30 rounded mx-auto"></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
