export type ApiResponse<T = unknown> = {
  data: T;
  status: number;
};

export type RequestConfig = {
  params?: Record<string, string | number | undefined>;
};

/**
 * Forma del error que tira el wrapper de fetch.
 * Re-implementa el shape de axios para mantener compat con call-sites
 * que leen err.response.data.message.
 */
export type ApiErrorShape = {
  name: 'ApiError';
  message: string;
  response?: {
    data: unknown;
    status: number;
  };
};
