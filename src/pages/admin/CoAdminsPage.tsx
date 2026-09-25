import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import {
  getCoAdmins,
  createCoAdmin,
  updateCoAdminBatches,
  resetCoAdminPassword,
  deleteCoAdmin,
  getBatches,
  CoAdmin,
  Batch,
} from '@/lib/adminApi';
import { Plus, Trash2, KeyRound, UserCog, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function CoAdminsPage() {
  const [admins, setAdmins] = useState<CoAdmin[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CoAdmin | null>(null);
  const [passwordFor, setPasswordFor] = useState<CoAdmin | null>(null);
  const [busy, setBusy] = useState(false);

  // create form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBatchName, setNewBatchName] = useState<string>('');
  // edit form
  const [editBatchName, setEditBatchName] = useState<string>('');
  // password reset
  const [resetPass, setResetPass] = useState('');

  const load = async () => {
    try {
      const [a, b] = await Promise.all([getCoAdmins(), getBatches()]);
      setAdmins(a);
      setBatches(b);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newPassword.length < 6) {
      toast({ title: 'Invalid input', description: 'Username and 6+ char password required', variant: 'destructive' });
      return;
    }
    if (!newBatchName) {
      toast({ title: 'Select a batch', description: 'Each co-admin belongs to exactly one batch', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createCoAdmin({ username: newUsername.trim(), password: newPassword, batch_ids: idsForName(newBatchName) });
      toast({ title: 'Co-admin created' });
      setCreateOpen(false);
      setNewUsername(''); setNewPassword(''); setNewBatchName('');
      await load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const openEdit = (a: CoAdmin) => {
    setEditing(a);
    setEditBatchName(uniqueAssignedNames(a.batch_ids)[0] || '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await updateCoAdminBatches(editing.id, editBatchName ? idsForName(editBatchName) : []);
      toast({ title: 'Batch assignments updated' });
      setEditing(null);
      await load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const doResetPassword = async () => {
    if (!passwordFor || resetPass.length < 6) return;
    setBusy(true);
    try {
      await resetCoAdminPassword(passwordFor.id, resetPass);
      toast({ title: 'Password reset' });
      setPasswordFor(null); setResetPass('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const doDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteCoAdmin(id);
      toast({ title: 'Co-admin deleted' });
      await load();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const batchLabel = (id: string) => batches.find((b) => b.id === id)?.name || id.slice(0, 6);

  // Group batches by shared name (e.g. "Batch 19" spans multiple level/term rows).
  // Co-admins are assigned to cohorts, not to individual semester rows.
  const batchGroups = (() => {
    const map = new Map<string, Batch[]>();
    for (const b of batches) {
      const arr = map.get(b.name) || [];
      arr.push(b);
      map.set(b.name, arr);
    }
    return Array.from(map.entries())
      .map(([name, rows]) => ({ name, ids: rows.map((r) => r.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  const uniqueAssignedNames = (ids: string[]) => {
    const names = new Set<string>();
    for (const id of ids) {
      const b = batches.find((x) => x.id === id);
      if (b) names.add(b.name);
    }
    return Array.from(names).sort();
  };

  const idsForName = (name: string) => batches.filter((b) => b.name === name).map((b) => b.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-5 w-5" /> Co-Admins
          </h2>
          <p className="text-sm text-muted-foreground">
            Create restricted admins and assign which batches they can manage.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Add Co-Admin
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : admins.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No co-admins yet. Click "Add Co-Admin" to create one.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {admins.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{a.username}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {a.batch_ids.length} batch{a.batch_ids.length === 1 ? '' : 'es'} assigned
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {a.batch_ids.length === 0 && (
                    <span className="text-xs text-muted-foreground">No batches assigned</span>
                  )}
                  {uniqueAssignedNames(a.batch_ids).map((name) => (
                    <span key={name} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(a)}>
                    Assign batches
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setPasswordFor(a)} title="Reset password">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="outline" className="text-destructive" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete co-admin?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {a.username} will lose access immediately. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => doDelete(a.id)} disabled={busy}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => !busy && setCreateOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Co-Admin</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label>Initial password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">Minimum 6 characters. Share it privately with the co-admin.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Batch</Label>
              <RadioGroup value={newBatchName} onValueChange={setNewBatchName} className="max-h-48 overflow-auto space-y-1 border rounded p-2">
                {batchGroups.length === 0 && <p className="text-xs text-muted-foreground">No batches exist yet.</p>}
                {batchGroups.map((g) => (
                  <label key={g.name} className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value={g.name} />
                    <span>{g.name}</span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-[11px] text-muted-foreground">
                A co-admin belongs to exactly one batch and manages all of its semesters.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit batch assignments */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && !busy && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Batch for {editing?.username}</DialogTitle></DialogHeader>
          <RadioGroup value={editBatchName} onValueChange={setEditBatchName} className="max-h-72 overflow-auto space-y-1 border rounded p-2">
            {batchGroups.map((g) => (
              <label key={g.name} className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value={g.name} />
                <span>{g.name}</span>
              </label>
            ))}
          </RadioGroup>
          <p className="text-[11px] text-muted-foreground px-1">
            New semesters added later to this batch are assigned automatically.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={!!passwordFor} onOpenChange={(o) => !o && !busy && (setPasswordFor(null), setResetPass(''))}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset password for {passwordFor?.username}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
            <p className="text-xs text-muted-foreground">Minimum 6 characters. Existing sessions will be signed out.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasswordFor(null); setResetPass(''); }} disabled={busy}>Cancel</Button>
            <Button onClick={doResetPassword} disabled={busy || resetPass.length < 6}>
              {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}