import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { YagamiLoader } from './components/YagamiLoader';
import HomeTab from './components/HomeTab';
import SearchTab from './components/SearchTab';
import SettingsTab from './components/SettingsTab';
import LibraryTab from './components/LibraryTab';
import DownloadsTab from './components/DownloadsTab';
import AlbumView from './components/AlbumView';
import PlaylistView from './components/PlaylistView';
import ArtistView from './components/ArtistView';

import { PlayerProvider } from './components/PlayerContext';
import { DownloadProvider } from './lib/DownloadContext';
import { WifiOff } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import MiniPlayer from './components/MiniPlayer';
import { LiquidTabBar } from './components/LiquidTabBar';

class RootErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('RootError:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: 'white', height: '100vh', wordWrap: 'break-word' }}>
          <h1>Fatal Error</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return <RootErrorBoundary><AppContent /></RootErrorBoundary>;
}

function AppContent() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [showUI, setShowUI]             = useState(false);
  const [isOffline, setIsOffline]       = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const [activeTab, setActiveTab] = useState<
    'home' | 'search' | 'library' | 'downloads' | 'settings'
  >('home');

  const [globalOverlay, setGlobalOverlay] = useState<{
    type: 'album' | 'artist' | 'playlist';
    id: string;
  } | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return (
          localStorage.getItem('theme') === 'dark' ||
          (!('theme' in localStorage) &&
            window.matchMedia('(prefers-color-scheme: dark)').matches)
        );
      } catch {
        return false;
      }
    }
    return false;
  });

  // Online / offline
  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Global overlay events
  useEffect(() => {
    const handler = (e: any) => setGlobalOverlay(e.detail);
    document.addEventListener('open-overlay', handler);
    return () => document.removeEventListener('open-overlay', handler);
  }, []);

  // Navigate events
  useEffect(() => {
    const handler = (e: any) => { if (e.detail) setActiveTab(e.detail); };
    window.addEventListener('navigate',   handler);
    document.addEventListener('navigate', handler);
    return () => {
      window.removeEventListener('navigate',   handler);
      document.removeEventListener('navigate', handler);
    };
  }, []);

  // App loading timer
  useEffect(() => {
    const t = setTimeout(() => {
      setIsAppLoading(false);
      setTimeout(() => setShowUI(true), 800);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  // Dark mode persistence
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch { /* noop */ }
  }, [isDarkMode]);

  return (
    <DownloadProvider>
      <PlayerProvider>
        <div className="flex flex-col h-screen w-full bg-[#F2F2F7] dark:bg-[#000000] text-black dark:text-white font-sans overflow-hidden transition-colors duration-300 relative">

          {/* Loading screen */}
          <AnimatePresence>
            {isAppLoading && (
              <motion.div
                key="loader"
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="flex flex-col h-screen w-screen bg-[#F2F2F7] dark:bg-[#000000] items-center justify-center absolute inset-0 z-[200]"
              >
                <YagamiLoader />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Offline banner */}
          <AnimatePresence>
            {isOffline && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="absolute top-12 left-1/2 -translate-x-1/2 z-[90] bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg"
              >
                <WifiOff size={14} />
                Sin Conexión
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab content */}
          <ErrorBoundary>
            <main className="flex-1 relative overflow-hidden">
              <div className={activeTab === 'home'      ? 'block h-full' : 'hidden'}><HomeTab /></div>
              <div className={activeTab === 'search'    ? 'block h-full' : 'hidden'}><SearchTab /></div>
              <div className={activeTab === 'library'   ? 'block h-full' : 'hidden'}><LibraryTab /></div>
              <div className={activeTab === 'downloads' ? 'block h-full' : 'hidden'}><DownloadsTab /></div>
              <div className={activeTab === 'settings'  ? 'block h-full' : 'hidden'}>
                <SettingsTab isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
              </div>
            </main>
          </ErrorBoundary>

          {/* Global overlays */}
          <AnimatePresence>
            {globalOverlay?.type === 'album' && (
              <motion.div key="album" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 z-[80] bg-[#F2F2F7] dark:bg-[#000000]">
                <AlbumView albumId={globalOverlay.id} onBack={() => setGlobalOverlay(null)} />
              </motion.div>
            )}
            {globalOverlay?.type === 'playlist' && (
              <motion.div key="playlist" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 z-[80] bg-[#F2F2F7] dark:bg-[#000000]">
                <PlaylistView playlistId={globalOverlay.id} onBack={() => setGlobalOverlay(null)} />
              </motion.div>
            )}
            {globalOverlay?.type === 'artist' && (
              <motion.div key="artist" initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 z-[80] bg-[#F2F2F7] dark:bg-[#000000]">
                <ArtistView artistId={globalOverlay.id} onBack={() => setGlobalOverlay(null)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mini Player */}
          <MiniPlayer />

          {/* Tab Bar — always shows when UI is ready, no native plugin dependency */}
          {showUI && (
            <LiquidTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
          )}

        </div>
      </PlayerProvider>
    </DownloadProvider>
  );
}
