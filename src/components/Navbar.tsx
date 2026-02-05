import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, LogOut, User, Play, LayoutDashboard } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    return user.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to={getDashboardLink()} className="flex items-center gap-2">
          <Play className="h-8 w-8 text-primary fill-primary" />
          <span className="text-xl font-bold">Meanttor</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.role === 'user' && (
                <Link to="/student/courses">
                  <Button variant="ghost">Browse Courses</Button>
                </Link>
              )}
              <Link to={getDashboardLink()}>
                <Button variant="ghost" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              {user.role === 'user' && (
                <Link to="/wallet" className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="font-semibold">₹{user.wallet_balance?.toFixed(2) || '0.00'}</span>
                </Link>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-5 w-5" />
                <span>{user.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
