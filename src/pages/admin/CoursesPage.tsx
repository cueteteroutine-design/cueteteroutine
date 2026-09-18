import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCourses, createCourse, updateCourse, deleteCourse, Course } from '@/lib/adminApi';
import { Plus, Pencil, Trash2, Filter, Loader2 } from 'lucide-react';
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

const PRESET_COLORS = [
  // Vibrant colors
  { name: 'Blue', value: '217 91% 50%' },
  { name: 'Purple', value: '262 83% 58%' },
  { name: 'Pink', value: '339 76% 55%' },
  { name: 'Orange', value: '24 95% 53%' },
  { name: 'Green', value: '142 71% 45%' },
  { name: 'Cyan', value: '199 89% 48%' },
  { name: 'Violet', value: '280 68% 55%' },
  { name: 'Rose', value: '351 83% 55%' },
  { name: 'Teal', value: '168 76% 42%' },
  { name: 'Amber', value: '38 92% 50%' },
  // Lighter versions
  { name: 'Light Blue', value: '217 91% 70%' },
  { name: 'Light Purple', value: '262 83% 75%' },
  { name: 'Light Pink', value: '339 76% 75%' },
  { name: 'Light Orange', value: '24 95% 70%' },
  { name: 'Light Green', value: '142 71% 65%' },
  { name: 'Light Cyan', value: '199 89% 68%' },
  { name: 'Light Violet', value: '280 68% 75%' },
  { name: 'Light Rose', value: '351 83% 75%' },
  { name: 'Light Teal', value: '168 76% 62%' },
  { name: 'Light Amber', value: '38 92% 70%' },
];

const LEVELS = [1, 2, 3, 4];
const TERMS = [1, 2];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterTerm, setFilterTerm] = useState<string>('all');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'theory' as 'theory' | 'sessional',
    color: PRESET_COLORS[0].value,
    credit: 3,
    level: null as number | null,
    term: null as number | null,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter courses by level and term
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const levelMatch = filterLevel === 'all' || course.level === parseInt(filterLevel);
      const termMatch = filterTerm === 'all' || course.term === parseInt(filterTerm);
      return levelMatch && termMatch;
    });
  }, [courses, filterLevel, filterTerm]);

  const loadCourses = async () => {
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load courses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({ title: 'Error', description: 'Code and name are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, formData);
        toast({ title: 'Success', description: 'Course updated successfully' });
      } else {
        await createCourse(formData);
        toast({ title: 'Success', description: 'Course created successfully' });
      }
      setIsDialogOpen(false);
      setEditingCourse(null);
      setFormData({ code: '', name: '', type: 'theory', color: PRESET_COLORS[0].value, credit: 3, level: null, term: null });
      loadCourses();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save course', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      type: course.type,
      color: course.color,
      credit: course.credit ?? 3,
      level: course.level,
      term: course.term,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCourse(id);
      toast({ title: 'Success', description: 'Course deleted successfully' });
      loadCourses();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete course', 
        variant: 'destructive' 
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCourse(null);
    setFormData({ code: '', name: '', type: 'theory', color: PRESET_COLORS[0].value, credit: 3, level: null, term: null });
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Courses</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage courses with codes and colors
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setIsDialogOpen(true)} 
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., ETE-301"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Digital Signal Processing"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={formData.level?.toString() || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, level: value ? parseInt(value) : null }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((level) => (
                        <SelectItem key={level} value={level.toString()}>Level {level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="term">Term</Label>
                  <Select
                    value={formData.term?.toString() || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, term: value ? parseInt(value) : null }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMS.map((term) => (
                        <SelectItem key={term} value={term.toString()}>Term {term}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit">Credit</Label>
                  <Input
                    id="credit"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="e.g., 0.75"
                    value={formData.credit}
                    onChange={(e) => setFormData(prev => ({ ...prev, credit: parseFloat(e.target.value) || 0 }))}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Color Palette</Label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      title={color.name}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                        formData.color === color.value ? 'border-foreground ring-2 ring-foreground ring-offset-2' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: `hsl(${color.value})` }}
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  First row: vibrant colors | Second row: lighter shades
                </p>
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
                  {editingCourse ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filter by:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap min-w-[45px]">Level</Label>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={level.toString()}>Level {level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap min-w-[45px]">Term</Label>
                <Select value={filterTerm} onValueChange={setFilterTerm}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {TERMS.map((term) => (
                      <SelectItem key={term} value={term.toString()}>Term {term}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(filterLevel !== 'all' || filterTerm !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setFilterLevel('all'); setFilterTerm('all'); }}
                  className="w-full sm:w-auto"
                >
                  Clear filters
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground sm:ml-auto">
              {filteredCourses.length} of {courses.length} courses
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid/List */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              Loading courses...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {courses.length === 0 
                ? 'No courses added yet. Click "Add Course" to get started.'
                : 'No courses match the selected filters.'}
            </div>
          ) : (
            <div className="divide-y">
              {/* Desktop Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-muted/50 font-semibold text-sm">
                <div className="col-span-1">Color</div>
                <div className="col-span-2">Code</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Level/Term</div>
                <div className="col-span-1">Credit</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Course Items */}
              {filteredCourses.map((course) => (
                <div key={course.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
                    {/* Color */}
                    <div className="md:col-span-1">
                      <div
                        className="w-10 h-10 md:w-8 md:h-8 rounded-full ring-2 ring-offset-2 ring-gray-200 dark:ring-gray-700"
                        style={{ backgroundColor: `hsl(${course.color})` }}
                        title={PRESET_COLORS.find(c => c.value === course.color)?.name || 'Color'}
                      />
                    </div>

                    {/* Code */}
                    <div className="md:col-span-2">
                      <div className="font-mono font-semibold text-base md:text-sm">
                        {course.code}
                      </div>
                    </div>

                    {/* Name */}
                    <div className="md:col-span-3">
                      <div className="font-medium">{course.name}</div>
                      
                      {/* Mobile-only badges */}
                      <div className="flex flex-wrap gap-2 mt-2 md:hidden">
                        {course.level && course.term && (
                          <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                            Level {course.level} Term {course.term}
                          </span>
                        )}
                        <span className="px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                          {course.credit ?? 3} Credits
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          course.type === 'theory' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}>
                          {course.type === 'theory' ? 'Theory' : 'Sessional'}
                        </span>
                      </div>
                    </div>

                    {/* Level/Term - Desktop only */}
                    <div className="hidden md:block md:col-span-2">
                      {course.level && course.term ? (
                        <span className="px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                          Level {course.level} Term {course.term}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Credit - Desktop only */}
                    <div className="hidden md:block md:col-span-1">
                      <span className="font-medium">{course.credit ?? 3}</span>
                    </div>

                    {/* Type - Desktop only */}
                    <div className="hidden md:block md:col-span-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        course.type === 'theory' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                          : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      }`}>
                        {course.type === 'theory' ? 'Theory' : 'Sessional'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleEdit(course)}
                        className="h-9 w-9 md:h-8 md:w-8"
                        disabled={saving || deletingId !== null}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-9 w-9 md:h-8 md:w-8 text-destructive hover:bg-destructive/10"
                            disabled={saving || deletingId !== null}
                          >
                            {deletingId === course.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{course.code}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                            <AlertDialogCancel className="w-full sm:w-auto">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(course.id)}
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
