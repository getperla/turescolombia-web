export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base';

  return (
    <div className={`${textSize} font-bold leading-tight tracking-tight`} style={{ fontFamily: '"DM Sans", sans-serif' }}>
      <span style={{ color: '#F5882A' }}>Tures</span>
      <span style={{ color: '#222222' }}>Colombia</span>
    </div>
  );
}
