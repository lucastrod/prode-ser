'use client';

import React, { useEffect, useState } from 'react';
import { X, Award, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  groupName: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
}

interface PredictionItem {
  id: number;
  matchId: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  points: number | null;
  match: Match;
}

interface UserAuditPredictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalPoints: number;
}

export default function UserAuditPredictionsModal({
  isOpen,
  onClose,
  userId,
  userName,
  avatarUrl,
  totalPoints,
}: UserAuditPredictionsModalProps) {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUserPredictions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/predictions/user?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          const list: PredictionItem[] = data.predictions || [];
          
          // Sort by matchDate desc (most recent matches first)
          list.sort((a, b) => new Date(b.match.matchDate).getTime() - new Date(a.match.matchDate).getTime());
          
          setPredictions(list);
        }
      } catch (err) {
        console.error('Error fetching audited user predictions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPredictions();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const formatMatchDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' hs';
  };

  const getPointsBadge = (points: number | null) => {
    if (points === null) return <span className="text-gray-400 font-bold">-</span>;
    if (points === 3) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-green-500 text-white text-[10px] font-black uppercase shadow-sm">
          <Award className="w-3 h-3" />
          +3 Pts
        </span>
      );
    }
    if (points === 1) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded bg-sya-blue text-white text-[10px] font-black uppercase shadow-sm">
          +1 Pt
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-0.5 rounded bg-gray-500/20 text-gray-500 text-[10px] font-black uppercase">
        0 Pts
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)' }}>
      <div className="relative max-w-xl w-full bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-sya-orange/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-sya-orange/30 bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-sm uppercase text-gray-500 shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName[0]
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-sya-orange uppercase tracking-widest">Auditoría de Prodes</h3>
              <p className="font-black text-lg text-gray-800 dark:text-white flex items-center gap-2">
                {userName}
                <span className="text-xs bg-sya-orange/10 text-sya-orange px-2.5 py-0.5 rounded-full">
                  {totalPoints} Puntos Totales
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-500/10 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {/* Note about lock */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-600 dark:text-amber-400 font-bold mb-4 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Por motivos de juego limpio, solo se muestran los pronósticos de partidos que ya comenzaron o se encuentran bloqueados para modificación.</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400 font-semibold animate-pulse">
              Cargando historial de pronósticos...
            </div>
          ) : predictions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-semibold">
              Este usuario no tiene pronósticos visibles en juego todavía.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-400 uppercase">Partidos iniciados ({predictions.length})</div>
              
              <div className="space-y-3">
                {predictions.map((p) => {
                  const isFinished = p.match.status === 'FINISHED';
                  const isLive = p.match.status === 'LIVE';
                  return (
                    <div 
                      key={p.id} 
                      className={`p-3.5 bg-gray-500/5 hover:bg-gray-500/10 border border-gray-200 dark:border-gray-800 rounded-xl transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}
                    >
                      {/* Match Details */}
                      <div className="space-y-1">
                        <div className="font-extrabold text-sm text-gray-800 dark:text-gray-200">
                          {p.match.homeTeam} vs {p.match.awayTeam}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-450 font-bold uppercase">
                          <span className="text-sya-orange">{p.match.groupName}</span>
                          <span>•</span>
                          <span>{formatMatchDate(p.match.matchDate)}</span>
                          {isLive && (
                            <span className="bg-amber-400/20 text-amber-500 px-1.5 py-0.5 rounded font-black animate-pulse">
                              En Juego
                            </span>
                          )}
                          {isFinished && (
                            <span className="bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded font-black">
                              Finalizado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Scores & Points */}
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        {/* Pronosticado */}
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-gray-400 block">Prode</span>
                          <span className="px-2 py-0.5 bg-gray-500/20 rounded font-black text-xs text-gray-800 dark:text-gray-200">
                            {p.predictedHomeScore} - {p.predictedAwayScore}
                          </span>
                        </div>

                        {/* Real */}
                        <div className="text-center">
                          <span className="text-[9px] uppercase font-bold text-gray-400 block">Oficial</span>
                          <span className="font-black text-xs text-sya-blue">
                            {isFinished && p.match.homeScore !== null ? `${p.match.homeScore} - ${p.match.awayScore}` : '-'}
                          </span>
                        </div>

                        {/* Puntos */}
                        <div className="w-14 text-center">
                          {getPointsBadge(p.points)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
