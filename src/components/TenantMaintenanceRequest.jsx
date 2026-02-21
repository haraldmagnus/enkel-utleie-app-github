import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wrench, Plus, Check, Clock, AlertCircle, ImagePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-700'
};

const statusLabels = {
  pending: 'Venter',
  in_progress: 'Pågår',
  completed: 'Fullført',
  cancelled: 'Kansellert'
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
};

export default function TenantMaintenanceRequest({ propertyId, landlordId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    photos: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['maintenanceTasks', propertyId],
    queryFn: () => base44.entities.MaintenanceTask.filter({ rental_unit_id: propertyId }, '-created_date', 20),
    enabled: !!propertyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTasks', propertyId] });
      setShowDialog(false);
      setFormData({ title: '', description: '', priority: 'medium', photos: [] });
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, photos: [...prev.photos, file_url] }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      photos: formData.photos,
      rental_unit_id: propertyId,
      landlord_id: landlordId,
      status: 'pending'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Wrench className="w-4 h-4" /> Vedlikehold
        </h3>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Meld feil
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Ingen vedlikeholdsforespørsler</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    task.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {task.status === 'completed'
                      ? <Check className="w-4 h-4 text-green-600" />
                      : <Clock className="w-4 h-4 text-yellow-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <Badge className={statusColors[task.status]} >{statusLabels[task.status]}</Badge>
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority === 'high' ? 'Høy' : task.priority === 'medium' ? 'Medium' : 'Lav'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meld vedlikeholdsbehov</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Hva gjelder det? *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="F.eks. Lekkasje under kjøkkenvasken"
                required
              />
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beskriv problemet i mer detalj"
                rows={3}
              />
            </div>
            <div>
              <Label>Prioritet</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Lav – ikke haster</SelectItem>
                  <SelectItem value="medium">Medium – snart</SelectItem>
                  <SelectItem value="high">Høy – haster</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Legg til bilde (valgfritt)</Label>
              <div className="mt-1 flex items-center gap-2">
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md text-sm text-slate-600 hover:bg-slate-50">
                  <ImagePlus className="w-4 h-4" />
                  {uploading ? 'Laster opp...' : 'Velg bilde'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
                {formData.photos.length > 0 && (
                  <span className="text-sm text-green-600">{formData.photos.length} bilde(r) lagt til</span>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Avbryt</Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || !formData.title}
              >
                Send forespørsel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}