'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Award, CheckCircle } from 'lucide-react';

interface PredictionItem {
  id: number;
  userId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  points: number | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface OtherPredictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
}

export default function OtherPredictionsModal({
  isOpen,
  onClose,
  matchId,
  homeTeam,
  awayTeam,
  matchDate,
  homeScore,
  awayScore,
}: OtherPredictionsModalProps) {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ home: 0, draw: 0, away: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/predictions/match?matchId=${matchId}`);
        if (res.ok) {
          const data = await res.json();
          const list: PredictionItem[] = data.predictions || [];
          
          // Sort by points desc, then by user name asc
          list.sort((a, b) => {
            if ((b.points ?? -1) !== (a.points ?? -1)) {
              return (b.points ?? -1) - (a.points ?? -1);
            }
            return a.user.name.localeCompare(b.user.name);
          });

          setPredictions(list);

          // Calculate tendencies
          let h = 0, d = 0, a_ = 0;
          list.forEach((p) => {
            if (p.predictedHomeScore > p.predictedAwayScore) h++;
            else if (p.predictedHomeScore < p.predictedAwayScore) a_++;
            else d++;
          });
          const total = list.length || 1;
          setStats({
            home: Math.round((h / total) * 100),
            draw: Math.round((d / total) * 100),
            away: Math.round((a_ / total) * 100),
          });
        }
      } catch (err) {
        console.error('Error fetching match predictions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [isOpen, matchId]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)' }}>
      <div className="relative max-w-lg w-full bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-500/5">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest">Pronósticos de la Gente</h3>
            <p className="font-bold text-base text-gray-850 dark:text-white truncate">
              {homeTeam} vs {awayTeam}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-500/10 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Official score info if finished */}
          {homeScore !== null && awayScore !== null && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-1">Resultado Oficial</span>
              <span className="text-2xl font-black text-emerald-500">
                {homeTeam} {homeScore} - {awayScore} {awayTeam}
              </span>
            </div>
          )}

          {/* Stats Bar */}
          {!loading && predictions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase">
                <TrendingUp className="w-4 h-4 text-sya-orange" />
                <span>Tendencia del Prode</span>
              </div>
              <div className="h-6 rounded-full overflow-hidden flex bg-gray-500/10 font-bold text-[10px] text-white">
                {stats.home > 0 && (
                  <div
                    style={{ width: `${stats.home}%` }}
                    className="bg-sya-blue flex items-center justify-center transition-all duration-550"
                    title={`Gana ${homeTeam}: ${stats.home}%`}
                  >
                    <span>L {stats.home}%</span>
                  </div>
                )}
                {stats.draw > 0 && (
                  <div
                    style={{ width: `${stats.draw}%` }}
                    className="bg-gray-500 flex items-center justify-center transition-all duration-550"
                    title={`Empate: ${stats.draw}%`}
                  >
                    <span>E {stats.draw}%</span>
                  </div>
                )}
                {stats.away > 0 && (
                  <div
                    style={{ width: `${stats.away}%` }}
                    className="bg-sya-orange flex items-center justify-center transition-all duration-550"
                    title={`Gana ${awayTeam}: ${stats.away}%`}
                  >
                    <span>V {stats.away}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Predictions list */}
          {loading ? (
            <div className="py-12 text-center text-gray-400 font-semibold animate-pulse">
              Cargando predicciones de otros usuarios...
            </div>
          ) : predictions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-semibold">
              Nadie realizó pronósticos para este partido.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">Participantes ({predictions.length})</div>
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {predictions.map((p) => {
                  const hasPoints = p.points !== null;
                  return (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-250 dark:border-gray-800 bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-xs uppercase text-gray-500 shrink-0">
                          {p.user.avatarUrl ? (
                            <img src={p.user.avatarUrl} alt={p.user.name} className="w-full h-full object-cover" />
                          ) : (
                            p.user.name[0]
                          )}
                        </div>
                        <span className="font-extrabold text-sm truncate text-gray-800 dark:text-gray-200">
                          {p.user.name}
                        </span>
                      </div>

                      {/* Prediction */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2.5 py-1 bg-gray-500/10 dark:bg-[#1f2937] rounded-lg font-black text-sm text-gray-700 dark:text-gray-300">
                          {p.predictedHomeScore} - {p.predictedAwayScore}
                        </span>

                        {/* Points badge */}
                        {hasPoints && (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-sm ${
                            p.points === 3 ? 'bg-green-500 animate-pulse' : p.points === 1 ? 'bg-sya-blue' : 'bg-gray-400'
                          }`}>
                            {p.points === 3 && <Award className="w-3 h-3" />}
                            {p.points === 3 ? '+3' : p.points === 1 ? '+1' : '0'} Pts
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}
