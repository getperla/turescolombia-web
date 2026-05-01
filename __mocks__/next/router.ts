const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn().mockResolvedValue(undefined),
  pathname: '/',
  query: {},
  route: '/',
  asPath: '/',
  isReady: true,
  events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
};

export const useRouter = jest.fn(() => mockRouter);

const router = { useRouter };
export default router;
