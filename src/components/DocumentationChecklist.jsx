import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Camera, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const defaultChecklistItems = [
  { text: 'Vegger - tilstand dokumentert', type: 'move_in' },
  { text: 'Gulv - tilstand dokumentert', type: 'move_in' },
  { text: 'Vinduer - fungerer og uten skader', type: 'move_in' },
  { text: 'Kjøkken - hvitevarer fungerer', type: 'move_in' },
  { text: 'Bad - ventilasjon og avløp ok', type: 'move_in' },
  { text: 'Strømmåler avlest', type: 'move_in' },
  { text: 'Nøkler overlevert', type: 'move_in' }
];

export default function DocumentationChecklist({ property, onUpdate, isLoading }) {
  const [expanded, setExpanded] = useState(true);
  const [newItemText, setNewItemText] = useState('');
  const [uploading, setUploading] = useState(null);

  const checklistItems = property?.checklist_items || [];

  const initializeChecklist = () => {
    const items = defaultChecklistItems.map((item, idx) => ({
      ...item,
      id: `item-${idx}-${Date.now()}`,
      checked: false,
      photo_url: null,
      timestamp: null
    }));
    onUpdate({ checklist_items: items });
  };

  const toggleItem = (itemId) => {
    const updated = checklistItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          checked: !item.checked,
          timestamp: !item.checked ? new Date().toISOString() : null
        };
      }
      return item;
    });
    onUpdate({ checklist_items: updated });
  };

  const handlePhotoUpload = async (e, itemId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(itemId);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const updated = checklistItems.map(item => {
      if (item.id === itemId) {
        return { ...item, photo_url: file_url, timestamp: new Date().toISOString() };
      }
      return item;
    });
    onUpdate({ checklist_items: updated });
    setUploading(null);
  };

  const addCustomItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem = {
      id: `custom-${Date.now()}`,
      text: newItemText.trim(),
      type: 'custom',
      checked: false,
      photo_url: null,
      timestamp: null
    };
    
    onUpdate({ checklist_items: [...checklistItems, newItem] });
    setNewItemText('');
  };

  const removeItem = (itemId) => {
    const updated = checklistItems.filter(item => item.id !== itemId);
    onUpdate({ checklist_items: updated });
  };

  const completedCount = checklistItems.filter(i => i.checked).length;
  const totalCount = checklistItems.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-base flex items-center gap-2">
            <Check className="w-4 h-4" /> Overtakelsessjekkliste
            {totalCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {completedCount}/{totalCount}
              </Badge>
            )}
          </CardTitle>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          {checklistItems.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm mb-3">Ingen sjekkliste opprettet</p>
              <Button 
                onClick={initializeChecklist}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                Opprett standard sjekkliste
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {checklistItems.map(item => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-lg border ${item.checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={item.checked}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.checked ? 'text-green-700 line-through' : 'text-slate-700'}`}>
                        {item.text}
                      </p>
                      {item.timestamp && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(item.timestamp).toLocaleString('no', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                      {item.photo_url && (
                        <img 
                          src={item.photo_url} 
                          alt="Dokumentasjon"
                          className="mt-2 w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <div className="flex gap-1">
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, item.id)}
                          disabled={uploading === item.id}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          asChild
                          disabled={uploading === item.id}
                        >
                          <span>
                            <Camera className={`w-4 h-4 ${item.photo_url ? 'text-green-600' : 'text-slate-400'}`} />
                          </span>
                        </Button>
                      </label>
                      {item.type === 'custom' && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2 mt-4">
                <Input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Legg til eget punkt..."
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem()}
                />
                <Button 
                  onClick={addCustomItem}
                  disabled={!newItemText.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}