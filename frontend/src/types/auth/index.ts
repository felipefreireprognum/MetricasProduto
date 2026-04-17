export interface Credentials {
  login: string;
  senha: string;
  ambiente: string;
}

export interface AuthState {
  credentials: Credentials | null;
  isAuthenticated: boolean;
}
