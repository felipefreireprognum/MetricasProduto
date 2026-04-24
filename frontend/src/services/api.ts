import axios from 'axios';
import type { Credentials } from '@/types/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({ baseURL: BASE_URL, timeout: 180000 });

let _credentials: Credentials | null = null;

export function setCredentials(creds: Credentials | null) {
  _credentials = creds;
}

api.interceptors.request.use((config) => {
  if (_credentials) {
    const isInter = config.url?.startsWith('/inter');
    config.params = {
      login: _credentials.login,
      senha: _credentials.senha,
      ...(isInter ? {} : { ambiente: _credentials.ambiente }),
      ...config.params,
    };
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail || err.message;
    return Promise.reject(new Error(detail));
  }
);
