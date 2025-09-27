import { forwardRef } from 'react';
import type { SVGProps } from 'react';
import * as Lucide from 'lucide-react/dist/esm/lucide-react';

type StableIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const createStableIcon = (paths: Array<{ d: string; type?: 'path' | 'polyline' }>) =>
  forwardRef<SVGSVGElement, StableIconProps>(function StableIcon(
    { strokeWidth = 2, size, width, height, ...props },
    ref,
  ) {
    const resolvedWidth = width ?? size ?? 24;
    const resolvedHeight = height ?? size ?? 24;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        width={resolvedWidth}
        height={resolvedHeight}
        {...props}
      >
        {paths.map((item) =>
          item.type === 'polyline' ? (
            <polyline key={`polyline-${item.d}`} points={item.d} />
          ) : (
            <path key={`path-${item.d}`} d={item.d} />
          ),
        )}
      </svg>
    );
  });

export const DownloadIcon = createStableIcon([
  { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' },
  { d: 'M7 10l5 5 5-5', type: 'polyline' },
  { d: 'M12 15V3' },
]);

export const CopyIcon = createStableIcon([
  { d: 'M8 8H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2' },
  { d: 'M16 16h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v2' },
  { d: 'M8 8h8a2 2 0 0 1 2 2v8' },
]);

export const CheckIcon = createStableIcon([
  { d: 'M20 6L9 17l-5-5' },
]);

export const ArrowDownIcon = (Lucide as any).ArrowDownIcon ?? Lucide.ArrowDown;
export const ArrowLeftIcon = (Lucide as any).ArrowLeftIcon ?? Lucide.ArrowLeft;
export const ArrowRightIcon = (Lucide as any).ArrowRightIcon ?? Lucide.ArrowRight;
export const BookIcon = (Lucide as any).BookIcon ?? (Lucide as any).Book;
export const BrainIcon = (Lucide as any).BrainIcon ?? (Lucide as any).Brain;
export const CheckCircleIcon =
  (Lucide as any).CheckCircleIcon ?? (Lucide as any).CheckCircle;
export const ChevronDownIcon =
  (Lucide as any).ChevronDownIcon ?? (Lucide as any).ChevronDown;
export const ChevronLeftIcon =
  (Lucide as any).ChevronLeftIcon ?? (Lucide as any).ChevronLeft;
export const ChevronRightIcon =
  (Lucide as any).ChevronRightIcon ?? (Lucide as any).ChevronRight;
export const ChevronUpIcon =
  (Lucide as any).ChevronUpIcon ?? (Lucide as any).ChevronUp;
export const CircleIcon = (Lucide as any).CircleIcon ?? (Lucide as any).Circle;
export const ClockIcon = (Lucide as any).ClockIcon ?? (Lucide as any).Clock;
export const Loader2Icon = (Lucide as any).Loader2Icon ?? (Lucide as any).Loader2;
export const SearchIcon = (Lucide as any).SearchIcon ?? (Lucide as any).Search;
export const SendIcon = (Lucide as any).SendIcon ?? (Lucide as any).Send;
export const SquareIcon = (Lucide as any).SquareIcon ?? (Lucide as any).Square;
export const WrenchIcon = (Lucide as any).WrenchIcon ?? (Lucide as any).Wrench;
export const XCircleIcon = (Lucide as any).XCircleIcon ?? (Lucide as any).XCircle;
export const XIcon = (Lucide as any).XIcon ?? (Lucide as any).X;

// Base icon names are re-exported below from lucide's ESM bundle. Avoid
// duplicating them here to prevent circular self-references during typing.

export * from 'lucide-react/dist/esm/lucide-react';
export default Lucide;
