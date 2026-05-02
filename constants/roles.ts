export const ROLES = {
  TOURIST: 'tourist',
  JALADOR: 'jalador',
  OPERATOR: 'operator',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
