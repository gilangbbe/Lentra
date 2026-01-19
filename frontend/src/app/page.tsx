import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PromptArena } from "@/components/arena/prompt-arena";

/**
 * Home Page - Main Prompt Arena
 *
 * This is the primary view per architecture:
 * "Submit a single prompt to multiple models"
 */
export default function HomePage() {
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
