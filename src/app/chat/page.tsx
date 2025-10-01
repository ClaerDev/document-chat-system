'use client';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { CleanAIChat } from '@/components/ai/clean-ai-chat';
import { AISettingsPanel } from '@/components/ai/ai-settings-panel';
import { CitationsPanel } from '@/components/chat/citations-panel';
import { DocumentChatToggle } from '@/components/chat/document-chat-toggle';
import { DocumentScopeSelector } from '@/components/chat/document-scope-selector';
import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, ChevronDown } from 'lucide-react';
import { ChatState, DEFAULT_GENERAL_STATE } from '@/types/chat';

export default function ChatPage() {
  const { orgId, userId, isSignedIn } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [citationsOpen, setCitationsOpen] = useState(false);
  const [activeCitations, setActiveCitations] = useState([]);
  
  // Document chat state
  const [chatState, setChatState] = useState<ChatState>(DEFAULT_GENERAL_STATE);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [availableDocuments, setAvailableDocuments] = useState<Array<{id: string, name: string, folderId?: string}>>([]);
  const [availableFolders, setAvailableFolders] = useState<Array<{id: string, name: string}>>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Set hydration state
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Get organization ID via user sync
  useEffect(() => {
    const fetchOrgId = async () => {
      if (!userId || !isSignedIn) return;

      try {
        const userResponse = await fetch('/api/v1/user/sync', { method: 'POST' });
        const userData = await userResponse.json();
        
        if (userData.success && userData.data?.organizationId) {
          setOrganizationId(userData.data.organizationId);
        }
      } catch (error) {
        console.error('Failed to fetch organization ID:', error);
      }
    };

    fetchOrgId();
  }, [userId, isSignedIn]);

  // Load documents and folders when organization ID is available
  useEffect(() => {
    const loadDocumentsAndFolders = async () => {
      if (!organizationId || !isSignedIn) return;

      setDocumentsLoading(true);
      try {
        // Load documents and folders in parallel
        const [docsResponse, foldersResponse] = await Promise.all([
          fetch('/api/v1/documents'),
          fetch('/api/v1/folders')
        ]);

        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          if (docsData.success && docsData.documents) {
            setAvailableDocuments(docsData.documents.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              folderId: doc.folderId
            })));
          }
        }

        if (foldersResponse.ok) {
          const foldersData = await foldersResponse.json();
          if (foldersData.success && foldersData.folders) {
            setAvailableFolders(foldersData.folders.map((folder: any) => ({
              id: folder.id,
              name: folder.name
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load documents and folders:', error);
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadDocumentsAndFolders();
  }, [organizationId, isSignedIn]);

  // Handle document chat toggle
  const handleDocumentChatToggle = (enabled: boolean) => {
    if (enabled && availableDocuments.length > 0) {
      // Switch to document mode - load OpenAI provider
      setChatState({
        documentChatEnabled: true,
        documentScope: { 
          mode: 'all-documents',
          documentCount: availableDocuments.length 
        },
        provider: 'openai'
      });
    } else {
      // Switch back to general chat mode
      setChatState(DEFAULT_GENERAL_STATE);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        showNavigation={true}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header 
          onMobileMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          showNavigation={true}
        />

        {/* Chat content with settings panel */}
        <main className="flex-1 overflow-hidden flex" style={{ height: 'calc(100vh - 4rem)' }}>
          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {/* Chat header with document chat controls and settings */}
            <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold">
                  {chatState.documentChatEnabled ? 'Document Chat' : 'AI Chat'}
                </h1>
                
                {/* Document Chat Toggle */}
                {isSignedIn && isHydrated && (
                  <DocumentChatToggle
                    enabled={chatState.documentChatEnabled}
                    onToggle={handleDocumentChatToggle}
                    isLoading={documentsLoading}
                    documentCount={availableDocuments.length}
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Document Scope Selector - only show when document chat is enabled */}
                {isHydrated && chatState.documentChatEnabled && chatState.documentScope && (
                  <DocumentScopeSelector
                    currentScope={chatState.documentScope}
                    onScopeChange={(scope) => setChatState(prev => ({
                      ...prev,
                      documentScope: scope
                    }))}
                    availableDocuments={availableDocuments}
                    availableFolders={availableFolders}
                  />
                )}

                {/* Settings Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-4">
                      <AISettingsPanel className="h-fit" />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Chat component */}
            <div className="flex-1 overflow-hidden">
              <CleanAIChat 
                organizationId={organizationId || orgId || userId || 'demo'} 
                className="h-full w-full"
                demoMode={!isSignedIn}
                chatState={chatState}
                onCitationsUpdate={(citations) => {
                  setActiveCitations(citations);
                  setCitationsOpen(citations.length > 0);
                }}
              />
            </div>
          </div>

          {/* Citations panel */}
          <CitationsPanel
            isOpen={citationsOpen}
            onClose={() => setCitationsOpen(false)}
            citations={activeCitations}
          />
        </main>
      </div>
    </div>
  );
}