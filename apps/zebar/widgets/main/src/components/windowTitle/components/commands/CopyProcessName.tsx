import { Check, Clipboard } from 'lucide-react';
import { useState } from 'react';
import { GlazeWmOutput } from 'zebar';
import { ContainerType } from '../../WindowTitle';
import { IconButton } from '../IconButton';
import { CommandProps } from './types/command';

const getWindowProcess = (glazewm: GlazeWmOutput | null): string | null => {
  if (!glazewm) return null;
  const focusedContainer = glazewm.focusedContainer;

  if (focusedContainer.type === ContainerType.WINDOW) {
    return focusedContainer.processName;
  }

  return null;
};

export const CopyProcessName = ({ glazewm }: CommandProps) => {
  const tooltipText = 'Copy process name of the window';
  const [copying, setCopying] = useState(false);

  const handleCopyProcessName = () => {
    const processName = getWindowProcess(glazewm);
    if (processName) {
      navigator.clipboard
        .writeText(processName)
        .then(() => {
          console.log(`Copied to clipboard: ${processName}`);
          setCopying(true);
          setTimeout(() => setCopying(false), 750);
        })
        .catch((err) => {
          console.error('Failed to copy text to clipboard:', err);
        });
    }
  };

  return (
    <IconButton
      animateKey={copying ? 'copying' : 'not-copying'}
      title={tooltipText}
      onClick={handleCopyProcessName}
      icon={copying ? Check : Clipboard}
    />
  );
};
