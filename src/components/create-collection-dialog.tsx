
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle } from 'lucide-react';

export default function CreateCollectionDialog() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');

  const handleCreateCollection = async () => {
    if (!name || !topic) {
      setError('Please fill in all fields.');
      return;
    }
    if (!user) {
      setError('You must be logged in to create a collection.');
      return;
    }
    try {
      await addDoc(collection(firestore, 'users', user.uid, 'flashcardCollections'), {
        name,
        topic,
        createdAt: serverTimestamp(),
        userId: user.uid,
      });
      setIsOpen(false);
      setName('');
      setTopic('');
      setError('');
    } catch (err) {
      setError('Failed to create collection. Please try again.');
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Create Collection
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Flashcard Collection</DialogTitle>
            <DialogDescription>
              Enter a name and topic for your new collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Biology 101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Cell Structure"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
