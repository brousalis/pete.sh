import { cn } from '../../utils/cn';

interface DividerProps extends React.ComponentPropsWithoutRef<'span'> {}

export default function Divider({ className, ...props }: DividerProps) {
  return (
    <span className={cn('w-[1px] h-3 bg-app-border', className)} {...props} />
  );
}
