import { SwapInterface } from '@/components/swap-interface';
import { TopBar } from '@/components/top-bar';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <main className="pt-24 pb-8 flex items-center justify-center min-h-screen">
        <SwapInterface />
      </main>
    </div>
  );
}
