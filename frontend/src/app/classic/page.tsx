import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PromptArena } from "@/components/arena/prompt-arena";

/**
 * Classic Mode Page
 *
 * The original ChatGPT-style interface for those who prefer
 * a more traditional chat experience.
 */
export default function ClassicPage() {
  return (
    <div className="flex h-screen flex-col bg-surface-secondary">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <PromptArena />
        </main>
      </div>
    </div>
  );
}
