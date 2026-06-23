'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Home, 
  Calendar, 
  Lock, 
  Trophy, 
  Gift, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Award,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

interface StandingRow {
  userId: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  user: { name: string };
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userStats, setUserStats] = useState({ rank: '-', points: 0, exacts: 0 });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load and apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    } else if (systemDark) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setTheme('light');
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.classList.toggle('light', nextTheme === 'light');
  };

  // Fetch user stats from standings
  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/standings');
        if (res.ok) {
          const data = await res.json();
          const list: StandingRow[] = data.standings || [];
          const idx = list.findIndex((s) => s.userId === user.id);
          
          if (idx >= 0) {
            setUserStats({
              rank: `#${idx + 1}`,
              points: list[idx].totalPoints,
              exacts: list[idx].exactScores,
            });
          } else {
            // Lucas default mock values
            if (user.id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22') {
              setUserStats({ rank: '#4', points: 27, exacts: 5 });
            } else {
              setUserStats({ rank: '-', points: 0, exacts: 0 });
            }
          }
        }
      } catch (err) {
        console.error('Error loading standings stats:', err);
      }
    };

    fetchStats();
    // Refresh stats when path changes (like after predicting or recalculating)
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [user, pathname]);

  // Redirect to login if not authenticated and not loading (exclude public pages)
  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/register' && pathname !== '/verify') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0F19]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[#1B199A] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-semibold animate-pulse">Cargando PRODE SER...</p>
        </div>
      </div>
    );
  }

  // Render children directly on login, register and verify pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/verify') {
    return <>{children}</>;
  }

  if (!user || !profile) {
    return null;
  }

  const navItems = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Fase de Grupos', href: '/groups', icon: Calendar },
    { name: 'Eliminatorias', href: '/knockout', icon: Lock },
    { name: 'Tabla de Posiciones', href: '/standings', icon: Trophy },
    { name: 'Premios', href: '/prizes', icon: Gift },
    { name: 'Mi Perfil', href: '/profile', icon: User },
  ];

  const adminNav = { name: 'Panel de Control', href: '/admin', icon: Settings };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100 dark:bg-[#0B0F19] text-gray-800 dark:text-gray-200">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-[#111827] border-r border-gray-200 dark:border-gray-800 shadow-md">
        
        {/* Brand Logo */}
        <div className="flex justify-center px-6 py-6 border-b border-gray-200 dark:border-gray-800">
          <img src="/logos/LOGO SER.png" alt="Logo SER" className="h-16 w-auto object-contain" />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 group ${
                  active 
                    ? 'bg-[#1B199A] text-white shadow-md' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#1B199A]'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-gray-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Admin link */}
          {profile.role === 'ADMIN' && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
              <Link
                href={adminNav.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 group ${
                  pathname === adminNav.href 
                    ? 'bg-[#1B199A] text-white shadow-md' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#1B199A]'
                }`}
              >
                <Settings className="w-5 h-5 text-gray-500 group-hover:spin" />
                <span>{adminNav.name}</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1f2937]/50 rounded-b-2xl">
          <Link href="/profile" className="flex items-center gap-3 mb-3 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#1B199A] bg-[#1B199A]/10 flex items-center justify-center text-white font-bold text-sm uppercase group-hover:scale-105 transition-transform">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.name[0]
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold truncate group-hover:text-[#1B199A] transition-colors">{profile.name}</h2>
              <span className="text-xs text-gray-400 block truncate">
                {(() => {
                  const raw = profile.email.split('@')[0];
                  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                })()}
              </span>
            </div>
          </Link>

          <div className="flex flex-col gap-2">

            <button
              onClick={signOut}
              className="w-full text-xs font-semibold text-red-500 hover:bg-red-500/10 py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden pb-20 md:pb-0">
        
        {/* Header Stats Bar */}
        <header className="sya-glass sticky top-0 z-30 flex items-center justify-between px-6 py-4 mx-4 my-4 shadow-sm bg-opacity-70 dark:bg-opacity-70 border-t-4 border-[#1B199A]">
          
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <Menu className="w-6 h-6 text-[#1B199A]" />
            </button>
            
            <Link href="/profile" className="flex items-center gap-3 hover:opacity-85 transition-opacity cursor-pointer">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#1B199A] bg-[#1B199A]/10 flex items-center justify-center text-white font-bold text-xs uppercase">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.name[0]
                )}
              </div>
              <div className="hidden sm:block">
                <h2 className="text-sm font-bold">¡Hola {profile.name}! 👋</h2>
                <p className="text-[10px] text-gray-400">¿Listo para predecir los resultados?</p>
              </div>
              <div className="sm:hidden">
                <h2 className="text-md font-bold font-serif text-[#1B199A]">PRODE SER</h2>
              </div>
            </Link>
          </div>

          {/* Leaderboard summaries & Theme Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-500/10 px-4 py-2 rounded-2xl">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Posición</span>
                <span className="text-sm font-extrabold text-[#1B199A]">{userStats.rank}</span>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 text-gray-300"></div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Puntos</span>
                <span className="text-sm font-extrabold text-blue-500">{userStats.points}</span>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 text-gray-300"></div>
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Exactos</span>
                <span className="text-sm font-extrabold text-green-500">{userStats.exacts}</span>
              </div>
            </div> 

            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-gray-500/10 hover:bg-gray-500/20 text-[#1B199A] hover:text-[#342ede] transition-colors flex items-center justify-center shadow-sm cursor-pointer"
              title="Cambiar Tema"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
            </button>
          </div>
        </header>

        {/* Dynamic Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="fixed top-0 bottom-0 left-0 w-64 bg-white dark:bg-[#111827] shadow-xl flex flex-col p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-8">
                <span className="font-extrabold font-serif tracking-wider text-lg text-[#1B199A]">PRODE SER</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <nav className="flex-1 space-y-3">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-colors ${
                        active 
                          ? 'bg-[#1B199A] text-white shadow-md' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#1B199A]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {profile.role === 'ADMIN' && (
                  <Link
                    href={adminNav.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-colors ${
                      pathname === adminNav.href 
                        ? 'bg-[#1B199A] text-white shadow-md' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#1B199A]'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>{adminNav.name}</span>
                  </Link>
                )}
              </nav>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex flex-col gap-2">

                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-xs font-semibold text-red-500 hover:bg-red-500/10 py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Children Container */}
        <main className="flex-1 px-4 md:px-8 py-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto animate-slide-up">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-gray-800 flex justify-around py-3 px-2 shadow-lg backdrop-blur-md bg-opacity-95">
        {[
          ...navItems.slice(0, 5),
          ...(profile.role === 'ADMIN' ? [adminNav] : [])
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-colors ${
                active ? 'text-[#1B199A]' : 'text-gray-500 hover:text-[#1B199A]'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'scale-110 stroke-[2.5px]' : 'scale-100'}`} />
              <span>{item.name === 'Panel de Control' ? 'Admin' : item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
export default AppShell;
