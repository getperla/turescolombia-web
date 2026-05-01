export type Booking = {
  id: number;
  bookingCode: string;
  tourDate: string;
  numAdults: number;
  numChildren: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  qrCode: string;
  source: string;
  refCode?: string;
  cancelReason?: string;
  createdAt: string;
  tour: {
    id: number;
    name: string;
    slug: string;
    departureTime: string;
    departurePoint: string;
    coverImageUrl?: string;
    operator: { companyName: string };
  };
  review?: { id: number } | null;
};

export type ReviewData = {
  bookingId: number;
  tourRating: number;
  jaladorRating?: number;
  tourComment?: string;
  jaladorComment?: string;
};

export type Review = ReviewData;

export type ReviewItem = {
  id: number;
  tourRating?: number;
  jaladorRating?: number;
  tourComment?: string;
  jaladorComment?: string;
  createdAt: string;
  author: { id: number; name: string; avatarUrl?: string };
  operatorReply?: string;
  operatorReplyAt?: string;
};
