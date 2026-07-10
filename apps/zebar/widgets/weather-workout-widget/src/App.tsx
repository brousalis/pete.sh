import { useEffect } from 'react';
import * as zebar from 'zebar';
import { WeatherWorkoutWidget } from './components/WeatherWorkoutWidget';

function App() {
  useEffect(() => {
    zebar.currentWidget().tauriWindow.listen('tauri://blur', () => {
      zebar.currentWidget().close();
    });
  }, []);

  return (
    <div className="weather-workout-panel h-screen w-full overflow-hidden rounded-lg border border-button-border/40 bg-background/95 text-text shadow-sm antialiased backdrop-blur-xl">
      <WeatherWorkoutWidget />
    </div>
  );
}

export default App;
