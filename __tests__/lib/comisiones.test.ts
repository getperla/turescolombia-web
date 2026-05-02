// Test puro de logica de negocio. Sin React, sin mocks.
// La comision del jalador es 20% del precio adulto. Si el backend retorna
// commissionPct propio en el futuro, este test debera actualizarse para
// usar esa fuente de verdad.

describe('Logica de comisiones del jalador', () => {
  const calcularComision = (precioAdulto: number) => Math.round(precioAdulto * 0.20);

  const calcularTotal = (
    precioAdulto: number,
    precioNino: number | undefined,
    adultos: number,
    ninos: number,
  ) => {
    // ?? en vez de || para que precioNino === 0 (tour gratis para ninos)
    // no caiga al fallback del 70%.
    const precioNinoFinal = precioNino ?? Math.round(precioAdulto * 0.7);
    return precioAdulto * adultos + precioNinoFinal * ninos;
  };

  test('comision es exactamente 20% del precio adulto', () => {
    expect(calcularComision(160000)).toBe(32000);
    expect(calcularComision(75000)).toBe(15000);
    expect(calcularComision(350000)).toBe(70000);
  });

  test('total con solo adultos es precio * cantidad', () => {
    expect(calcularTotal(160000, undefined, 2, 0)).toBe(320000);
    expect(calcularTotal(75000, undefined, 3, 0)).toBe(225000);
  });

  test('precio nino usa el valor explicito si existe', () => {
    expect(calcularTotal(160000, 112000, 1, 1)).toBe(272000);
  });

  test('precio nino es 70% del adulto cuando no esta definido', () => {
    expect(calcularTotal(160000, undefined, 1, 1)).toBe(272000);
  });

  test('precio nino 0 no colapsa al fallback del 70% (tour gratis para ninos)', () => {
    expect(calcularTotal(160000, 0, 1, 1)).toBe(160000);
  });
});
