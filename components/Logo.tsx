export default function Logo({ size = 'md', showText = true, spinning = false }: { size?: 'sm' | 'md' | 'lg' | 'xl'; showText?: boolean; spinning?: boolean }) {
  const pearlSize = size === 'xl' ? 80 : size === 'lg' ? 48 : size === 'md' ? 32 : 24;
  const textSize = size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`pearl-3d shrink-0 ${spinning ? 'pearl-spin' : 'pearl-float'}`}
        style={{ width: pearlSize, height: pearlSize }}
        role="img"
        aria-label="La Perla"
      >
        <div className="pearl-sphere" style={{ width: '100%', height: '100%' }}>
          <div className="pearl-shine" />
          <div className="pearl-highlight" />
        </div>
      </div>
      {showText && (
        <span className={`${textSize} font-bold leading-tight tracking-tight`} style={{ fontFamily: '"DM Sans", sans-serif', color: '#222222' }}>
          <span style={{ color: '#C9A05C' }}>La</span>
          <span> Perla</span>
        </span>
      )}

      <style jsx>{`
        .pearl-3d {
          perspective: 200px;
        }
        .pearl-sphere {
          position: relative;
          border-radius: 50%;
          background: radial-gradient(
            ellipse at 35% 30%,
            #FFFDF7 0%,
            #F5EDD6 15%,
            #E8D5A8 30%,
            #D4BC82 50%,
            #C9A05C 65%,
            #B8944F 80%,
            #A07840 100%
          );
          box-shadow:
            0 2px 8px rgba(180, 150, 80, 0.25),
            0 8px 24px rgba(160, 120, 50, 0.15),
            inset 0 -4px 12px rgba(120, 90, 30, 0.2),
            inset 0 4px 8px rgba(255, 255, 255, 0.4);
          overflow: hidden;
        }
        .pearl-shine {
          position: absolute;
          top: 12%;
          left: 18%;
          width: 35%;
          height: 28%;
          border-radius: 50%;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.5) 40%,
            rgba(255, 255, 255, 0) 70%
          );
          transform: rotate(-20deg);
        }
        .pearl-highlight {
          position: absolute;
          top: 55%;
          left: 55%;
          width: 20%;
          height: 15%;
          border-radius: 50%;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 255, 255, 0.4) 0%,
            rgba(255, 255, 255, 0) 70%
          );
        }
        .pearl-float {
          animation: pearlFloat 4s ease-in-out infinite;
        }
        .pearl-spin {
          animation: pearlSpin 1.2s linear infinite;
        }
        @keyframes pearlFloat {
          0%, 100% {
            transform: translateY(0px);
            filter: drop-shadow(0 4px 12px rgba(180, 150, 80, 0.3));
          }
          50% {
            transform: translateY(-3px);
            filter: drop-shadow(0 8px 20px rgba(180, 150, 80, 0.45));
          }
        }
        @keyframes pearlSpin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}
