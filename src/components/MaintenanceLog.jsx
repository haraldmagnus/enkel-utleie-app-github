import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Wrench, Phone, Mail, Check, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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

export default function MaintenanceLog({ propertyId, landlordId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    vendor_name: '',
    vendor_phone: '',
    vendor_email: '',
    estimated_cost: '',
    due_date: ''
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['maintenanceTasks', propertyId],
    queryFn: () => base44.entities.MaintenanceTask.filter({ rental_unit_id: propertyId }, '-created_date', 50),
    enabled: !!propertyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTasks', propertyId] });
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTasks', propertyId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceTasks', propertyId] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      vendor_name: '',
      vendor_phone: '',
      vendor_email: '',
      estimated_cost: '',
      due_date: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      rental_unit_id: propertyId,
      landlord_id: landlordId,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null
    });
  };

  const handleStatusChange = (task, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString().split('T')[0];
    }
    updateMutation.mutate({ id: task.id, data: updateData });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Vedlikeholdslogg</h3>
        <Button 
          size="sm" 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowDialog(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Ny oppgave
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Ingen vedlikeholdsoppgaver</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    task.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {task.status === 'completed' 
                      ? <Check className="w-5 h-5 text-green-600" />
                      : <Wrench className="w-5 h-5 text-yellow-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{task.title}</span>
                      <Badge className={statusColors[task.status]}>
                        {statusLabels[task.status]}
                      </Badge>
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority === 'high' ? 'Høy' : task.priority === 'medium' ? 'Medium' : 'Lav'}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                    )}
                    {task.vendor_name && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="font-medium">{task.vendor_name}</span>
                        {task.vendor_phone && (
                          <a href={`tel:${task.vendor_phone}`} className="flex items-center gap-1 text-blue-600">
                            <Phone className="w-3 h-3" /> {task.vendor_phone}
                          </a>
                        )}
                      </div>
                    )}
                    {task.estimated_cost && (
                      <p className="text-xs text-slate-500 mt-1">Estimert: {task.estimated_cost.toLocaleString()} kr</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Select 
                      value={task.status} 
                      onValueChange={(v) => handleStatusChange(task, v)}
                    >
                      <SelectTrigger className="h-8 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Venter</SelectItem>
                        <SelectItem value="in_progress">Pågår</SelectItem>
                        <SelectItem value="completed">Fullført</SelectItem>
                        <SelectItem value="cancelled">Kansellert</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteMutation.mutate(task.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
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
            <DialogTitle>Ny vedlikeholdsoppgave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tittel *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="F.eks. Fikse vannlekkasje"
                required
              />
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detaljer om oppgaven"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioritet</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Lav</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">Høy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frist</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Leverandør/håndverker</Label>
              <Input
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="Navn"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.vendor_phone}
                  onChange={(e) => setFormData({ ...formData, vendor_phone: e.target.value })}
                  placeholder="12345678"
                />
              </div>
              <div>
                <Label>Estimert kostnad</Label>
                <Input
                  type="number"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  placeholder="0 kr"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Avbryt
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || !formData.title}
              >
                Opprett
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}