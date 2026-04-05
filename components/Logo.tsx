export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-lg';

  return (
    <div className={`${textSize} leading-tight tracking-tight`}>
      <span className="font-display font-bold text-current">Tures</span>
      <span className="font-display font-bold italic" style={{ color: '#F5882A' }}>Colombia</span>
    </div>
  );
}
