// Tests para lib/pricing.ts
// Plan 3: commissions-ledger-cron-platform-fee
// Created: 2026-04-27
//
// Coverage target > 90%. Pure functions tests, sin mocks.

import { describe, it, expect } from 'vitest';
import {
  calculateBreakdown,
  calculateGroupPrice,
  formatCop,
  roundToCop,
  DEFAULT_COMMISSION,
  type CommissionConfig,
} from '../../lib/pricing';

describe('roundToCop', () => {
  it('redondea hacia arriba a centenas', () => {
    expect(roundToCop(5880)).toBe(5900);
    expect(roundToCop(5800)).toBe(5800);
    expect(roundToCop(5801)).toBe(5900);
    expect(roundToCop(73523)).toBe(73600);
  });

  it('cero queda en cero', () => {
    expect(roundToCop(0)).toBe(0);
  });

  it('valores chicos redondean a 100', () => {
    expect(roundToCop(1)).toBe(100);
    expect(roundToCop(99)).toBe(100);
  });
});

describe('calculateBreakdown', () => {
  it('caso base: $100.000 con default 20/8/72', () => {
    const r = calculateBreakdown(100000);
    expect(r.subtotal).toBe(100000);
    expect(r.platformFee).toBe(8000);
    expect(r.jaladorAmount).toBe(20000);
    expect(r.operatorAmount).toBe(80000);
    expect(r.total).toBe(108000);
  });

  it('precio raro $73.500 con default 20/8/72', () => {
    const r = calculateBreakdown(73500);
    expect(r.subtotal).toBe(73500);
    expect(r.platformFee).toBe(roundToCop(73500 * 0.08)); // 5880 -> 5900
    expect(r.platformFee).toBe(5900);
    expect(r.jaladorAmount).toBe(roundToCop(73500 * 0.20)); // 14700 -> 14700
    expect(r.jaladorAmount).toBe(14700);
    expect(r.operatorAmount).toBe(73500 - 14700); // 58800
    expect(r.total).toBe(73500 + 5900); // 79400
  });

  it('config personalizada 25/10/65', () => {
    const config: CommissionConfig = { jaladorPct: 0.25, platformPct: 0.10, operatorPct: 0.65 };
    const r = calculateBreakdown(200000, config);
    expect(r.platformFee).toBe(20000);
    expect(r.jaladorAmount).toBe(50000);
    expect(r.operatorAmount).toBe(150000);
    expect(r.total).toBe(220000);
  });

  it('precio cero genera breakdown valido', () => {
    const r = calculateBreakdown(0);
    expect(r.total).toBe(0);
    expect(r.jaladorAmount).toBe(0);
    expect(r.platformFee).toBe(0);
  });

  it('precio negativo lanza error', () => {
    expect(() => calculateBreakdown(-1)).toThrow(/no puede ser negativo/);
  });

  it('porcentajes que no suman 1.0 lanzan error', () => {
    const config: CommissionConfig = { jaladorPct: 0.30, platformPct: 0.30, operatorPct: 0.30 };
    expect(() => calculateBreakdown(100000, config)).toThrow(/deben sumar 1\.0/);
  });

  it('default config suma exactamente 1.0', () => {
    const sum = DEFAULT_COMMISSION.jaladorPct + DEFAULT_COMMISSION.platformPct + DEFAULT_COMMISSION.operatorPct;
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.0001);
  });
});

describe('calculateGroupPrice', () => {
  it('2 adultos sin niños', () => {
    expect(calculateGroupPrice(50000, 2, 0)).toBe(100000);
  });

  it('1 adulto + 2 niños sin priceChild explicito (70% adulto)', () => {
    // adultPrice 50000, childPrice = 35000 (70% de 50000)
    // total = 1*50000 + 2*35000 = 120000
    expect(calculateGroupPrice(50000, 3, 2)).toBe(120000);
  });

  it('1 adulto + 1 niño con priceChild explicito', () => {
    expect(calculateGroupPrice(50000, 2, 1, 30000)).toBe(80000);
  });

  it('priceChild=null usa fallback 70%', () => {
    expect(calculateGroupPrice(100000, 2, 1, null)).toBe(170000);
  });

  it('priceChild=0 usa el cero (no fallback)', () => {
    // Edge case: tour gratis para niños (ej: promocion)
    expect(calculateGroupPrice(50000, 3, 2, 0)).toBe(50000);
  });

  it('grupo de 1 adulto solo', () => {
    expect(calculateGroupPrice(50000, 1, 0)).toBe(50000);
  });
});

describe('formatCop', () => {
  it('formatea con thousand separator de punto', () => {
    expect(formatCop(108000)).toBe('$108.000');
    expect(formatCop(1000000)).toBe('$1.000.000');
  });

  it('redondea decimales', () => {
    expect(formatCop(5900.49)).toBe('$5.900');
    expect(formatCop(5900.5)).toBe('$5.901');
  });

  it('valores chicos sin separador', () => {
    expect(formatCop(500)).toBe('$500');
    expect(formatCop(0)).toBe('$0');
  });
});
