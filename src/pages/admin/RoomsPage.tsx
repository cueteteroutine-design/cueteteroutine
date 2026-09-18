import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  Room,
} from '@/lib/adminApi';
import { Plus, Pencil, Trash2, Building, Loader2 } from 'lucide-react';
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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({ name: '', building: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadRooms = async () => {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load rooms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Room name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, formData);
        toast({ title: 'Success', description: 'Room updated successfully' });
      } else {
        await createRoom(formData);
        toast({ title: 'Success', description: 'Room created successfully' });
      }

      setIsDialogOpen(false);
      setEditingRoom(null);
      setFormData({ name: '', building: '' });
      loadRooms();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save room',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      building: room.building || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteRoom(id);
      toast({ title: 'Success', description: 'Room deleted successfully' });
      loadRooms();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete room',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRoom(null);
    setFormData({ name: '', building: '' });
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
            Rooms
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage rooms and labs
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => !open && handleDialogClose()}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., 301 or Lab-1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="building">Building (Optional)</Label>
                <Input
                  id="building"
                  placeholder="e.g., ETE Building"
                  value={formData.building}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, building: e.target.value }))
                  }
                />
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
                <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRoom ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Count */}
      {!loading && rooms.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total rooms:{' '}
          <span className="font-semibold text-foreground">
            {rooms.length}
          </span>
        </div>
      )}

      {/* List */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              Loading rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No rooms added yet. Click "Add Room" to get started.
            </div>
          ) : (
            <div className="divide-y">
              {/* Desktop header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-muted/50 font-semibold text-sm">
                <div className="col-span-4">Room</div>
                <div className="col-span-6">Building</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
                    {/* Room */}
                    <div className="md:col-span-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 ring-2 ring-primary/20">
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-base md:text-sm">
                            {room.name}
                          </div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            Room
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Building */}
                    <div className="md:col-span-6 pl-12 md:pl-0">
                      <div className="text-base md:text-sm">
                        {room.building || '-'}
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden mt-0.5">
                        Building
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-2 flex justify-end gap-2 pl-12 md:pl-0 mt-2 md:mt-0">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEdit(room)}
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
                            {deletingId === room.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>

                        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Room
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete{' '}
                              <strong>{room.name}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(room.id)}
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
