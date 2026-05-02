export type Role = 'tourist' | 'jalador' | 'operator' | 'admin';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
};

export type Jalador = {
  id: number;
  bio?: string;
  zone?: string;
  languages: string[];
  yearsExperience: number;
  score: number;
  totalSales: number;
  badge: string;
  refCode: string;
  user: { id: number; name: string; avatarUrl?: string };
};

export type Operator = {
  id: number;
  companyName: string;
  rntNumber?: string;
  score: number;
  isApproved: boolean;
  user?: { id: number; name: string; email: string; avatarUrl?: string };
};

export type Tourist = {
  id: number;
  totalBookings: number;
  totalSpent: number;
  user?: { id: number; name: string; email: string };
};
