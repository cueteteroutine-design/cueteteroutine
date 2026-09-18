import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher, Teacher } from '@/lib/adminApi';
import { Plus, Pencil, Trash2, User, UserCheck, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({ short_name: '', full_name: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTeachers = async () => {
    try {
      const data = await getTeachers();
      setTeachers(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load teachers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.short_name.trim() || !formData.full_name.trim()) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, formData);
        toast({ title: 'Success', description: 'Teacher updated successfully' });
      } else {
        await createTeacher(formData);
        toast({ title: 'Success', description: 'Teacher created successfully' });
      }
      setIsDialogOpen(false);
      setEditingTeacher(null);
      setFormData({ short_name: '', full_name: '' });
      loadTeachers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save teacher', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({ short_name: teacher.short_name, full_name: teacher.full_name });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTeacher(id);
      toast({ title: 'Success', description: 'Teacher deleted successfully' });
      loadTeachers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete teacher', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTeacher(null);
    setFormData({ short_name: '', full_name: '' });
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Teachers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage teachers and their information
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="short_name">Short Name (Initials)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="short_name"
                    placeholder="e.g., MHR"
                    value={formData.short_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value.toUpperCase() }))}
                    maxLength={10}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    placeholder="e.g., Dr. Md. Habibur Rahman"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDialogClose}
                  className="w-full sm:w-auto"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="w-full sm:w-auto"
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTeacher ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teacher Count */}
      {!loading && teachers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total teachers: <span className="font-semibold text-foreground">{teachers.length}</span>
        </div>
      )}

      {/* Teachers List */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              Loading teachers...
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No teachers added yet. Click "Add Teacher" to get started.
            </div>
          ) : (
            <div className="divide-y">
              {/* Desktop Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-muted/50 font-semibold text-sm">
                <div className="col-span-2">Initials</div>
                <div className="col-span-8">Full Name</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Teacher Items */}
              {teachers.map((teacher) => (
                <div key={teacher.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
                    {/* Short Name with Icon */}
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 ring-2 ring-primary/20">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-base md:text-sm">
                            {teacher.short_name}
                          </div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            Initials
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Full Name */}
                    <div className="md:col-span-8 pl-12 md:pl-0">
                      <div className="font-medium text-base md:text-sm">
                        {teacher.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden mt-0.5">
                        Full name
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-2 flex items-center justify-end gap-2 pl-12 md:pl-0 mt-2 md:mt-0">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => handleEdit(teacher)}
                        className="h-9 w-9 md:h-8 md:w-8"
                        disabled={saving || deletingId !== null}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="outline"
                            className="h-9 w-9 md:h-8 md:w-8 text-destructive hover:bg-destructive/10 border-destructive/30"
                            disabled={saving || deletingId !== null}
                          >
                            {deletingId === teacher.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{teacher.full_name}</strong> ({teacher.short_name})? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(teacher.id)}
                              className="w-full sm:w-auto"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
