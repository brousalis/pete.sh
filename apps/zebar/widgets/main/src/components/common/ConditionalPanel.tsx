import { motion, AnimatePresence } from 'framer-motion';
import useMeasure from 'react-use-measure';
import { cn } from '../../utils/cn';

export function ConditionalPanel({
  children,
  sessionActive,
}: {
  children: React.ReactNode;
  sessionActive: boolean;
}) {
  const [ref, { width }] = useMeasure();

  const springConfig = {
    type: 'spring',
    stiffness: 120,
    damping: 20,
    mass: 0.8,
  };

  return (
    <AnimatePresence>
      {sessionActive && (
        <motion.div
          key="resizable-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: width || 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={springConfig}
          className="relative overflow-hidden h-full"
        >
          <div
            className={cn(
              width ? 'absolute' : 'relative',
              'h-full flex items-center'
            )}
            ref={ref}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
