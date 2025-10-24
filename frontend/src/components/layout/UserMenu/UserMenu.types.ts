export interface UserMenuProps {
  isAuthenticated?: boolean;
  user?: {
    name: string;
    email: string;
    username?: string;
    avatar?: string;
    role?: string;
    isAdmin?: boolean;
    brandSlug?: string; // Brand's public profile slug
  };
  onLogout?: () => void;
  className?: string;
}