export type Tour = {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  priceAdult: number;
  priceChild?: number;
  maxPeople: number;
  departurePoint: string;
  departureTime: string;
  returnTime: string;
  location: string;
  duration: string;
  durationHours?: number;
  includes: string[];
  excludes: string[];
  restrictions: string[];
  observations?: string;
  coverImageUrl?: string;
  galleryUrls: string[];
  status: string;
  isFeatured: boolean;
  avgRating: number;
  totalReviews: number;
  totalBookings: number;
  operator: {
    id: number;
    companyName: string;
    logoUrl?: string;
    score: number;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  colorHex?: string;
};

export type TourFilters = {
  sortBy?: 'rating' | 'price' | 'created';
  order?: 'asc' | 'desc';
  limit?: string | number;
  myTours?: 'true' | 'false';
};
