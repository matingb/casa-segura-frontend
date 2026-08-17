export type PaginatedResponse<T> = {
  status: 'success';
  data: T[];
  page: { hasMore: boolean };
};
