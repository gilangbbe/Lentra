"use client";

/**
 * RAG Configuration Panel
 * 
 * Comprehensive panel for configuring RAG behavior including:
 * - Document upload and management
 * - Context text input
 * - System and instruction prompts
 * - LLM generation parameters
 * - RAG retrieval parameters
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Trash2,
  Settings,
  BookOpen,
  Sparkles,
  Database,
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRAGStore } from "@/stores/rag-store";
import type { GenerationParams, RAGParams } from "@/types";

interface RAGConfigPanelProps {
  className?: string;
  generationParams: GenerationParams;
  onGenerationParamsChange: (params: Partial<GenerationParams>) => void;
  compact?: boolean;
}

type TabId = "documents" | "context" | "prompts" | "params";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "documents", label: "Documents", icon: <FileText className="w-4 h-4" /> },
  { id: "context", label: "Context", icon: <BookOpen className="w-4 h-4" /> },
  { id: "prompts", label: "Prompts", icon: <Sparkles className="w-4 h-4" /> },
  { id: "params", label: "Parameters", icon: <Settings className="w-4 h-4" /> },
];

export function RAGConfigPanel({
  className,
  generationParams,
  onGenerationParamsChange,
  compact = false,
}: RAGConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("context");
  const [isExpanded, setIsExpanded] = useState(!compact);
  
  const {
    status,
    documents,
    isLoading,
    error,
    ragParams,
    systemPrompt,
    instructionPrompt,
    contextText,
    fetchStatus,
    fetchDocuments,
    uploadFile,
    ingestTextContent,
    removeDocument,
    setRagParams,
    setSystemPrompt,
    setInstructionPrompt,
    setContextText,
    clearError,
  } = useRAGStore();

  // Fetch RAG status on mount
  useEffect(() => {
    fetchStatus();
    fetchDocuments();
  }, [fetchStatus, fetchDocuments]);

  if (compact && !isExpanded) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          "bg-slate-800/60 backdrop-blur-sm border border-white/10",
          "text-white/80 hover:text-white hover:bg-slate-700/60",
          "transition-colors",
          className
        )}
      >
        <Database className="w-4 h-4" />
        <span className="text-sm font-medium">RAG Config</span>
        <ChevronDown className="w-4 h-4" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-slate-900/80 backdrop-blur-md",
        "border border-white/10",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-white">RAG Configuration</h3>
          {status && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              status.enabled
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            )}>
              {status.enabled ? "Enabled" : "Disabled"}
            </span>
          )}
        </div>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
              "border-b-2 -mb-px",
              activeTab === tab.id
                ? "text-sky-400 border-sky-400"
                : "text-white/60 border-transparent hover:text-white/80"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === "documents" && (
            <DocumentsTab
              documents={documents}
              isLoading={isLoading}
              onUpload={uploadFile}
              onDelete={removeDocument}
              onRefresh={() => fetchDocuments()}
            />
          )}
          {activeTab === "context" && (
            <ContextTab
              contextText={contextText}
              onContextChange={setContextText}
              onIngest={ingestTextContent}
              isLoading={isLoading}
            />
          )}
          {activeTab === "prompts" && (
            <PromptsTab
              systemPrompt={systemPrompt}
              instructionPrompt={instructionPrompt}
              onSystemPromptChange={setSystemPrompt}
              onInstructionPromptChange={setInstructionPrompt}
            />
          )}
          {activeTab === "params" && (
            <ParametersTab
              generationParams={generationParams}
              ragParams={ragParams}
              onGenerationParamsChange={onGenerationParamsChange}
              onRagParamsChange={setRagParams}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Documents Tab
// ============================================================================

interface DocumentsTabProps {
  documents: Array<{ id: string; filename: string; chunks: number; indexedAt: string }>;
  isLoading: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onDelete: (id: string) => Promise<boolean>;
  onRefresh: () => void;
}

function DocumentsTab({ documents, isLoading, onUpload, onDelete, onRefresh }: DocumentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadProgress(true);
    await onUpload(file);
    setUploadProgress(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-4"
    >
      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          "border-white/20 hover:border-sky-400/50 hover:bg-sky-400/5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className={cn(
          "w-8 h-8 mx-auto mb-2",
          uploadProgress ? "text-sky-400 animate-pulse" : "text-white/40"
        )} />
        <p className="text-sm text-white/60">
          {uploadProgress ? "Uploading..." : "Click to upload or drag & drop"}
        </p>
        <p className="text-xs text-white/40 mt-1">PDF, DOCX, TXT, MD files</p>
      </div>

      {/* Document list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white/80">Indexed Documents</h4>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">No documents indexed</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{doc.filename}</p>
                    <p className="text-xs text-white/40">{doc.chunks} chunks</p>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(doc.id)}
                  className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Context Tab
// ============================================================================

interface ContextTabProps {
  contextText: string;
  onContextChange: (text: string) => void;
  onIngest: (text: string, title?: string) => Promise<unknown>;
  isLoading: boolean;
}

function ContextTab({ contextText, onContextChange, onIngest, isLoading }: ContextTabProps) {
  const [title, setTitle] = useState("Context Document");
  const [showIngested, setShowIngested] = useState(false);

  const handleIngest = async () => {
    if (!contextText.trim()) return;
    await onIngest(contextText, title);
    setShowIngested(true);
    setTimeout(() => setShowIngested(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Direct Context / Reference Text
        </label>
        <p className="text-xs text-white/50 mb-2">
          Paste text that will be used as context for the LLM responses.
          This can be used instead of or in addition to RAG retrieval.
        </p>
        <textarea
          value={contextText}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder="Paste your reference document, context, or knowledge base here..."
          className={cn(
            "w-full h-40 px-3 py-2 rounded-lg resize-none",
            "bg-slate-800/50 border border-white/10",
            "text-white text-sm placeholder:text-white/30",
            "focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
          )}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-white/40">
            {contextText.length} characters
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className={cn(
                "w-40 px-2 py-1 rounded text-xs",
                "bg-slate-800/50 border border-white/10",
                "text-white placeholder:text-white/30",
                "focus:outline-none focus:border-sky-400/50"
              )}
            />
            <button
              onClick={handleIngest}
              disabled={!contextText.trim() || isLoading}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded text-xs font-medium",
                "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              {showIngested ? (
                <>
                  <Check className="w-3 h-3" />
                  Indexed!
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  Index for RAG
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Prompts Tab
// ============================================================================

interface PromptsTabProps {
  systemPrompt: string;
  instructionPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  onInstructionPromptChange: (prompt: string) => void;
}

function PromptsTab({
  systemPrompt,
  instructionPrompt,
  onSystemPromptChange,
  onInstructionPromptChange,
}: PromptsTabProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-4"
    >
      {/* System Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-white/80">System Prompt</label>
          <button
            onClick={() => copyToClipboard(systemPrompt, "system")}
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
          >
            {copied === "system" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <p className="text-xs text-white/50 mb-2">
          Sets the behavior and persona of the AI assistant.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          placeholder="You are a helpful AI assistant..."
          className={cn(
            "w-full h-24 px-3 py-2 rounded-lg resize-none",
            "bg-slate-800/50 border border-white/10",
            "text-white text-sm placeholder:text-white/30",
            "focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
          )}
        />
      </div>

      {/* Instruction Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-white/80">Instruction Template</label>
          <button
            onClick={() => copyToClipboard(instructionPrompt, "instruction")}
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
          >
            {copied === "instruction" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <p className="text-xs text-white/50 mb-2">
          Template for combining context with question. Use <code className="text-sky-400">{"{context}"}</code> and <code className="text-sky-400">{"{question}"}</code> placeholders.
        </p>
        <textarea
          value={instructionPrompt}
          onChange={(e) => onInstructionPromptChange(e.target.value)}
          placeholder="Use the following context to answer: {context}..."
          className={cn(
            "w-full h-32 px-3 py-2 rounded-lg resize-none font-mono text-xs",
            "bg-slate-800/50 border border-white/10",
            "text-white placeholder:text-white/30",
            "focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
          )}
        />
      </div>
    </motion.div>
  );
}

// ============================================================================
// Parameters Tab
// ============================================================================

interface ParametersTabProps {
  generationParams: GenerationParams;
  ragParams: RAGParams;
  onGenerationParamsChange: (params: Partial<GenerationParams>) => void;
  onRagParamsChange: (params: Partial<RAGParams>) => void;
}

interface SliderParamProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  description?: string;
  displayValue?: string;
}

function SliderParam({ label, value, min, max, step, onChange, description, displayValue }: SliderParamProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-white/70">{label}</label>
        <span className="text-xs text-sky-400 font-mono">{displayValue ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-sky"
      />
      {description && (
        <p className="text-[10px] text-white/40">{description}</p>
      )}
    </div>
  );
}

function ParametersTab({
  generationParams,
  ragParams,
  onGenerationParamsChange,
  onRagParamsChange,
}: ParametersTabProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-6"
    >
      {/* RAG Parameters */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <Search className="w-4 h-4 text-sky-400" />
          RAG Retrieval
        </h4>
        
        <SliderParam
          label="Top K (chunks to retrieve)"
          value={ragParams.topK ?? 5}
          min={1}
          max={20}
          step={1}
          onChange={(v) => onRagParamsChange({ topK: v })}
          description="Number of document chunks to retrieve"
        />

        <SliderParam
          label="Score Threshold"
          value={ragParams.scoreThreshold ?? 0.3}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onRagParamsChange({ scoreThreshold: v })}
          description="Minimum relevance score for inclusion"
          displayValue={(ragParams.scoreThreshold ?? 0.3).toFixed(2)}
        />
      </div>

      {/* Generation Parameters */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          LLM Generation
        </h4>

        <SliderParam
          label="Temperature"
          value={generationParams.temperature ?? 0.7}
          min={0}
          max={2}
          step={0.1}
          onChange={(v) => onGenerationParamsChange({ temperature: v })}
          description="Higher = more creative, Lower = more focused"
          displayValue={(generationParams.temperature ?? 0.7).toFixed(1)}
        />

        <SliderParam
          label="Max Tokens"
          value={generationParams.maxTokens ?? 1024}
          min={64}
          max={4096}
          step={64}
          onChange={(v) => onGenerationParamsChange({ maxTokens: v })}
          description="Maximum response length"
        />

        <SliderParam
          label="Top P (Nucleus Sampling)"
          value={generationParams.topP ?? 0.9}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onGenerationParamsChange({ topP: v })}
          description="Cumulative probability threshold"
          displayValue={(generationParams.topP ?? 0.9).toFixed(2)}
        />

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70"
        >
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Advanced Parameters
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <SliderParam
                label="Top K (Sampling)"
                value={generationParams.topK ?? 40}
                min={1}
                max={100}
                step={1}
                onChange={(v) => onGenerationParamsChange({ topK: v })}
                description="Number of top tokens to consider"
              />

              <SliderParam
                label="Repeat Penalty"
                value={generationParams.repeatPenalty ?? 1.1}
                min={1}
                max={2}
                step={0.05}
                onChange={(v) => onGenerationParamsChange({ repeatPenalty: v })}
                description="Penalize repeated tokens"
                displayValue={(generationParams.repeatPenalty ?? 1.1).toFixed(2)}
              />

              <SliderParam
                label="Presence Penalty"
                value={generationParams.presencePenalty ?? 0}
                min={-2}
                max={2}
                step={0.1}
                onChange={(v) => onGenerationParamsChange({ presencePenalty: v })}
                description="Encourage new topics"
                displayValue={(generationParams.presencePenalty ?? 0).toFixed(1)}
              />

              <SliderParam
                label="Frequency Penalty"
                value={generationParams.frequencyPenalty ?? 0}
                min={-2}
                max={2}
                step={0.1}
                onChange={(v) => onGenerationParamsChange({ frequencyPenalty: v })}
                description="Reduce word repetition"
                displayValue={(generationParams.frequencyPenalty ?? 0).toFixed(1)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default RAGConfigPanel;
