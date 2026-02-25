import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Upload,
  Trash2,
  CheckCircle,
  Image,
  MessageCircle,
  FileText,
  Star,
  Loader2,
  StickyNote,
  ArrowLeft,
  Check,
  Paperclip,
  Pencil,
  Download,
  Eye,
  User,
  Building2,
} from "lucide-react";
import { Link } from "wouter";

function getStatusColor(status: string) {
  switch (status) {
    case "open": return "bg-blue-100 text-blue-800";
    case "completed": return "bg-amber-100 text-amber-800";
    case "signed": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "open": return "Open";
    case "completed": return "Klaar voor goedkeuring";
    case "signed": return "Ondertekend";
    default: return status;
  }
}

function isImageFile(filePath: string | null): boolean {
  if (!filePath) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filePath);
}

function isPdfFile(filePath: string | null): boolean {
  if (!filePath) return false;
  return /\.pdf$/i.test(filePath);
}

function getFileName(filePath: string | null): string {
  if (!filePath) return "Bestand";
  const parts = filePath.split("/");
  const name = parts[parts.length - 1];
  return name.replace(/^dossier-\d+-[a-f0-9]+/, "").replace(/^invoice-/, "Factuur-").replace(/^-/, "") || name;
}

function EditableCaption({ entry, dossierId }: { entry: any; dossierId: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.caption || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (caption: string) => {
      await apiRequest("PATCH", `/api/dossiers/${dossierId}/entries/${entry.id}`, { caption });
    },
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/dossiers", String(dossierId)] });
    },
    onError: () => {
      toast({ title: "Fout", description: "Bijschrift opslaan mislukt", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(value);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        className="h-7 text-xs"
        data-testid={`input-edit-caption-${entry.id}`}
      />
    );
  }

  return (
    <div
      className="flex items-center gap-1 cursor-pointer group"
      onClick={() => { setValue(entry.caption || ""); setEditing(true); }}
      data-testid={`text-caption-${entry.id}`}
    >
      <p className="text-xs text-muted-foreground truncate flex-1">
        {entry.caption || getFileName(entry.filePath) || new Date(entry.createdAt).toLocaleDateString("nl-NL")}
      </p>
      <Pencil className="w-3 h-3 text-muted-foreground invisible group-hover:visible flex-shrink-0" />
    </div>
  );
}

function EntryCard({ entry, dossierId, onDelete }: { entry: any; dossierId: number; onDelete: (id: number) => void }) {
  return (
    <Card className="overflow-visible" data-testid={`card-entry-${entry.id}`}>
      <div className="overflow-hidden rounded-t-md">
        {entry.type === "note" ? (
          <div className="p-3 bg-amber-50 dark:bg-amber-950 h-36 overflow-auto">
            <StickyNote className="w-4 h-4 text-amber-600 mb-1" />
            <p className="text-sm">{entry.content}</p>
          </div>
        ) : entry.filePath && isImageFile(entry.filePath) ? (
          <a href={entry.filePath} target="_blank" rel="noopener noreferrer">
            <img src={entry.filePath} alt={entry.caption || "Foto"} className="w-full h-36 object-cover hover:opacity-90 transition-opacity" />
          </a>
        ) : entry.filePath && isPdfFile(entry.filePath) ? (
          <a href={entry.filePath} target="_blank" rel="noopener noreferrer" className="block h-36 bg-red-50 dark:bg-red-950 p-3 hover:bg-red-100 dark:hover:bg-red-900 transition-colors">
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <FileText className="w-8 h-8 text-red-500" />
              <span className="text-xs text-red-700 dark:text-red-300 font-medium text-center truncate max-w-full px-1">
                {entry.caption || getFileName(entry.filePath)}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-red-500">
                <Eye className="w-3 h-3" /> Bekijken
              </div>
            </div>
          </a>
        ) : entry.filePath ? (
          <a href={entry.filePath} target="_blank" rel="noopener noreferrer" className="h-36 flex flex-col items-center justify-center bg-muted block hover:bg-muted/80 transition-colors">
            <Download className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground text-center truncate max-w-full px-2">
              {entry.caption || getFileName(entry.filePath)}
            </span>
          </a>
        ) : (
          <div className="h-36 flex items-center justify-center bg-muted">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardContent className="p-2 flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <EditableCaption entry={entry} dossierId={dossierId} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(entry.id)}
          data-testid={`button-delete-entry-${entry.id}`}
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const dossierId = parseInt(params.id);
  const dossierIdStr = String(dossierId);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newMessage, setNewMessage] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [caption, setCaption] = useState("");
  const [activeTab, setActiveTab] = useState<"entries" | "chat" | "signature">("entries");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/dossiers", dossierIdStr],
    enabled: !!dossierId,
  });

  const { data: messagesData } = useQuery<any[]>({
    queryKey: ["/api/dossiers", dossierIdStr, "messages"],
    enabled: !!dossierId && activeTab === "chat",
    refetchInterval: 5000,
  });

  const messages = messagesData || data?.messages || [];

  useEffect(() => {
    if (messagesEndRef.current && activeTab === "chat") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/dossiers/${dossierId}/entries`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload mislukt");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Geüpload", description: "Bestand succesvol toegevoegd" });
      queryClient.invalidateQueries({ queryKey: ["/api/dossiers", dossierIdStr] });
      setCaption("");
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("type", "note");
      formData.append("content", noteContent);
      formData.append("caption", "Notitie");
      const res = await fetch(`/api/dossiers/${dossierId}/entries`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Notitie toevoegen mislukt");
      return res.json();
    },
    onSuccess: () => {
      setNoteContent("");
      toast({ title: "Toegevoegd", description: "Notitie toegevoegd aan dossier" });
      queryClient.invalidateQueries({ queryKey: ["/api/dossiers", dossierIdStr] });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await apiRequest("DELETE", `/api/dossiers/${dossierId}/entries/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dossiers", dossierIdStr] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, file }: { message: string; file?: File }) => {
      const formData = new FormData();
      formData.append("message", message);
      if (file) formData.append("file", file);
      const res = await fetch(`/api/dossiers/${dossierId}/messages`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Bericht verzenden mislukt");
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/dossiers", dossierIdStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/dossiers", dossierIdStr, "messages"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/dossiers/${dossierId}/complete`);
    },
    onSuccess: () => {
      toast({ title: "Status bijgewerkt", description: "Dossier is klaar voor goedkeuring door de klant" });
      queryClient.invalidateQueries({ queryKey: ["/api/dossiers", dossierIdStr] });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", file.type.startsWith("image/") ? "photo" : "file");
    if (caption) formData.append("caption", caption);
    uploadMutation.mutate(formData);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({ message: newMessage });
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendMessageMutation.mutate({ message: newMessage || "", file });
    setNewMessage("");
    if (chatFileInputRef.current) chatFileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.dossier) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-muted-foreground">Dossier niet gevonden.</p>
      </div>
    );
  }

  const { dossier, clientUser, quotation, entries = [], signature } = data;

  const tenantEntries = entries.filter((e: any) => e.createdBy === "tenant");
  const clientEntries = entries.filter((e: any) => e.createdBy === "client");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dossiers">
          <Button variant="ghost" size="icon" data-testid="button-back-dossiers">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" data-testid="text-dossier-detail-title">{dossier.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {clientUser && <span>{clientUser.name} ({clientUser.email})</span>}
          </div>
        </div>
        <Badge className={getStatusColor(dossier.status)} data-testid="badge-detail-status">
          {getStatusLabel(dossier.status)}
        </Badge>
        {dossier.status === "open" && (
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            variant="outline"
            data-testid="button-complete-dossier"
          >
            <Check className="w-4 h-4 mr-1" />
            Markeer als klaar
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTab === "entries" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("entries")}
          data-testid="button-tab-entries"
        >
          <Image className="w-4 h-4 mr-1" /> Bestanden ({entries.length})
        </Button>
        <Button
          variant={activeTab === "chat" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("chat")}
          data-testid="button-tab-messages"
        >
          <MessageCircle className="w-4 h-4 mr-1" /> Berichten ({messages.length})
        </Button>
        {signature && (
          <Button
            variant={activeTab === "signature" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("signature")}
            data-testid="button-tab-signature"
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Handtekening
          </Button>
        )}
      </div>

      {activeTab === "entries" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bestand uploaden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Bijschrift (optioneel)"
                  data-testid="input-caption"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload-file"
                >
                  {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  Upload
                </Button>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Notitie toevoegen</p>
                <div className="flex gap-2">
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Schrijf een notitie..."
                    rows={2}
                    data-testid="input-note"
                  />
                  <Button
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!noteContent.trim() || addNoteMutation.isPending}
                    variant="outline"
                    data-testid="button-add-note"
                  >
                    <StickyNote className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Onze bestanden ({tenantEntries.length})</h3>
            </div>
            {tenantEntries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Nog geen bestanden geüpload.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {tenantEntries.map((entry: any) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    dossierId={dossierId}
                    onDelete={(id) => deleteEntryMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Van klant ({clientEntries.length})</h3>
            </div>
            {clientEntries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">De klant heeft nog geen bestanden gestuurd.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {clientEntries.map((entry: any) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    dossierId={dossierId}
                    onDelete={(id) => deleteEntryMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "chat" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Berichten met klant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 max-h-[28rem] overflow-y-auto mb-4 p-2" data-testid="chat-messages-container">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nog geen berichten.</p>
              ) : (
                messages.map((msg: any) => {
                  const isTenant = msg.senderType === "tenant";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isTenant ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.id}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 ${
                          isTenant
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        <p className={`text-xs font-semibold mb-0.5 ${isTenant ? "text-primary-foreground/80" : "text-foreground/70"}`}>
                          {msg.senderName}
                          {!isTenant && (
                            <span className="ml-1 text-[10px] opacity-70">(klant)</span>
                          )}
                        </p>
                        {msg.filePath && (
                          <a href={msg.filePath} target="_blank" rel="noopener noreferrer" className="block mb-1">
                            {isImageFile(msg.filePath) ? (
                              <img
                                src={msg.filePath}
                                alt="Bijlage"
                                className="max-w-full max-h-48 rounded-md object-cover"
                                data-testid={`img-message-${msg.id}`}
                              />
                            ) : isPdfFile(msg.filePath) ? (
                              <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${isTenant ? "bg-white/10" : "bg-background"}`}>
                                <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <span className="truncate">{getFileName(msg.filePath)}</span>
                              </div>
                            ) : (
                              <div className={`flex items-center gap-1 text-xs underline ${isTenant ? "text-primary-foreground" : ""}`}>
                                <Download className="w-3 h-3" />
                                {getFileName(msg.filePath)}
                              </div>
                            )}
                          </a>
                        )}
                        {msg.message && (
                          <p className="text-sm break-words">{msg.message}</p>
                        )}
                        <p className={`text-[10px] mt-1 ${isTenant ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleString("nl-NL")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              <input
                type="file"
                ref={chatFileInputRef}
                onChange={handleChatFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => chatFileInputRef.current?.click()}
                data-testid="button-chat-attach-file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Schrijf een bericht..."
                data-testid="input-tenant-message"
              />
              <Button type="submit" size="icon" disabled={sendMessageMutation.isPending} data-testid="button-send-tenant-message">
                {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "signature" && signature && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700 flex-wrap">
              <CheckCircle className="w-5 h-5" /> Handtekening ontvangen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-md">
              <p className="text-lg font-semibold italic text-green-800 dark:text-green-200">{signature.signature}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                Ondertekend op {new Date(signature.signedAt).toLocaleString("nl-NL")}
              </p>
            </div>

            {signature.rating && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Beoordeling:</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${s <= signature.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {signature.feedback && (
              <div>
                <span className="text-sm text-muted-foreground">Feedback:</span>
                <p className="text-sm mt-1 p-3 bg-muted rounded-md">{signature.feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
