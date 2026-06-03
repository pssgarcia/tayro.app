export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  role: 'BRAND' | 'INFLUENCER';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: 'BRAND' | 'INFLUENCER' | 'ADMIN';
  };
}
