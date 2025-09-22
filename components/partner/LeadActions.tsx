'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface LeadActionsProps {
  leadId: string;
  onNoteAdd?: (note: string) => void;
}

export default function LeadActions({ 
  leadId, 
  onNoteAdd 
}: LeadActionsProps) {
  const [newNote, setNewNote] = useState('');

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim() && onNoteAdd) {
      try {
        await onNoteAdd(newNote.trim());
        setNewNote('');
      } catch (error) {
        console.error('Error adding note:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Note */}
      <Card>
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add Note
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleNoteSubmit} className="space-y-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this lead..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={!newNote.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Note
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
