import React from 'react';

export const mockAuthUser = {
  id: 1,
  name: 'Juan David Vergel',
  email: 'pedro.jalador@laperla.co',
  role: 'jalador' as const,
};

export const useAuth = jest.fn(() => ({
  user: null as typeof mockAuthUser | null,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
}));

export const useRequireAuth = jest.fn(() => ({
  user: mockAuthUser,
  loading: false,
  authorized: true,
}));

export const AuthProvider = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);
