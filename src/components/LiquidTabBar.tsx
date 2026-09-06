/**
 * LiquidTabBar — iOS 26 style floating glass pill tab bar
 *
 * Arquitectura simple y correcta:
 * - UN solo contenedor fixed
 * - El fondo glass (backdropFilter) es un div absoluto DETRÁS de todo
 * - Los íconos son elementos normales encima, sin ningún filtro en sus padres
 * - El indicador activo se mueve con spring animation
 * - Sin SVG goo filter (causaba blurring de íconos en Capacitor WebView)
 */

import React, { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { Home, Search, Library, Download, Settings as SettingsIcon } from 'lucide-react';

const TABS = [
  { id: 'home',      icon: Home,          label: 'Inicio'    },
  { id: 'search',    icon: Search,        label: 'Buscar'    },
  { id: 'library',   icon: Library,       label: 'Librería'  },
  { id: 'downloads', icon: Download,      label: 'Descargas' },
  { id: 'settings',  icon: SettingsIcon,  label: 'Ajustes'   },
] as const;

type TabId = typeof TABS[number]['id'];

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28, mass: 0.9 };

export const LiquidTabBar = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (id: string) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [centers, setCenters] = useState<number[]>([]);

  // Motion value para el indicador activo
  const indicatorX = useMotionValue(0);
  const smoothX    = useSpring(indicatorX, { stiffness: 300, damping: 26, mass: 0.85 });

  // Medir centros de cada botón
  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const rowRect = row.getBoundingClientRect();
    const btns = row.querySelectorAll<HTMLElement>('[data-tab]');
    const cs: number[] = [];
    btns.forEach(btn => {
      const r = btn.getBoundingClientRect();
      cs.push(r.left - rowRect.left + r.width / 2);
    });
    setCenters(cs);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (rowRef.current) ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Mover indicador al tab activo
  useEffect(() => {
    if (!centers.length) return;
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx >= 0 && centers[idx] != null) {
      indicatorX.set(centers[idx]);
    }
  }, [activeTab, centers, indicatorX]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        // Espacio para safe area (notch/home indicator de iPhone)
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 8,
        // z-index alto pero sin filter/backdrop-filter en este nivel
        zIndex: 9000,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          height: 68,
          pointerEvents: 'auto',
        }}
      >
        {/* ── Fondo glass de la barra ──
            backdropFilter aplicado SOLO a este div.
            No tiene hijos — está completamente debajo del resto. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 34,
            // El blur real de iOS — blurs el contenido de la página detrás
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            // Tono oscuro translúcido, como UIBlurEffect.dark
            backgroundColor: 'rgba(28, 28, 30, 0.72)',
            // Borde sutil
            border: '0.5px solid rgba(255,255,255,0.14)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        />

        {/* ── Indicador del tab activo (burbuja que se mueve) ──
            Posicionado absoluto, se mueve con spring.
            El zIndex: 1 lo pone por encima del fondo, debajo de los íconos. */}
        <motion.div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 6,
            width: 56,
            height: 56,
            borderRadius: 28,
            x: smoothX,
            translateX: '-50%',
            backgroundColor: 'rgba(255,255,255,0.13)',
            border: '0.5px solid rgba(255,255,255,0.22)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 12px rgba(0,0,0,0.2)',
            zIndex: 1,
          }}
        />

        {/* ── Íconos y etiquetas ──
            zIndex: 2 — encima de todo. Sin ningún filtro en ningún padre. */}
        <div
          ref={rowRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0 4px',
            zIndex: 2,
          }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  padding: 0,
                }}
              >
                <motion.div
                  animate={{
                    y:     isActive ? -10 : 0,
                    scale: isActive ? 1.12 : 1,
                  }}
                  transition={SPRING}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <Icon
                    size={isActive ? 24 : 22}
                    strokeWidth={isActive ? 2.2 : 1.7}
                    color={isActive ? '#ffffff' : 'rgba(255,255,255,0.48)'}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: '0.02em',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
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
      </div>
    </div>
  );
};
