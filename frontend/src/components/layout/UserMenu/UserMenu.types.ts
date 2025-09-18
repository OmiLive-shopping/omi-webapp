export interface UserMenuProps {
  isAuthenticated?: boolean;
  user?: {
    name: string;
    email: string;
    username?: string;
    avatar?: string;
    role?: string;
    isAdmin?: boolean;
  };
  onLogout?: () => void;
  className?: string;
}