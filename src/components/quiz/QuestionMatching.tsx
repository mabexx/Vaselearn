
'use client';

import { useState, useEffect } from 'react';
import { MatchingPairsQuestion } from '@/lib/types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

interface SortableItemProps {
    id: string;
    children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-2 touch-none">
       <GripVertical className="h-5 w-5 text-muted-foreground" />
      {children}
    </div>
  );
}

interface Props {
  question: MatchingPairsQuestion;
  onAnswer: (answer: string[]) => void;
  userAnswer?: string[];
}

export default function QuestionMatching({ question, onAnswer, userAnswer }: Props) {
  const [prompts, setPrompts] = useState(question.pairs.map(p => p.prompt));
  const [options, setOptions] = useState(() => {
    // If there's a user answer, use that order. Otherwise, shuffle.
    if (userAnswer && userAnswer.length === question.pairs.length) {
        return [...userAnswer];
    }
    return [...question.pairs.map(p => p.match)].sort(() => Math.random() - 0.5)
  });

  useEffect(() => {
    onAnswer(options);
  }, [options, onAnswer]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOptions((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-semibold text-lg">{question.question}</p>
      <div className="grid grid-cols-2 gap-4">
        {/* Prompts Column (Static) */}
        <div className="space-y-2">
          {prompts.map((prompt, index) => (
            <Card key={index} className="p-3 min-h-14 flex items-center justify-center text-center bg-muted">
              {prompt}
            </Card>
          ))}
        </div>
        
        {/* Options Column (Sortable) */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={options} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {options.map((option, index) => (
                <SortableItem key={option} id={option}>
                  <Card className="p-3 min-h-14 flex-grow flex items-center justify-center text-center cursor-grab active:cursor-grabbing">
                    {option}
                  </Card>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
       <p className="text-sm text-muted-foreground text-center pt-2">Drag the items on the right to match the items on the left.</p>
    </div>
  );
}
