"use client";

import { type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Props applied to the drag handle element (from dnd-kit attributes + listeners). */
export type DragHandleProps = Record<string, unknown>;

/** Grip button that initiates a drag. Spread the row's `handleProps` onto it. */
export function DragHandle({
  handleProps,
  className,
}: {
  handleProps: DragHandleProps;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Trascina per riordinare"
      className={
        "touch-none cursor-grab active:cursor-grabbing text-muted hover:text-soft shrink-0 " +
        (className ?? "px-1 py-[10px] self-start")
      }
      {...handleProps}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="9" cy="6" r="1.6" />
        <circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" />
        <circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  );
}

interface SortableListProps<T> {
  items: readonly T[];
  /** Stable, unique id for each item (required by dnd-kit). */
  getId: (item: T) => string;
  /** Called with the reordered array after a drag. */
  onReorder: (items: T[]) => void;
  /** Renders one row; spread `handleProps` onto the element that starts the drag. */
  children: (item: T, handleProps: DragHandleProps) => ReactNode;
  /** Class for the container that wraps the rows (e.g. flex layout + gap). */
  className?: string;
}

/**
 * Generic vertical sortable list built on dnd-kit. Drag is initiated only from
 * the element that receives `handleProps`, so inputs inside a row stay editable.
 * Supports pointer (mouse + touch) and keyboard reordering.
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  children,
  className,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = items.map(getId);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove([...items], oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableRow key={getId(item)} id={getId(item)}>
              {(handleProps) => children(item, handleProps)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handleProps: DragHandleProps) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? ("relative" as const) : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}
