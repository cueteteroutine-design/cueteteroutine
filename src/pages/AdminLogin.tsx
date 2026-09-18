import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { adminLogin } from '@/lib/adminApi';
import { useAdmin } from '@/contexts/AdminContext';
import { Lock, User, ArrowLeft, Eye, EyeOff, LockOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminLogin() {
  const [username, setUsername] = useState('ETE_ADMIN');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshAuth } = useAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both username and password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await adminLogin(username.trim(), password);
      await refreshAuth();
      toast({
        title: 'Login Successful',
        description: 'Welcome to the admin dashboard',
      });
      navigate('/admin/dashboard');
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all mb-8 group px-3 py-1.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Schedule</span>
          </Link>

          {/* Login Card */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
            <CardHeader className="space-y-4 px-6 sm:px-8 pt-8 pb-6">
              {/* Lock Icon */}
              <div className="flex justify-center mb-2">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {isLoading ? (
                    <LockOpen className="h-7 w-7 text-slate-700 dark:text-slate-300 animate-pulse" />
                  ) : (
                    <Lock className="h-7 w-7 text-slate-700 dark:text-slate-300" />
                  )}
                </div>
              </div>

              {/* Title - Centered */}
              <div className="text-center">
                <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Admin Login
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                  Enter your credentials to access the admin panel
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="px-6 sm:px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username field */}
                <div className="space-y-2">
                  <Label 
                    htmlFor="username" 
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all hover:border-slate-400 dark:hover:border-slate-600"
                      autoComplete="username"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label 
                      htmlFor="password" 
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-all hover:border-slate-400 dark:hover:border-slate-600"
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Login button */}
                <Button 
                  type="submit" 
                  className="w-full h-11 font-medium bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 hover:shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {/* Help text */}
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 pt-4">
                  Contact your system administrator if you need assistance
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
