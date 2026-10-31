import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LiquidGlassContextType {
  reduceTransparency: boolean;
  setReduceTransparency: (val: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (val: boolean) => void;
  ambientGlow: boolean;
  setAmbientGlow: (val: boolean) => void;
}

const LiquidGlassContext = createContext<LiquidGlassContextType | undefined>(undefined);

export const LiquidGlassProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reduceTransparency, setReduceTransparencyState] = useState<boolean>(() => {
    const saved = localStorage.getItem('rf_reduce_transparency');
    if (saved !== null) return saved === 'true';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    }
    return false;
  });

  const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
    const saved = localStorage.getItem('rf_reduce_motion');
    if (saved !== null) return saved === 'true';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const [ambientGlow, setAmbientGlowState] = useState<boolean>(() => {
    const saved = localStorage.getItem('rf_ambient_glow');
    return saved !== null ? saved === 'true' : true;
  });

  const setReduceTransparency = (val: boolean) => {
    setReduceTransparencyState(val);
    localStorage.setItem('rf_reduce_transparency', String(val));
  };

  const setReduceMotion = (val: boolean) => {
    setReduceMotionState(val);
    localStorage.setItem('rf_reduce_motion', String(val));
  };

  const setAmbientGlow = (val: boolean) => {
    setAmbientGlowState(val);
    localStorage.setItem('rf_ambient_glow', String(val));
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('reduce-transparency', reduceTransparency);
    }
  }, [reduceTransparency]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('reduce-motion', reduceMotion);
    }
  }, [reduceMotion]);

  return (
    <LiquidGlassContext.Provider
      value={{
        reduceTransparency,
        setReduceTransparency,
        reduceMotion,
        setReduceMotion,
        ambientGlow,
        setAmbientGlow
      }}
    >
      {children}
    </LiquidGlassContext.Provider>
  );
};

export const useLiquidGlass = () => {
  const context = useContext(LiquidGlassContext);
  if (!context) {
    throw new Error('useLiquidGlass must be used within a LiquidGlassProvider');
  }
  return context;
};
