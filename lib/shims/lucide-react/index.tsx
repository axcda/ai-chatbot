import { forwardRef } from 'react';
import type { SVGProps } from 'react';
import * as Lucide from 'lucide-react/dist/esm/lucide-react';

const createStableIcon = (paths: Array<{ d: string; type?: 'path' | 'polyline' }>) =>
  forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function StableIcon(
    { strokeWidth = 2, ...props },
    ref,
  ) {
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
export const BookIcon = (Lucide as any).BookIcon ?? Lucide.Book;
export const BrainIcon = (Lucide as any).BrainIcon ?? Lucide.Brain;
export const CheckCircleIcon =
  (Lucide as any).CheckCircleIcon ?? Lucide.CheckCircle;
export const ChevronDownIcon =
  (Lucide as any).ChevronDownIcon ?? Lucide.ChevronDown;
export const ChevronLeftIcon =
  (Lucide as any).ChevronLeftIcon ?? Lucide.ChevronLeft;
export const ChevronRightIcon =
  (Lucide as any).ChevronRightIcon ?? Lucide.ChevronRight;
export const ChevronUpIcon =
  (Lucide as any).ChevronUpIcon ?? Lucide.ChevronUp;
export const CircleIcon = (Lucide as any).CircleIcon ?? Lucide.Circle;
export const ClockIcon = (Lucide as any).ClockIcon ?? Lucide.Clock;
export const Loader2Icon = (Lucide as any).Loader2Icon ?? Lucide.Loader2;
export const SearchIcon = (Lucide as any).SearchIcon ?? Lucide.Search;
export const SendIcon = (Lucide as any).SendIcon ?? Lucide.Send;
export const SquareIcon = (Lucide as any).SquareIcon ?? Lucide.Square;
export const WrenchIcon = (Lucide as any).WrenchIcon ?? Lucide.Wrench;
export const XCircleIcon = (Lucide as any).XCircleIcon ?? Lucide.XCircle;
export const XIcon = (Lucide as any).XIcon ?? Lucide.X;

export const ArrowDown = Lucide.ArrowDown;
export const ArrowLeft = Lucide.ArrowLeft;
export const ArrowRight = Lucide.ArrowRight;
export const ChevronDown = Lucide.ChevronDown;
export const ChevronLeft = Lucide.ChevronLeft;
export const ChevronRight = Lucide.ChevronRight;
export const ChevronUp = Lucide.ChevronUp;
export const PanelLeft = Lucide.PanelLeft;
export const Check = Lucide.Check;
export const Circle = Lucide.Circle;

export * from 'lucide-react/dist/esm/lucide-react';
export default Lucide;
