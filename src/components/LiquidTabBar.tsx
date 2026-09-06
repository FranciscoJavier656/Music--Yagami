import React, { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Home, Search, Library, Download, Settings as SettingsIcon } from 'lucide-react';

interface Tab {
  id: string;
  icon: React.ElementType;
  label: string;
}

const TABS: Tab[] = [
  { id: 'home',      icon: Home,           label: 'Inicio'    },
  { id: 'search',    icon: Search,         label: 'Buscar'    },
  { id: 'library',   icon: Library,        label: 'Librería'  },
  { id: 'downloads', icon: Download,       label: 'Descargas' },
  { id: 'settings',  icon: SettingsIcon,   label: 'Ajustes'   },
];

const LIQUID_SPRING  = { stiffness: 120, damping: 14, mass: 1.2 };
const STRETCH_SPRING = { stiffness: 200, damping: 18, mass: 0.9 };
const ICON_SPRING    = { stiffness: 280, damping: 22, mass: 0.8 };

const BAR_BOTTOM   = 'max(env(safe-area-inset-bottom, 8px), 8px)';
const BAR_WIDTH    = '92%';
const BAR_MAX      = 420;
const BAR_H        = 72;

export const LiquidTabBar = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (id: string) => void;
}) => {
  // Ref para medir posiciones de los tabs
  const iconsRef  = useRef<HTMLDivElement>(null);
  const [tabCenters, setTabCenters] = useState<number[]>([]);
  const prevTabRef = useRef(activeTab);

  // Motion values
  const bubbleX      = useMotionValue(0);
  const bubbleWidth  = useMotionValue(56);
  const bubbleHeight = useMotionValue(56);
  const bubbleY      = useMotionValue(-10);

  const smoothX      = useSpring(bubbleX,      LIQUID_SPRING);
  const smoothWidth  = useSpring(bubbleWidth,  STRETCH_SPRING);
  const smoothHeight = useSpring(bubbleHeight, STRETCH_SPRING);
  const smoothY      = useSpring(bubbleY,      LIQUID_SPRING);
  const scaleY       = useTransform(smoothWidth, [56, 140], [1, 0.72]);

  // Medir centros de tabs
  const measure = useCallback(() => {
    const el = iconsRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const btns = el.querySelectorAll<HTMLElement>('.ltb-tab');
    const centers: number[] = [];
    btns.forEach(btn => {
      const r = btn.getBoundingClientRect();
      centers.push(r.left - rect.left + r.width / 2);
    });
    setTabCenters(centers);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (iconsRef.current) ro.observe(iconsRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Posición inicial sin animación
  useEffect(() => {
    if (!tabCenters.length) return;
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx >= 0 && tabCenters[idx] != null) bubbleX.set(tabCenters[idx]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabCenters.length]);

  // Animación líquida al cambiar tab
  useEffect(() => {
    const activeIdx = TABS.findIndex(t => t.id === activeTab);
    const prevIdx   = TABS.findIndex(t => t.id === prevTabRef.current);
    if (!tabCenters.length || activeIdx < 0) return;

    const targetX    = tabCenters[activeIdx];
    const prevX      = tabCenters[prevIdx] ?? targetX;
    const distance   = Math.abs(targetX - prevX);
    const tabSpacing = tabCenters.length > 1
      ? Math.abs(tabCenters[1] - tabCenters[0]) : 70;

    const stretch    = Math.min(distance / tabSpacing, 3);
    const peakW      = 56 + stretch * 38;

    if (distance > 5) {
      bubbleWidth.set(peakW);
      bubbleHeight.set(56 * (56 / peakW));
      bubbleY.set(-10 + stretch * 2);
      bubbleX.set(targetX);

      const t = setTimeout(() => {
        bubbleWidth.set(56);
        bubbleHeight.set(56);
        bubbleY.set(-10);
      }, 120 + stretch * 30);

      prevTabRef.current = activeTab;
      return () => clearTimeout(t);
    } else {
      bubbleX.set(targetX);
      prevTabRef.current = activeTab;
    }
  }, [activeTab, tabCenters, bubbleX, bubbleWidth, bubbleHeight, bubbleY]);

  return (
    <>
      {/* ── SVG goo filter definition (oculto) ── */}
      <svg
        aria-hidden="true"
        style={{ position: 'fixed', width: 0, height: 0, top: 0, left: 0 }}
      >
        <defs>
          <filter id="liquid-goo" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* ══════════════════════════════════════════════════
          CAPA A — BARRA VISUAL (z-[100])
          Contiene: goo shapes + glass backdrop-blur + highlights
          ⚠️  NUNCA hay íconos aquí dentro — el backdrop-filter
          y el SVG filter crean stacking contexts que atrapan
          a cualquier elemento hijo/hermano debajo de ellos.
          ══════════════════════════════════════════════════ */}
      <div
        className="fixed left-0 w-full flex justify-center pointer-events-none z-[100]"
        style={{ bottom: BAR_BOTTOM }}
      >
        <div
          style={{
            position: 'relative',
            width: BAR_WIDTH,
            maxWidth: BAR_MAX,
            height: BAR_H,
          }}
        >
          {/* Goo shapes: solo fondos SÓLIDOS — el SVG filter necesita opacidad total */}
          <div
            style={{
              position: 'absolute',
              left: 0, right: 0,
              top: -28,
              height: BAR_H + 38,
              filter: 'url(#liquid-goo)',
              isolation: 'isolate',
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            {/* Barra sólida */}
            <div style={{
              position: 'absolute',
              top: 28, left: 0, right: 0,
              height: BAR_H,
              borderRadius: 36,
              background: 'rgb(20, 20, 22)',
            }} />
            {/* Burbuja líquida */}
            <motion.div style={{
              position: 'absolute',
              borderRadius: '50%',
              width:   smoothWidth,
              height:  smoothHeight,
              x:       useTransform(smoothX, v => v - 28),
              y:       useTransform(smoothY, v => v + 28),
              scaleY,
              background: 'rgb(36, 36, 40)',
            }} />
          </div>

          {/* Glass backdrop-blur (capa separada, NO dentro del goo) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 36,
            backdropFilter: 'blur(50px) saturate(180%) brightness(1.06)',
            WebkitBackdropFilter: 'blur(50px) saturate(180%) brightness(1.06)',
            background: 'rgba(20,20,22,0.42)',
            boxShadow: [
              '0 8px 40px rgba(0,0,0,0.5)',
              'inset 0 1px 0 rgba(255,255,255,0.09)',
              'inset 0 -0.5px 0 rgba(255,255,255,0.04)',
            ].join(','),
            border: '0.5px solid rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }} />

          {/* Gradiente superior (shine) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 36,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.055) 0%, transparent 45%)',
            pointerEvents: 'none',
          }} />

          {/* Highlight + chromatic fringe de la burbuja */}
          <motion.div style={{
            position: 'absolute',
            borderRadius: '50%',
            width:  smoothWidth,
            height: smoothHeight,
            left:   useTransform(smoothX, v => v - 28),
            top:    smoothY,
            scaleY,
            background: 'linear-gradient(155deg, rgba(255,255,255,0.13) 0%, transparent 55%)',
            boxShadow: [
              'inset 0 1px 1px rgba(255,255,255,0.18)',
              '0 4px 16px rgba(0,0,0,0.28)',
            ].join(','),
            border: '0.5px solid rgba(255,255,255,0.17)',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              inset: -1,
              borderRadius: '50%',
              background: `linear-gradient(135deg,
                rgba(0,200,255,0.28) 0%, transparent 30%,
                rgba(255,0,200,0.22) 50%, transparent 70%,
                rgba(0,180,255,0.28) 100%)`,
              maskImage: 'radial-gradient(circle, transparent 52%, black 100%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 52%, black 100%)',
            }} />
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CAPA B — ÍCONOS & LABELS (z-[110])
          Elemento fixed COMPLETAMENTE SEPARADO de la Capa A.
          No tiene ningún padre con filter/backdrop-filter,
          por lo que SIEMPRE se pinta encima de la barra.
          ══════════════════════════════════════════════════ */}
      <div
        className="fixed left-0 w-full flex justify-center pointer-events-none z-[110]"
        style={{ bottom: BAR_BOTTOM }}
      >
        <div
          ref={iconsRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            width: BAR_WIDTH,
            maxWidth: BAR_MAX,
            height: BAR_H,
            padding: '0 4px',
            pointerEvents: 'auto',
          }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className="ltb-tab"
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  gap: 3,
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                <motion.div
                  animate={{ y: isActive ? -14 : 0, scale: isActive ? 1.15 : 1 }}
                  transition={{ type: 'spring', ...ICON_SPRING }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                >
                  <Icon
                    size={isActive ? 24 : 22}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    style={{
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                      filter: isActive ? 'drop-shadow(0 0 7px rgba(255,255,255,0.4))' : 'none',
                    }}
                  />
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  }}>
                    {tab.label}
                  </span>
                </motion.div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
