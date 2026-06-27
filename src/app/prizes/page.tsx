'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Award, Sparkles, HelpCircle } from 'lucide-react';

interface Prize {
  id: number;
  position: number;
  title: string;
  description: string;
  enabled: boolean;
}

export default function PrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrizes = async () => {
      try {
        const res = await fetch('/api/prizes');
        if (res.ok) {
          const data = await res.json();
          setPrizes(data.prizes || []);
        }
      } catch (err) {
        console.error('Error fetching prizes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrizes();
  }, []);

  const getPositionSymbol = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return '🎁';
  };

  const getPositionCardStyle = (pos: number) => {
    if (pos === 1) return 'border-t-8 border-amber-400';
    if (pos === 2) return 'border-t-8 border-slate-300';
    if (pos === 3) return 'border-t-8 border-amber-700';
    return 'border-t-8 border-[#1B199A]';
  };

  // Filter only active prizes
  const activePrizes = prizes.filter((p) => p.enabled);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-serif tracking-wide border-l-6 border-[#1B199A] pl-3">
          Premios del PRODE
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Esfuerzo recompensado. Estos son los fabulosos premios en juego para los mejores pronosticadores de nuestro grupo de jóvenes.
        </p>
      </div>

      {/* Rewards Deck */}
      {loading ? (
        <div className="sya-glass p-20 text-center text-gray-400 font-semibold animate-pulse">
          Cargando premios del Prode...
        </div>
      ) : activePrizes.length === 0 ? (
        <div className="sya-glass p-12 text-center text-gray-400 font-semibold">
          No hay premios configurados todavía. ¡Consultá más adelante!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          {activePrizes.map((prize) => (
            <div 
              key={prize.id} 
              className={`sya-glass p-8 flex flex-col justify-between hover:translate-y-[-6px] transition-all duration-300 relative overflow-hidden ${getPositionCardStyle(prize.position)}`}
            >
              {/* Highlight effect for 1st place */}
              {prize.position === 1 && (
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/10 rounded-bl-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
              )}

              {/* Card Body */}
              <div className="space-y-4">
                <div className="text-4xl filter drop-shadow-md">
                  {getPositionSymbol(prize.position)}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold font-serif">
                    {prize.title}
                  </h3>
                  <span className="inline-block px-3 py-1 bg-gray-500/10 rounded-full text-[10px] uppercase font-bold text-gray-400 tracking-wide">
                    Puesto #{prize.position}
                  </span>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                  {prize.description}
                </p>
              </div>

              {/* Card Footer Badge */}
              <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center gap-1.5 text-xs text-blue-500 font-bold">
                <Gift className="w-4 h-4 text-[#1B199A]" />
                <span>Premio Oficial SER</span>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Rules Notice */}
      <section className="sya-glass p-6 bg-gray-500/5 mt-8 max-w-3xl mx-auto flex items-start gap-4">
        <HelpCircle className="w-6 h-6 text-[#1B199A] shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
          <h4 className="font-extrabold text-sm text-gray-800 dark:text-white uppercase tracking-wider">Criterios de Desempate</h4>
          <p>
            En caso de igualdad de puntos en la tabla de posiciones al finalizar la Fase de Grupos, las posiciones se decidirán según los siguientes criterios en orden de prioridad:
          </p>
          <ol className="list-decimal pl-4 space-y-1 mt-1 font-semibold">
            <li>Mayor cantidad de <strong>Aciertos Exactos</strong> (marcador idéntico, 6 puntos).</li>
            <li>Mayor cantidad de <strong>Aciertos de Ganador o Empate</strong> (3 puntos).</li>
            <li>Fecha y hora de registro de las predicciones (quien las haya guardado primero tendrá prioridad).</li>
          </ol>
        </div>
      </section>

    </div>
  );
}
