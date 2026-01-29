
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Prize } from '../types';
import { SCRATCH_THRESHOLD } from '../constants';

interface ScratchCardProps {
  prize: Prize;
  onComplete: () => void;
  primaryColor: string;
  initialRevealed?: boolean;
}

export interface ScratchCardRef {
  reveal: () => void;
}

const ScratchCard = forwardRef<ScratchCardRef, ScratchCardProps>(({ prize, onComplete, primaryColor, initialRevealed = false }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealed, setRevealed] = useState(initialRevealed);

  useImperativeHandle(ref, () => ({
    reveal: () => {
      setRevealed(true);
      onComplete();
    }
  }));

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || revealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offsetWidth, offsetHeight } = container;
    canvas.width = offsetWidth;
    canvas.height = offsetHeight;

    ctx.fillStyle = '#64748b'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RASPE AQUI', canvas.width / 2, canvas.height / 2);
  }, [revealed]);

  useEffect(() => {
    initCanvas();
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!revealed) initCanvas();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [initCanvas, revealed]);

  const checkScratchPercentage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparentPixels++;
    }

    const percentage = (transparentPixels / (pixels.length / 4)) * 100;
    if (percentage > SCRATCH_THRESHOLD) {
      setRevealed(true);
      onComplete();
    }
  }, [onComplete, revealed]);

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const posX = x - rect.left;
    const posY = y - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(posX, posY, 35, 0, Math.PI * 2);
    ctx.fill();

    checkScratchPercentage();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing) scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDrawing(true);
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDrawing) {
      const touch = e.touches[0];
      scratch(touch.clientX, touch.clientY);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700 transition-transform duration-500 ${revealed && prize.iswinning ? 'scale-[1.02] ring-4 ring-yellow-400/20' : ''}`}
    >
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .confetti {
          position: absolute;
          top: -20px;
          animation: confetti-fall linear infinite;
        }
      `}</style>

      <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-slate-900 transition-all duration-700 ${revealed && prize.iswinning ? 'bg-gradient-to-b from-indigo-900/50 via-slate-900 to-indigo-900/40' : ''}`}>
        
        {revealed && prize.iswinning && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(40)].map((_, i) => {
              const size = Math.random() * 8 + 4;
              const duration = Math.random() * 2 + 2;
              const delay = Math.random() * 2;
              const left = Math.random() * 100;
              const colors = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#ffffff'];
              const isCircle = Math.random() > 0.5;
              
              return (
                <div 
                  key={i}
                  className="confetti"
                  style={{
                    left: `${left}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: colors[i % colors.length],
                    borderRadius: isCircle ? '50%' : '0%',
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                />
              );
            })}
          </div>
        )}

        <div className={`mb-3 text-6xl transition-all duration-700 transform ${revealed ? 'scale-110 rotate-0' : 'scale-90 rotate-0'} ${revealed && prize.iswinning ? 'animate-bounce' : ''}`}>
          {prize.iswinning ? '🎁' : '❌'}
        </div>
        
        <h3 className={`text-2xl font-black mb-1 transition-colors duration-500 ${prize.iswinning ? 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]' : 'text-slate-200'}`}>
          {prize.name}
        </h3>
        
        <p className="text-slate-400 text-sm font-medium italic max-w-[80%]">
          {prize.description}
        </p>

        {revealed && prize.iswinning && (
          <div className="mt-4 px-4 py-1.5 bg-yellow-400/20 border border-yellow-400/40 rounded-full animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.2)]">
            <span className="text-[11px] font-black text-yellow-400 uppercase tracking-[0.2em] drop-shadow-sm">VOCÊ GANHOU!</span>
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair transition-opacity duration-700 w-full h-full"
        style={{ opacity: revealed ? 0 : 1, pointerEvents: revealed ? 'none' : 'auto' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      />
    </div>
  );
});

export default ScratchCard;
