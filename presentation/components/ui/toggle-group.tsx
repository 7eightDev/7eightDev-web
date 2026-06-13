'use client';

import * as React from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Segmented control built on Radix ToggleGroup. Intentionally unstyled at the
 * item level beyond layout primitives: callers provide the visual treatment via
 * `className` so the control can adapt to different design contexts (e.g. the
 * pill-shaped status chips on the quotes list). Selected state is exposed by
 * Radix as `data-state="on"`, which callers target with `data-[state=on]:…`.
 */
function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        'inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-all duration-150 outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
