import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../lib/api');
jest.mock('../../lib/auth');
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
    },
  },
  isSupabaseConfigured: jest.fn(() => false),
}));
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    query: { role: 'jalador' },
    push: jest.fn(),
    replace: jest.fn(),
    asPath: '/login?role=jalador',
    isReady: true,
  })),
}));
jest.mock('../../components/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement('div', null, children),
}));

import LoginPage from '../../pages/login';
import { magicLogin } from '../../lib/api';

const mockedMagicLogin = magicLogin as jest.MockedFunction<typeof magicLogin>;

describe('Magic login del jalador', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza la seccion de Acceso rapido Jalador con su input de codigo', () => {
    render(<LoginPage />);
    expect(screen.getByText(/Acceso rápido Jalador/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tu codigo/i)).toBeInTheDocument();
  });

  test('al ingresar codigo y click en Entrar como Jalador llama magicLogin', async () => {
    const user = userEvent.setup();
    mockedMagicLogin.mockResolvedValue({
      access_token: 'token-test',
      user: { id: 1, name: 'Juan', email: 'j@test.co', role: 'jalador' },
    } as any);

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/Tu codigo/i), 'PED-0001');
    await user.click(screen.getByRole('button', { name: /Entrar como Jalador/i }));

    await waitFor(() => {
      expect(mockedMagicLogin).toHaveBeenCalledWith('PED-0001', '');
    });
  });

  test('muestra el error del backend cuando el codigo es incorrecto', async () => {
    const user = userEvent.setup();
    mockedMagicLogin.mockRejectedValue({
      response: { data: { message: 'Codigo o telefono incorrecto' } },
    });

    render(<LoginPage />);
    await user.type(screen.getByPlaceholderText(/Tu codigo/i), 'INVALIDO');
    await user.click(screen.getByRole('button', { name: /Entrar como Jalador/i }));

    await waitFor(() => {
      expect(screen.getByText(/Codigo o telefono incorrecto/i)).toBeInTheDocument();
    });
  });
});
