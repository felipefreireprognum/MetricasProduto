export interface ApiResponse<T> {
  data: T;
  ok: boolean;
}

export interface ApiError {
  detail: string;
  status: number;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
