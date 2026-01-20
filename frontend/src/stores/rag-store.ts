/**
 * RAG Store
 *
 * Zustand store for managing RAG state and configuration.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { DocumentInfo, CollectionInfo, RAGStatus, RAGParams, DocumentChunk } from "@/types";
import {
  getRagStatus,
  listDocuments,
  listCollections,
  uploadDocument,
  ingestText,
  deleteDocument,
  clearCollection,
  queryRag,
} from "@/services/rag-service";

interface RAGState {
  // Status
  status: RAGStatus | null;
  isLoading: boolean;
  error: string | null;

  // Documents & Collections
  documents: DocumentInfo[];
  collections: CollectionInfo[];
  activeCollection: string;

  // RAG Configuration
  ragParams: RAGParams;
  systemPrompt: string;
  instructionPrompt: string;
  contextText: string;

  // Retrieved context
  retrievedChunks: DocumentChunk[];
  assembledContext: string;

  // Actions - Status
  fetchStatus: () => Promise<void>;

  // Actions - Documents
  fetchDocuments: (collection?: string) => Promise<void>;
  uploadFile: (file: File, collection?: string) => Promise<DocumentInfo | null>;
  ingestTextContent: (text: string, title?: string, collection?: string) => Promise<DocumentInfo | null>;
  removeDocument: (documentId: string) => Promise<boolean>;

  // Actions - Collections
  fetchCollections: () => Promise<void>;
  setActiveCollection: (name: string) => void;
  clearActiveCollection: () => Promise<boolean>;

  // Actions - Configuration
  setRagParams: (params: Partial<RAGParams>) => void;
  setSystemPrompt: (prompt: string) => void;
  setInstructionPrompt: (prompt: string) => void;
  setContextText: (text: string) => void;

  // Actions - Retrieval
  retrieveContext: (query: string) => Promise<string | null>;
  clearRetrievedContext: () => void;

  // Actions - Utility
  clearError: () => void;
  reset: () => void;
}

const DEFAULT_RAG_PARAMS: RAGParams = {
  topK: 5,
  scoreThreshold: 0.3,
  collection: undefined,
  includeSources: true,
  contextTemplate: "",
};

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Answer questions based on the provided context. If the context doesn't contain relevant information, say so clearly.";

const DEFAULT_INSTRUCTION_PROMPT = `Use the following context to answer the question. Be concise and accurate.

Context:
{context}

Question: {question}

Answer:`;

export const useRAGStore = create<RAGState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        status: null,
        isLoading: false,
        error: null,
        documents: [],
        collections: [],
        activeCollection: "default",
        ragParams: DEFAULT_RAG_PARAMS,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        instructionPrompt: DEFAULT_INSTRUCTION_PROMPT,
        contextText: "",
        retrievedChunks: [],
        assembledContext: "",

        // Status actions
        fetchStatus: async () => {
          set({ isLoading: true, error: null });
          try {
            const status = await getRagStatus();
            set({ status, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to fetch RAG status",
              isLoading: false,
            });
          }
        },

        // Document actions
        fetchDocuments: async (collection?: string) => {
          set({ isLoading: true, error: null });
          try {
            const result = await listDocuments(collection || get().activeCollection);
            set({ documents: result.documents, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to fetch documents",
              isLoading: false,
            });
          }
        },

        uploadFile: async (file: File, collection?: string) => {
          set({ isLoading: true, error: null });
          try {
            const doc = await uploadDocument(
              file,
              collection || get().activeCollection,
              512, // Default chunk size
              50   // Default overlap
            );
            // Refresh documents list
            await get().fetchDocuments();
            set({ isLoading: false });
            return doc;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to upload document",
              isLoading: false,
            });
            return null;
          }
        },

        ingestTextContent: async (text: string, title?: string, collection?: string) => {
          set({ isLoading: true, error: null });
          try {
            const doc = await ingestText({
              text,
              title: title || "Pasted Text",
              collection: collection || get().activeCollection,
            });
            // Refresh documents list
            await get().fetchDocuments();
            set({ isLoading: false });
            return doc;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to ingest text",
              isLoading: false,
            });
            return null;
          }
        },

        removeDocument: async (documentId: string) => {
          set({ isLoading: true, error: null });
          try {
            await deleteDocument(documentId);
            // Refresh documents list
            await get().fetchDocuments();
            set({ isLoading: false });
            return true;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to delete document",
              isLoading: false,
            });
            return false;
          }
        },

        // Collection actions
        fetchCollections: async () => {
          set({ isLoading: true, error: null });
          try {
            const result = await listCollections();
            set({ collections: result.collections, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to fetch collections",
              isLoading: false,
            });
          }
        },

        setActiveCollection: (name: string) => {
          set({ activeCollection: name });
          get().fetchDocuments(name);
        },

        clearActiveCollection: async () => {
          set({ isLoading: true, error: null });
          try {
            await clearCollection(get().activeCollection);
            set({ documents: [], isLoading: false });
            return true;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to clear collection",
              isLoading: false,
            });
            return false;
          }
        },

        // Configuration actions
        setRagParams: (params: Partial<RAGParams>) => {
          set({ ragParams: { ...get().ragParams, ...params } });
        },

        setSystemPrompt: (prompt: string) => {
          set({ systemPrompt: prompt });
        },

        setInstructionPrompt: (prompt: string) => {
          set({ instructionPrompt: prompt });
        },

        setContextText: (text: string) => {
          set({ contextText: text });
        },

        // Retrieval actions
        retrieveContext: async (query: string) => {
          set({ isLoading: true, error: null });
          try {
            const { ragParams, activeCollection } = get();
            const result = await queryRag({
              query,
              collection: ragParams.collection || activeCollection,
              topK: ragParams.topK,
              scoreThreshold: ragParams.scoreThreshold,
              includeMetadata: true,
            });
            set({
              retrievedChunks: result.chunks,
              assembledContext: result.assembledContext,
              isLoading: false,
            });
            return result.assembledContext;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Failed to retrieve context",
              isLoading: false,
            });
            return null;
          }
        },

        clearRetrievedContext: () => {
          set({ retrievedChunks: [], assembledContext: "" });
        },

        // Utility actions
        clearError: () => set({ error: null }),

        reset: () => {
          set({
            status: null,
            isLoading: false,
            error: null,
            documents: [],
            collections: [],
            activeCollection: "default",
            ragParams: DEFAULT_RAG_PARAMS,
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
            instructionPrompt: DEFAULT_INSTRUCTION_PROMPT,
            contextText: "",
            retrievedChunks: [],
            assembledContext: "",
          });
        },
      }),
      {
        name: "rag-store",
        partialize: (state) => ({
          activeCollection: state.activeCollection,
          ragParams: state.ragParams,
          systemPrompt: state.systemPrompt,
          instructionPrompt: state.instructionPrompt,
        }),
      }
    ),
    { name: "rag-store" }
  )
);
