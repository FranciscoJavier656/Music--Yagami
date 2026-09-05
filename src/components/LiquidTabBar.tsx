import React, { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Home, Search, Library, Download, Settings as SettingsIcon } from 'lucide-react';

interface Tab {
  id: string;
  icon: React.ElementType;
  label: string;
}

const TABS: Tab[] = [
  { id: 'home', icon: Home, label: 'Inicio' },
  { id: 'search', icon: Search, label: 'Buscar' },
  { id: 'library', icon: Library, label: 'Librería' },
  { id: 'downloads', icon: Download, label: 'Descargas' },
  { id: 'settings', icon: SettingsIcon, label: 'Ajustes' },
];

// Springs viscosos como agua
const LIQUID_SPRING  = { stiffness: 120, damping: 14, mass: 1.2 };
const STRETCH_SPRING = { stiffness: 200, damping: 18, mass: 0.9 };
const ICON_SPRING    = { stiffness: 280, damping: 22, mass: 0.8 };

// Altura total de la barra + safe-area para que otros elementos la esquiven
export const TAB_BAR_HEIGHT = 88; // 72px barra + 16px gap

export const LiquidTabBar = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (id: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tabCenters, setTabCenters] = useState<number[]>([]);
  const prevTabRef = useRef(activeTab);

  // Motion values para la burbuja líquida
  const bubbleX      = useMotionValue(0);
  const bubbleWidth  = useMotionValue(56);
  const bubbleHeight = useMotionValue(56);
  const bubbleY      = useMotionValue(-10);

  const smoothX      = useSpring(bubbleX,      LIQUID_SPRING);
  const smoothWidth  = useSpring(bubbleWidth,  STRETCH_SPRING);
  const smoothHeight = useSpring(bubbleHeight, STRETCH_SPRING);
  const smoothY      = useSpring(bubbleY,      LIQUID_SPRING);

  // scaleY inverso para conservar "volumen" como agua
  const scaleY = useTransform(smoothWidth, [56, 140], [1, 0.72]);

  // Medir centros de cada tab
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const btns = container.querySelectorAll<HTMLElement>('.ltb-tab');
    const containerRect = container.getBoundingClientRect();
    const centers: number[] = [];
    btns.forEach((btn) => {
      const r = btn.getBoundingClientRect();
      centers.push(r.left - containerRect.left + r.width / 2);
    });
    setTabCenters(centers);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Posición inicial (sin animación)
  useEffect(() => {
    if (tabCenters.length === 0) return;
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (idx >= 0 && tabCenters[idx] != null) {
      bubbleX.set(tabCenters[idx]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabCenters.length]);

  // Animación líquida al cambiar de tab
  useEffect(() => {
    const activeIdx = TABS.findIndex((t) => t.id === activeTab);
    const prevIdx   = TABS.findIndex((t) => t.id === prevTabRef.current);
    if (tabCenters.length === 0 || activeIdx < 0) return;

    const targetX    = tabCenters[activeIdx];
    const prevX      = tabCenters[prevIdx] ?? targetX;
    const distance   = Math.abs(targetX - prevX);
    const tabSpacing = tabCenters.length > 1
      ? Math.abs(tabCenters[1] - tabCenters[0]) : 70;

    const stretchFactor = Math.min(distance / tabSpacing, 3);
    const peakWidth     = 56 + stretchFactor * 38;

    if (distance > 5) {
      bubbleWidth.set(peakWidth);
      bubbleHeight.set(56 * (56 / peakWidth));
      bubbleY.set(-10 + stretchFactor * 2);
      bubbleX.set(targetX);

      const timer = setTimeout(() => {
        bubbleWidth.set(56);
        bubbleHeight.set(56);
        bubbleY.set(-10);
      }, 120 + stretchFactor * 30);

      prevTabRef.current = activeTab;
      return () => clearTimeout(timer);
    } else {
      bubbleX.set(targetX);
      prevTabRef.current = activeTab;
    }
  }, [activeTab, tabCenters, bubbleX, bubbleWidth, bubbleHeight, bubbleY]);

  return (
    <div
      className="fixed left-0 w-full flex justify-center z-[100] pointer-events-none"
      style={{ bottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
    >
      {/* SVG goo filter — SOLO para las formas sólidas, nunca para los íconos */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="liquid-goo" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <nav
        className="relative w-[92%] max-w-[420px] pointer-events-auto"
        style={{ height: 72 }}
      >
        {/* ═══════════════════════════════════════════
            CAPA 1 — GOO SHAPES (barra + burbuja sólidas)
            ⚠️  NINGÚN backdrop-filter aquí — el SVG goo
            filter necesita fondos OPACOS para funcionar.
            Los íconos van en una capa completamente separada.
            ═══════════════════════════════════════════ */}
        <div
          className="absolute pointer-events-none overflow-visible"
          style={{
            inset: 0,
            top: -28,
            height: 72 + 28 + 10,
            filter: 'url(#liquid-goo)',
            // isolation: 'isolate' necesario para que el filter no afecte capas externas
            isolation: 'isolate',
          }}
        >
          {/* Barra principal — fondo sólido oscuro */}
          <div
            className="absolute rounded-[36px]"
            style={{
              top: 28,
              left: 0,
              right: 0,
              height: 72,
              background: 'rgb(22, 22, 24)',   // sólido, sin alpha bajo
            }}
          />

          {/* Burbuja activa — se fusiona con la barra via goo */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width:   smoothWidth,
              height:  smoothHeight,
              x:       useTransform(smoothX,  (v) => v - 28),
              y:       useTransform(smoothY,  (v) => v + 28),
              scaleY,
              background: 'rgb(38, 38, 42)',   // ligeramente más claro que la barra
            }}
          />
        </div>

        {/* ═══════════════════════════════════════════
            CAPA 2 — GLASS MATERIAL (backdrop-blur)
            Separada del goo filter para no interferir.
            ═══════════════════════════════════════════ */}
        <div
          className="absolute inset-0 rounded-[36px] pointer-events-none"
          style={{
            backdropFilter: 'blur(48px) saturate(180%) brightness(1.05)',
            WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.05)',
            background: 'rgba(22,22,24,0.45)',
            boxShadow: `
              0 8px 40px rgba(0,0,0,0.5),
              inset 0 1px 0 rgba(255,255,255,0.09),
              inset 0 -0.5px 0 rgba(255,255,255,0.04)
            `,
            border: '0.5px solid rgba(255,255,255,0.13)',
          }}
        />

        {/* Highlight superior de la barra */}
        <div
          className="absolute inset-0 rounded-[36px] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 40%)',
          }}
        />

        {/* Highlight de burbuja activa (efecto glass encima) */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width:  smoothWidth,
            height: smoothHeight,
            left:   useTransform(smoothX, (v) => v - 28),
            top:    smoothY,
            scaleY,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.12) 0%, transparent 55%)',
            boxShadow: `
              inset 0 1px 1px rgba(255,255,255,0.18),
              0 4px 16px rgba(0,0,0,0.28)
            `,
            border: '0.5px solid rgba(255,255,255,0.18)',
          }}
        >
          {/* Chromatic fringe — bordes RGB sutiles */}
          <div
            className="absolute inset-[-1px] rounded-full overflow-hidden pointer-events-none"
            style={{
              background: `linear-gradient(135deg,
                rgba(0,200,255,0.28) 0%,
                transparent 30%,
                rgba(255,0,200,0.22) 50%,
                transparent 70%,
                rgba(0,180,255,0.28) 100%
              )`,
              maskImage: 'radial-gradient(circle, transparent 52%, black 100%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 52%, black 100%)',
            }}
          />
        </motion.div>

        {/* ═══════════════════════════════════════════
            CAPA 3 — ÍCONOS & LABELS
            z-[50] — completamente encima de todo.
            ⚠️  NUNCA dentro del goo filter container.
            ═══════════════════════════════════════════ */}
        <div
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-around px-1 z-[50]"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                className="ltb-tab flex flex-col items-center justify-center gap-[3px] flex-1 h-full bg-transparent border-none outline-none cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                onClick={() => setActiveTab(tab.id)}
              >
                <motion.div
                  animate={{
                    y:     isActive ? -14 : 0,
                    scale: isActive ? 1.15 : 1,
                  }}
                  transition={{ type: 'spring', ...ICON_SPRING }}
                  className="flex flex-col items-center gap-[3px]"
                >
                  <Icon
                    size={isActive ? 24 : 22}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    style={{
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                      filter: isActive
                        ? 'drop-shadow(0 0 7px rgba(255,255,255,0.4))'
                        : 'none',
                    }}
                  />
                  <span
                    className="text-[10px] font-semibold tracking-wide leading-none whitespace-nowrap"
                    style={{
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {tab.label}
                  </span>
                </motion.div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
