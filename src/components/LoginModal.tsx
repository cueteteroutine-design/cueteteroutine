import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: () => void;
}

export function LoginModal({ open, onOpenChange, onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState(''); // Changed from email to username
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://wkvicmgacjdoraoufprw.supabase.co/functions/v1/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        }),
      });

      const data = await response.json();
      
      console.log('Login response:', data); // For debugging

      if (!response.ok && response.status !== 200) {
        // Handle server errors (500, 503, etc.)
        throw new Error(data.error || `Login failed with status ${response.status}`);
      }
      
      if (data.success) {
        // Login successful
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.admin.username}!`,
          variant: "default",
        });
        
        // Store token and user info
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        
        // Call success callback
        onLoginSuccess();
        
        // Reset form and close modal
        setUsername('');
        setPassword('');
        onOpenChange(false);
      } else {
        // Login failed
        toast({
          title: "Login Failed",
          description: data.error || 'Invalid credentials',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', "Login Failed");
      
      // Check for network errors
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your connection or contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Error",
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!isLoading) {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Admin Login
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !username.trim() || !password.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </>
            )}
          </Button>

          <div className="text-xs text-center text-muted-foreground space-y-1">
            <p>Admin access is required to manage batches, teachers, rooms, and schedules.</p>
            <p>Please contact your system administrator for login credentials.</p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
