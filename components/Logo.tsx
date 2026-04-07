export default function Logo({ size = 'md', showText = true }: { size?: 'sm' | 'md' | 'lg' | 'xl'; showText?: boolean }) {
  const imgSize = size === 'xl' ? 80 : size === 'lg' ? 48 : size === 'md' ? 32 : 24;
  const textSize = size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base';

  return (
    <div className="flex items-center gap-2">
      {/* Pearl logo with subtle animation */}
      <div className="relative shrink-0" style={{ width: imgSize, height: imgSize }}>
        <img
          src="/logo-perla.png"
          alt="La Perla"
          width={imgSize}
          height={imgSize}
          className="w-full h-full object-contain pearl-glow"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(200, 170, 120, 0.4))' }}
        />
      </div>
      {showText && (
        <span className={`${textSize} font-bold leading-tight tracking-tight`} style={{ fontFamily: '"DM Sans", sans-serif', color: '#222222' }}>
          <span style={{ color: '#C9A05C' }}>La</span>
          <span> Perla</span>
        </span>
      )}

      <style jsx>{`
        .pearl-glow {
          animation: pearlShine 4s ease-in-out infinite;
        }
        @keyframes pearlShine {
          0%, 100% { filter: drop-shadow(0 2px 8px rgba(200, 170, 120, 0.3)) brightness(1); }
          50% { filter: drop-shadow(0 4px 16px rgba(200, 170, 120, 0.6)) brightness(1.08); }
        }
      `}</style>
    </div>
  );
}
