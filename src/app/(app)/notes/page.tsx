
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import TiptapEditor from '@/components/tiptap-editor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Note } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


export default function NotesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const notesCollection = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'notes') : null
  , [firestore, user]);

  const { data: notes, isLoading: isLoadingNotes } = useCollection<Note>(notesCollection);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [editorContent, setEditorContent] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const sortedNotes = useMemo(() => {
    if (!notes) return [];
    return [...notes].sort((a, b) => (b.updatedAt as any) - (a.updatedAt as any));
  }, [notes]);

  const activeNote = useMemo(() => {
    return sortedNotes.find(n => n.id === activeNoteId);
  }, [sortedNotes, activeNoteId]);

  useEffect(() => {
    if (!activeNoteId && sortedNotes.length > 0) {
      setActiveNoteId(sortedNotes[0].id);
    }
  }, [sortedNotes, activeNoteId]);

  useEffect(() => {
    setEditorContent(activeNote?.content || '');
    setNoteTitle(activeNote?.title || '');
  }, [activeNote]);


  const handleCreateNewNote = async () => {
    if (!user || !notesCollection) return;
    const newNoteData = {
      title: 'Untitled Note',
      content: '<p>Start typing here...</p>',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId: user.uid,
    };
    const newDocRef = await addDocumentNonBlocking(notesCollection, newNoteData);
    if(newDocRef){
        setActiveNoteId(newDocRef.id);
    }
  };

  const handleSaveNote = () => {
    if (!user || !activeNoteId || !firestore) return;
    const noteRef = doc(firestore, 'users', user.uid, 'notes', activeNoteId);
    
    setDocumentNonBlocking(noteRef, {
        content: editorContent,
        title: noteTitle || 'Untitled Note',
        updatedAt: serverTimestamp()
    }, { merge: true });

    toast({
        title: "Note Saved!",
        description: "Your changes have been successfully saved.",
    });
  };
  
  const handleExportNotePdf = async () => {
    if (!activeNote) {
        toast({
            title: "No Note Selected",
            description: "Please select a note to export.",
            variant: "destructive"
        });
        return;
    }
    setIsExporting(true);

    const exportContainer = document.createElement('div');
    exportContainer.innerHTML = editorContent;
    exportContainer.className = 'prose dark:prose-invert p-8 bg-background';
    document.body.appendChild(exportContainer);


    try {
        const canvas = await html2canvas(exportContainer, { scale: 2, backgroundColor: null, useCORS: true });
        
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let position = 0;
        let heightLeft = pdfHeight;
        const pageMargin = 10;

        doc.setFontSize(16);
        doc.text(noteTitle, pageMargin, pageMargin + 5);

        doc.addImage(imgData, 'PNG', pageMargin, pageMargin + 15, pdfWidth - (pageMargin * 2), pdfHeight);
        heightLeft -= doc.internal.pageSize.getHeight();

        while (heightLeft >= 0) {
            position = heightLeft - pdfHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', pageMargin, position + pageMargin + 15, pdfWidth - (pageMargin * 2), pdfHeight);
            heightLeft -= doc.internal.pageSize.getHeight();
        }
        
        const safeTitle = noteTitle.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`${safeTitle}.pdf`);

    } catch (error) {
        console.error("Error exporting PDF:", error);
        toast({
            title: "Export Failed",
            description: "There was an error generating the PDF.",
            variant: "destructive"
        });
    } finally {
        document.body.removeChild(exportContainer);
        setIsExporting(false);
    }
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-100px)]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Notes</CardTitle>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={handleExportNotePdf} disabled={isExporting || !activeNoteId}>
                {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCreateNewNote}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-200px)]">
            {isLoadingNotes ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {sortedNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-colors",
                      activeNoteId === note.id ? "bg-accent" : "hover:bg-muted"
                    )}
                  >
                    <h3 className="font-semibold truncate">{note.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {note.updatedAt ? new Date((note.updatedAt as any).seconds * 1000).toLocaleDateString() : '...'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex-grow mr-4">
             {activeNoteId ? (
              <Input 
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note Title"
                className="text-2xl font-semibold leading-none tracking-tight border-0 shadow-none p-0 focus-visible:ring-0"
              />
            ) : (
              <CardTitle>Select a note</CardTitle>
            )}
            <CardDescription className="mt-1.5">
              Create, edit, and manage your notes. Use the save button to commit your changes.
            </CardDescription>
          </div>
          <Button onClick={handleSaveNote} disabled={!activeNoteId}>Save Note</Button>
        </CardHeader>
        <CardContent>
          {activeNoteId ? (
             <TiptapEditor
                key={activeNoteId} // Force re-render on note change
                content={editorContent}
                onUpdate={(newContent) => setEditorContent(newContent)}
              />
          ) : (
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 h-full">
                <p>Select a note to start editing or create a new one.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

