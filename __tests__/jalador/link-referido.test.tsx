import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../lib/api');
jest.mock('../../lib/auth');
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    query: { refCode: 'PED-0001', tour: 'cabo-san-juan' },
    push: jest.fn(),
    replace: jest.fn(),
    asPath: '/j/PED-0001/cabo-san-juan',
    isReady: true,
  })),
}));
jest.mock('../../components/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement('div', null, children),
}));

import api, { mockTour, mockJalador, mockBooking, getTourBySlug } from '../../lib/api';
import JaladorTourLink from '../../pages/j/[refCode]/[tour]';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedGetTourBySlug = getTourBySlug as jest.MockedFunction<typeof getTourBySlug>;

describe('Pagina de tour por link de jalador', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetTourBySlug.mockResolvedValue(mockTour as any);
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/users/jaladores/ref/')) {
        return Promise.resolve({ data: mockJalador, status: 200 });
      }
      return Promise.resolve({ data: {}, status: 200 });
    });
  });

  test('muestra el nombre del tour cuando carga', async () => {
    render(<JaladorTourLink />);
    await waitFor(() => {
      expect(screen.getAllByText(/Cabo San Juan/i).length).toBeGreaterThan(0);
    });
  });

  test('muestra el precio del tour formateado en COP', async () => {
    render(<JaladorTourLink />);
    await waitFor(() => {
      // 160000 con toLocaleString — 160,000 (en-US) o 160.000 (es-CO).
      expect(screen.getAllByText(/160[.,]000/).length).toBeGreaterThan(0);
    });
  });

  test('muestra el nombre del jalador cuando el endpoint /users/jaladores/ref/ resuelve', async () => {
    render(<JaladorTourLink />);
    await waitFor(() => {
      expect(screen.getByText(/Juan David Vergel/i)).toBeInTheDocument();
    });
  });

  test('valida que la fecha es requerida antes de reservar', async () => {
    const user = userEvent.setup();
    render(<JaladorTourLink />);
    // Hay 2 botones 'Reservar ahora' en el DOM (sticky mobile + desktop) —
    // JSDOM ignora media queries asi que ambos estan presentes. Usar el
    // primero, ambos disparan el mismo handler.
    await waitFor(() => screen.getAllByRole('button', { name: /Reservar ahora/i })[0]);

    const reservar = screen.getAllByRole('button', { name: /Reservar ahora/i })[0];
    await user.click(reservar);

    await waitFor(() => {
      expect(screen.getByText(/Selecciona una fecha/i)).toBeInTheDocument();
    });
  });

  test('envia POST /bookings con tourId, refCode, fecha y datos del cliente', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: mockBooking, status: 200 });

    const { container } = render(<JaladorTourLink />);
    await waitFor(() => screen.getByPlaceholderText(/Nombre/i));

    await user.type(screen.getByPlaceholderText(/Nombre/i), 'Carlos');
    await user.type(screen.getByPlaceholderText(/300 000 0000/i), '3001234567');

    // El input type=date no se asocia a un label via htmlFor; lo encontramos
    // por selector directo.
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).not.toBeNull();
    fireEvent.change(dateInput, { target: { value: '2026-06-15' } });

    const reservar = screen.getAllByRole('button', { name: /Reservar ahora/i })[0];
    await user.click(reservar);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/bookings',
        expect.objectContaining({
          tourId: 1,
          refCode: 'PED-0001',
          clientName: 'Carlos',
          clientPhone: '3001234567',
          tourDate: '2026-06-15',
        }),
      );
    });
  });

  test('tras pago exitoso muestra el bookingCode de la reserva', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: mockBooking, status: 200 });

    const { container } = render(<JaladorTourLink />);
    await waitFor(() => screen.getByPlaceholderText(/Nombre/i));

    await user.type(screen.getByPlaceholderText(/Nombre/i), 'Carlos');
    await user.type(screen.getByPlaceholderText(/300 000 0000/i), '3001234567');

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-06-15' } });

    const reservar = screen.getAllByRole('button', { name: /Reservar ahora/i })[0];
    await user.click(reservar);

    await waitFor(() => {
      expect(screen.getByText(/LP-TEST-001/i)).toBeInTheDocument();
    });
  });
});
