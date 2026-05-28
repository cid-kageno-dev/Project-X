import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetWorkspace, 
  useListFiles, 
  useGetFile, 
  useUpdateFile,
  useListConversations,
  useSendMessage,
  useListTerminalSessions,
  useCreateTerminalSession,
  getGetWorkspaceQueryKey,
  getListFilesQueryKey,
  getGetFileQueryKey,
  getListConversationsQueryKey,
  getListTerminalSessionsQueryKey
} from "@workspace/api-client-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Editor from "@monaco-editor/react";
import { FileCode, File, Folder, FolderOpen, Play, TerminalSquare, MessageSquare, Send, ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

export default function Ide() {
  const { id } = useParams<{ id: string }>();
  const wsId = parseInt(id);
  const queryClient = useQueryClient();

  const { data: workspace, isLoading: wsLoading } = useGetWorkspace(wsId, { query: { enabled: !!wsId, queryKey: getGetWorkspaceQueryKey(wsId) }});
  
  // File Tree state
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const { data: files, isLoading: filesLoading } = useListFiles(wsId, { query: { enabled: !!wsId, queryKey: getListFilesQueryKey(wsId) }});
  
  // Editor state
  const { data: fileContent, isLoading: fileLoading } = useGetFile(wsId, selectedFileId as number, { 
    query: { enabled: !!selectedFileId, queryKey: getGetFileQueryKey(wsId, selectedFileId as number) }
  });
  
  const [content, setContent] = useState<string>("");
  const lastSaved = useRef<string>("");
  const updateFile = useUpdateFile();

  useEffect(() => {
    if (fileContent) {
      setContent(fileContent.content);
      lastSaved.current = fileContent.content;
    }
  }, [fileContent]);

  const handleSave = () => {
    if (selectedFileId && content !== lastSaved.current) {
      updateFile.mutate({
        workspaceId: wsId,
        fileId: selectedFileId,
        data: { content }
      }, {
        onSuccess: () => {
          lastSaved.current = content;
          queryClient.invalidateQueries({ queryKey: getGetFileQueryKey(wsId, selectedFileId) });
        }
      });
    }
  };

  // Debounced auto-save could go here, but let's stick to manual or simple for now
  
  // Chat state
  const { data: conversations } = useListConversations({ workspaceId: wsId }, { query: { enabled: !!wsId, queryKey: getListConversationsQueryKey({ workspaceId: wsId }) }});
  const conversation = conversations?.[0]; // just use the first one for simplicity
  const sendMessage = useSendMessage();
  const [chatInput, setChatInput] = useState("");

  const handleSendChat = () => {
    if (!chatInput.trim() || !conversation) return;
    sendMessage.mutate({
      id: conversation.id,
      data: { content: chatInput }
    }, {
      onSuccess: () => {
        setChatInput("");
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey({ workspaceId: wsId }) });
      }
    });
  };

  // Terminal state
  const { data: terminals } = useListTerminalSessions({ query: { queryKey: getListTerminalSessionsQueryKey() }});
  const wsTerminals = terminals?.filter(t => t.workspaceId === wsId);

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-border/50 bg-card/30 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          {wsLoading ? <Skeleton className="w-32 h-6" /> : <div className="font-semibold">{workspace?.name}</div>}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/git/${wsId}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs">Git</Button>
          </Link>
          <Link href={`/workspace/${wsId}/deploy`}>
            <Button size="sm" className="h-8 text-xs gap-1"><Play className="w-3 h-3" /> Deploy</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal">
          {/* Left Sidebar - File Tree */}
          <Panel defaultSize={20} minSize={15} maxSize={30} className="bg-card/20 border-r border-border/50 flex flex-col">
            <div className="p-2 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FolderOpen className="w-3 h-3" /> Explorer
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filesLoading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <div className="space-y-0.5">
                  {files?.map(file => (
                    <div 
                      key={file.id} 
                      className={`flex items-center gap-2 px-2 py-1 text-sm rounded cursor-pointer ${selectedFileId === file.id ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                      onClick={() => file.type === 'file' && setSelectedFileId(file.id)}
                    >
                      {file.type === 'directory' ? <Folder className="w-4 h-4 text-blue-400" /> : <FileCode className="w-4 h-4 text-muted-foreground" />}
                      <span className="truncate">{file.name}</span>
                    </div>
                  ))}
                  {(!files || files.length === 0) && (
                    <div className="text-xs text-muted-foreground italic p-2">No files in workspace</div>
                  )}
                </div>
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border/50 hover:bg-primary/50 transition-colors" />

          {/* Center - Editor & Terminal */}
          <Panel defaultSize={55} className="flex flex-col min-w-0">
            <PanelGroup direction="vertical">
              <Panel defaultSize={70} className="flex flex-col">
                <div className="h-10 border-b border-border/50 bg-card/40 flex items-center px-4 justify-between shrink-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {selectedFileId && fileContent ? (
                      <><File className="w-4 h-4 text-muted-foreground" /> {fileContent.path}</>
                    ) : (
                      <span className="text-muted-foreground italic">No file selected</span>
                    )}
                  </div>
                  {selectedFileId && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSave} 
                      disabled={content === lastSaved.current || updateFile.isPending}
                      className="h-7 text-xs gap-1"
                    >
                      {updateFile.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </Button>
                  )}
                </div>
                <div className="flex-1 relative">
                  {selectedFileId ? (
                    fileLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-background text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <Editor
                        height="100%"
                        language={fileContent?.language || "plaintext"}
                        theme="vs-dark"
                        value={content}
                        onChange={(val) => setContent(val || "")}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          fontFamily: "JetBrains Mono, monospace",
                          padding: { top: 16 },
                          scrollBeyondLastLine: false,
                          smoothScrolling: true,
                          cursorBlinking: "smooth",
                        }}
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
                      <div className="text-center">
                        <TerminalSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Select a file to edit</p>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
              
              <PanelResizeHandle className="h-1 bg-border/50 hover:bg-primary/50 transition-colors" />
              
              <Panel defaultSize={30} className="bg-[#0D1117] flex flex-col border-t border-border/50">
                <div className="h-8 bg-card/20 flex items-center px-4 border-b border-border/20 text-xs font-mono text-muted-foreground">
                  TERMINAL
                </div>
                <div className="flex-1 p-4 font-mono text-xs text-gray-300 overflow-y-auto">
                  {wsTerminals?.length ? (
                    <div>Terminal sessions active: {wsTerminals.length} (Simulation)</div>
                  ) : (
                    <div className="text-muted-foreground/50">No active terminal sessions.</div>
                  )}
                  <div className="mt-2 text-primary">➜ /workspace/{workspace?.name} $ <span className="animate-pulse">_</span></div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border/50 hover:bg-primary/50 transition-colors" />

          {/* Right Sidebar - AI Chat */}
          <Panel defaultSize={25} minSize={20} className="bg-card/10 flex flex-col border-l border-border/50">
            <div className="p-2 border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> Assistant
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Dummy chat messages based on UI guidelines */}
              <div className="flex flex-col gap-1">
                <div className="text-xs text-muted-foreground ml-1">System</div>
                <div className="bg-primary/10 border border-primary/20 text-sm p-3 rounded-lg rounded-tl-none">
                  Hello! I'm your NovaDev AI assistant. I have context on your current workspace. How can I help?
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-border/50 bg-card/30">
              <div className="relative">
                <Textarea 
                  placeholder="Ask the AI..." 
                  className="min-h-[80px] text-sm resize-none bg-background pr-10"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <Button 
                  size="icon" 
                  className="absolute right-2 bottom-2 h-6 w-6" 
                  onClick={handleSendChat}
                  disabled={sendMessage.isPending || !chatInput.trim()}
                >
                  {sendMessage.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
