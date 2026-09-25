import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getBatches, createBatch, updateBatch, deleteBatch, Batch } from '@/lib/adminApi';
import { Plus, Pencil, Trash2, Calendar, Edit3 } from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
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

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    term: 1,
    total_weeks: 13,
    start_date: '',
    mid_break_start: '',
    mid_break_end: '',
    vacant_weeks: 0,
    is_active: true,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMainAdmin } = useAdmin();

  // Parse "Batch 19" -> "19"; fall back to any digits in the name.
  const extractNumber = (name: string): string => {
    const m = name.match(/(\d+)/);
    return m ? m[1] : '';
  };

  // Co-admins belong to exactly one batch (cohort); lock the batch number.
  const lockedNumber = !isMainAdmin && batches.length > 0 ? extractNumber(batches[0].name) : '';

  const loadBatches = async () => {
    try {
      const data = await getBatches();
      setBatches(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load batches', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.start_date) {
      toast({ title: 'Error', description: 'Name and start date are required', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        ...formData,
        mid_break_start: formData.mid_break_start || null,
        mid_break_end: formData.mid_break_end || null,
        vacant_weeks: formData.vacant_weeks || 0,
      };

      if (editingBatch) {
        await updateBatch(editingBatch.id, payload);
        toast({ title: 'Success', description: 'Batch updated successfully' });
      } else {
        await createBatch(payload);
        toast({ title: 'Success', description: 'Batch created successfully' });
      }
      setIsDialogOpen(false);
      setEditingBatch(null);
      resetForm();
      loadBatches();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save batch', variant: 'destructive' });
    }
  };

  // When the user types a batch number while creating, auto-fill the rest
  // from the most recent existing batch with the same number and advance
  // level/term to the next semester.
  const handleBatchNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setBatchNumber(digits);
    setFormData((prev) => ({ ...prev, name: digits ? `Batch ${digits}` : '' }));
    if (editingBatch || !digits) return;

    const siblings = batches
      .filter((b) => extractNumber(b.name) === digits)
      .sort((a, b) => {
        if (a.level !== b.level) return b.level - a.level;
        if (a.term !== b.term) return b.term - a.term;
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });
    const latest = siblings[0];
    if (!latest) return;

    // Don't preset level/term — the admin sets those for each new semester.
    setFormData((prev) => ({
      ...prev,
      name: `Batch ${digits}`,
      total_weeks: latest.total_weeks,
      start_date: '',
      mid_break_start: '',
      mid_break_end: '',
      vacant_weeks: latest.vacant_weeks || 0,
      is_active: true,
    }));
    toast({ title: 'Auto-filled', description: `Prefilled from ${latest.name}. Set level and term for the new semester.` });
  };

  const resetForm = () => {
    setBatchNumber(lockedNumber);
    setFormData({
      name: lockedNumber ? `Batch ${lockedNumber}` : '',
      level: 1,
      term: 1,
      total_weeks: 13,
      start_date: '',
      mid_break_start: '',
      mid_break_end: '',
      vacant_weeks: 0,
      is_active: true,
    });
  };

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setBatchNumber(extractNumber(batch.name));
    setFormData({
      name: batch.name,
      level: batch.level,
      term: batch.term,
      total_weeks: batch.total_weeks,
      start_date: batch.start_date,
      mid_break_start: batch.mid_break_start || '',
      mid_break_end: batch.mid_break_end || '',
      vacant_weeks: batch.vacant_weeks || 0,
      is_active: batch.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBatch(id);
      toast({ title: 'Success', description: 'Batch deleted successfully' });
      loadBatches();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete batch', variant: 'destructive' });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingBatch(null);
    resetForm();
  };

  const handleEditSchedule = (batchId: string) => {
    navigate(`/admin/dashboard/schedule/${batchId}`);
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Batches / Routines</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage batch schedules and semester information
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => { setEditingBatch(null); resetForm(); setIsDialogOpen(true); }} 
              className="w-full xs:w-auto"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="text-sm">Create Batch</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg p-3 sm:p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg md:text-xl">
                {editingBatch ? 'Edit Batch' : 'Create New Batch'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="batch_number" className="text-sm">Batch Number</Label>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 sm:h-9 md:h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                    Batch
                  </span>
                  <Input
                    id="batch_number"
                    inputMode="numeric"
                    placeholder="e.g., 19"
                    value={batchNumber}
                    disabled={!!lockedNumber && !isMainAdmin}
                    onChange={(e) => handleBatchNumberChange(e.target.value)}
                    className="text-sm sm:text-base h-8 sm:h-9 md:h-10"
                  />
                </div>
                {!isMainAdmin && lockedNumber ? (
                  <p className="text-[11px] text-muted-foreground">
                    You can only manage Batch {lockedNumber}.
                  </p>
                ) : !editingBatch && (
                  <p className="text-[11px] text-muted-foreground">
                    Type a number that already exists to auto-fill the next semester.
                  </p>
                )}
              </div>
              
              {/* Level and Term - Responsive grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="level" className="text-sm">Level</Label>
                  <Input
                    id="level"
                    type="number"
                    min={1}
                    max={4}
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                    className="text-sm sm:text-base h-8 sm:h-9 md:h-10"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="term" className="text-sm">Term</Label>
                  <Input
                    id="term"
                    type="number"
                    min={1}
                    max={2}
                    value={formData.term}
                    onChange={(e) => setFormData(prev => ({ ...prev, term: parseInt(e.target.value) || 1 }))}
                    className="text-sm sm:text-base h-8 sm:h-9 md:h-10"
                  />
                </div>
              </div>

              {/* Weeks and Date */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="total_weeks" className="text-sm">Total Weeks</Label>
                  <Input
                    id="total_weeks"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.total_weeks}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_weeks: parseInt(e.target.value) || 13 }))}
                    className="text-sm sm:text-base h-8 sm:h-9 md:h-10"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="start_date" className="text-sm">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="text-sm sm:text-base h-8 sm:h-9 md:h-10"
                  />
                </div>
              </div>

              {/* Mid Break Dates */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="mid_break_start" className="text-sm">Mid Break Start</Label>
                  <Input
                    id="mid_break_start"
                    type="date"
                    value={formData.mid_break_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, mid_break_start: e.target.value }))}
                    className="text-sm sm:text-base h-8 sm:h-9 md:h-10"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="mid_break_end" className="text-sm">Mid Break End</Label>
                  <Input
                    id="mid_break_end"
                    type="date"
                    value={formData.mid_break_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, mid_break_end: e.target.value }))}
                    className="text-sm sm:text-base h-8 sm:h-9 md:h-10"
                  />
                </div>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="is_active" className="text-sm">Active (Visible to visitors)</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  className="scale-90 sm:scale-100"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-1.5 sm:gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDialogClose}
                  size="sm"
                  className="h-7 sm:h-8 md:h-9 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  size="sm"
                  className="h-7 sm:h-8 md:h-9 text-xs sm:text-sm"
                >
                  {editingBatch ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-6 sm:p-8 md:p-12 text-center text-muted-foreground text-sm sm:text-base">
          Loading batches...
        </div>
      ) : batches.length === 0 ? (
        <Card className="border">
          <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">
            No batches created yet. Click "Create Batch" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {batches.map((batch) => (
            <Card key={batch.id} className="overflow-hidden">
              <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg truncate">{batch.name}</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Level {batch.level}, Term {batch.term}
                    </p>
                  </div>
                  <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                    batch.is_active 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {batch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">Started: {new Date(batch.start_date).toLocaleDateString()}</span>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>{batch.total_weeks} weeks</span>
                    <span>•</span>
                    <span className="truncate">{batch.mid_break_start ? 'Has mid break' : 'No mid break'}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                  <Button 
                    size="sm" 
                    className="flex-1 text-xs sm:text-sm h-7 sm:h-8 md:h-9"
                    onClick={() => handleEditSchedule(batch.id)}
                  >
                    <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                    <span className="truncate">Edit Schedule</span>
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => handleEdit(batch)}
                    className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 flex-shrink-0"
                  >
                    <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 flex-shrink-0 text-destructive"
                      >
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg">Delete Batch</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm sm:text-base">
                          Are you sure you want to delete {batch.name}? This will also delete all schedule data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="text-xs sm:text-sm h-7 sm:h-8 md:h-9">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(batch.id)}
                          className="text-xs sm:text-sm h-7 sm:h-8 md:h-9"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
