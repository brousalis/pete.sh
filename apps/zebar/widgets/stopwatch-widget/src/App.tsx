import { useEffect } from 'react';
import * as zebar from 'zebar';
import { TimerStopwatchModal } from './components/TimerStopwatchModal';

function App() {
  useEffect(() => {
    zebar.currentWidget().tauriWindow.listen('tauri://blur', () => {
      zebar.currentWidget().close();
    });
  }, []);

  return (
    <div className="h-screen w-full relative flex flex-col shadow-sm bg-background/95 border border-button-border/80 backdrop-blur-xl text-text antialiased select-none rounded-lg font-mono overflow-hidden">
      <TimerStopwatchModal />
    </div>
  );
}

export default App;
