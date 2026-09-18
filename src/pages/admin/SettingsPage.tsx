import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { changePassword } from '@/lib/adminApi';
import { useAdmin } from '@/contexts/AdminContext';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { username } = useAdmin();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 10) {
      toast({ title: 'Error', description: 'Password must be at least 10 characters', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await changePassword(username!, currentPassword, newPassword);
      toast({ title: 'Success', description: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to change password', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header - Centered */}
      <div className="text-center space-y-1 sm:space-y-2">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your admin account and security
        </p>
      </div>

      {/* Centered Card Container */}
      <div className="flex justify-center">
        <div className="w-full max-w-lg">
          <Card className="border">
            <CardHeader className="pb-2 sm:pb-3 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <KeyRound className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="text-center sm:text-left">
                  <CardTitle className="text-base sm:text-lg md:text-xl">Change Password</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Update your admin password securely
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="current" className="text-sm">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input 
                      id="current" 
                      type="password" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 text-sm sm:text-base h-8 sm:h-9 md:h-10"
                      placeholder="Enter current password"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="new" className="text-sm">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input 
                      id="new" 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 text-sm sm:text-base h-8 sm:h-9 md:h-10"
                      placeholder="Enter new password (min 10 characters)"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="confirm" className="text-sm">Confirm New Password</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input 
                      id="confirm" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 text-sm sm:text-base h-8 sm:h-9 md:h-10"
                      placeholder="Confirm your new password"
                    />
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="rounded-lg border p-3 sm:p-4 bg-muted/20">
                  <p className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Password Requirements:</p>
                  <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 ${newPassword.length >= 10 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>At least 10 characters long</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 ${newPassword && confirmPassword && newPassword === confirmPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>Passwords must match</span>
                    </li>
                  </ul>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Changing Password...</span>
                    </div>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
