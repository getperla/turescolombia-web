import Image from 'next/image';
import Link from 'next/link';
import type { MockTour } from '../../lib/agente/mock';

type Props = {
  tour: MockTour;
  people: number;
  // Indice visual (1, 2, 3...) para mostrar "Día 1, Día 2..."
  index?: number;
};

const COP = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 });

export default function TourCard({ tour, people, index }: Props) {
  const subtotal = tour.price_adult * people;
  const includes = (tour.includes ?? []).slice(0, 2);

  return (
    <Link
      href={`/tour/${tour.slug}`}
      style={{
        display: 'flex',
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #EBEBEB',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        animation: 'tourCardIn 0.4s cubic-bezier(0.2, 0.9, 0.3, 1) both',
      }}
      className="tour-card-hover"
    >
      <div
        style={{
          position: 'relative',
          width: '96px',
          minWidth: '96px',
          background: '#F0F0F0',
        }}
      >
        {tour.cover_image_url ? (
          <Image
            src={tour.cover_image_url}
            alt={tour.name}
            fill
            sizes="96px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0D5C8A, #0A1628)',
              color: 'white',
              fontSize: '28px',
            }}
          >
            🏖️
          </div>
        )}
        {index && (
          <div
            style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              background: 'rgba(10,22,40,0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
              letterSpacing: '0.02em',
            }}
          >
            DÍA {index}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#222',
              lineHeight: 1.3,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {tour.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: '#717171',
              marginBottom: '4px',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <span style={{ color: '#222' }}>★</span>
              <span style={{ color: '#222', fontWeight: 600 }}>
                {tour.avg_rating.toFixed(1)}
              </span>
            </span>
            <span style={{ color: '#DDD' }}>·</span>
            <span>{tour.duration}</span>
          </div>
          {includes.length > 0 && (
            <div
              style={{
                fontSize: '11px',
                color: '#717171',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              ✓ {includes.join(' · ')}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginTop: '6px',
          }}
        >
          <div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#F5882A' }}>
              ${COP(tour.price_adult)}
            </span>
            <span style={{ fontSize: '11px', color: '#717171', marginLeft: '4px' }}>
              /persona
            </span>
          </div>
          {people > 1 && (
            <span
              style={{
                fontSize: '11px',
                color: '#222',
                fontWeight: 600,
                background: '#F7F7F7',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              ${COP(subtotal)} grupo
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes tourCardIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .tour-card-hover:hover,
        .tour-card-hover:active {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }
      `}</style>
    </Link>
  );
}
