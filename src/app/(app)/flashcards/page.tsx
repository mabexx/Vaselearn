
'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, Layers, ArrowRight, PlusCircle } from 'lucide-react';
import Flashcard from '@/components/flashcard';
import CreateCollectionDialog from '@/components/create-collection-dialog';
import CreateFlashcardCard from '@/components/create-flashcard-card';
import { Mistake, FlashcardCollection, CustomFlashcard } from '@/lib/types';
import Link from 'next/link';

export default function FlashcardsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [selectedCollection, setSelectedCollection] = useState<string>('mistake-vault');
  const [shuffledMistakes, setShuffledMistakes] = useState<Mistake[]>([]);
  const [shuffledFlashcards, setShuffledFlashcards] = useState<CustomFlashcard[]>([]);

  const mistakesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'mistakes') : null),
    [firestore, user]
  );
  const flashcardCollections = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'flashcardCollections') : null),
    [firestore, user]
  );

  const { data: mistakes, isLoading: isLoadingMistakes } = useCollection<Mistake>(mistakesCollection);
  const { data: collections, isLoading: isLoadingCollections } = useCollection<FlashcardCollection>(flashcardCollections);

  const customFlashcardsCollection = useMemoFirebase(
    () =>
      user && selectedCollection !== 'mistake-vault'
        ? query(
            collection(firestore, 'users', user.uid, 'customFlashcards'),
            where('collectionId', '==', selectedCollection)
          )
        : null,
    [firestore, user, selectedCollection]
  );

  const { data: customFlashcards, isLoading: isLoadingCustomFlashcards } =
    useCollection<CustomFlashcard>(customFlashcardsCollection);

  useEffect(() => {
    if (mistakes) {
      setShuffledMistakes([...mistakes].sort(() => Math.random() - 0.5));
    }
  }, [mistakes]);

  useEffect(() => {
    if (customFlashcards) {
      setShuffledFlashcards([...customFlashcards].sort(() => Math.random() - 0.5));
    }
  }, [customFlashcards]);

  const isLoading = isLoadingMistakes || isLoadingCollections || isLoadingCustomFlashcards;

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="space-y-2 mb-8">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="flex items-center justify-center gap-4 mt-8">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  const renderHeader = () => {
    const collectionName =
      selectedCollection === 'mistake-vault'
        ? 'Mistake Vault'
        : collections?.find((c) => c.id === selectedCollection)?.name;

    const count =
      selectedCollection === 'mistake-vault'
        ? shuffledMistakes.length
        : shuffledFlashcards.length;
    const item = selectedCollection === 'mistake-vault' ? 'mistake' : 'card';

    return (
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-4 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-3xl font-bold">
                {collectionName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Collections</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSelectedCollection('mistake-vault')}>
                Mistake Vault
              </DropdownMenuItem>
              {collections?.map((collection) => (
                <DropdownMenuItem
                  key={collection.id}
                  onSelect={() => setSelectedCollection(collection.id)}
                >
                  {collection.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <CreateCollectionDialog />
        </div>
        <p className="text-muted-foreground">
          Reviewing {count} {item}
          {count > 1 && 's'} from your collection.
        </p>
      </div>
    );
  };

  if (selectedCollection === 'mistake-vault' && (!shuffledMistakes || shuffledMistakes.length === 0)) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold text-center mb-8">Flashcard Review</h1>
        {renderHeader()}
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center text-center p-12">
            <Layers className="h-16 w-16 mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">No Flashcards to Review</h2>
            <p className="mt-2 text-muted-foreground">
              Your flashcards are automatically created from mistakes you make in quizzes. Take a quiz to get started!
            </p>
            <Button asChild className="mt-6">
              <Link href="/practice">Take a Quiz <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedCollection !== 'mistake-vault' && (!shuffledFlashcards || shuffledFlashcards.length === 0)) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold text-center mb-8">Flashcard Review</h1>
        {renderHeader()}
        <div className="w-full max-w-2xl mx-auto">
          <CreateFlashcardCard collectionId={selectedCollection} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-center mb-8">Flashcard Review</h1>
      {renderHeader()}
      <Carousel setApi={setApi} className="w-full max-w-2xl mx-auto">
        <CarouselContent>
          {selectedCollection === 'mistake-vault'
            ? shuffledMistakes.map((mistake) => (
                <CarouselItem key={mistake.id}>
                  <Flashcard question={mistake.question} answer={mistake.correctAnswer} />
                </CarouselItem>
              ))
            : (
              <>
                {shuffledFlashcards.map((flashcard) => (
                  <CarouselItem key={flashcard.id}>
                    <Flashcard question={flashcard.question} answer={flashcard.answer} />
                  </CarouselItem>
                ))}
                <CarouselItem>
                  <CreateFlashcardCard collectionId={selectedCollection} />
                </CarouselItem>
              </>
            )}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
      <div className="py-4 text-center text-sm text-muted-foreground">
        Card {current} of {count}
      </div>
    </div>
  );
}
