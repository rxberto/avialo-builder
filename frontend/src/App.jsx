import { useState, useEffect } from 'react'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import Navbar from './components/layout/Navbar';

function App() {
  const [result, setResult] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <Navbar darkMode={darkMode} toggleTheme={toggleTheme} />
      
      <main className="flex-1 flex flex-col relative z-0 pt-16">
      {!result
        ? <OnboardingFlow onComplete={setResult} />
        : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
            <Card className="w-full max-w-xl border-zinc-200 dark:border-zinc-800 shadow-md overflow-hidden">
              <CardHeader className="bg-zinc-900 dark:bg-zinc-900 text-white flex flex-row items-center gap-3 space-y-0">
                <CheckCircle2 className="text-emerald-400" />
                <CardTitle className="text-base">Datos de Arquitectura Recibidos</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative rounded-lg bg-zinc-950 dark:bg-zinc-900 p-4 overflow-auto border border-zinc-800">
                  <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="gap-2 border-zinc-200 dark:border-zinc-800"
                  >
                    <ArrowLeft size={15} /> Reiniciar Flujo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
      </main>
    </div>
  )
}

export default App