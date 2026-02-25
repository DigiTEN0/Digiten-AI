import { useEffect, useRef, useState } from "react";
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
  CheckCircle,
  Image,
  MessageCircle,
  FileText,
  Star,
  Loader2,
  PenTool,
  Paperclip,
  X,
  Download,
  Eye,
} from "lucide-react";

function getPortalStatusColor(status: string) {
  switch (status) {
    case "open": return "bg-blue-100 text-blue-800";
    case "completed": return "bg-amber-100 text-amber-800";
    case "signed": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getPortalStatusLabel(status: string) {
  switch (status) {
    case "open": return "In behandeling";
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

export default function ClientPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { toast } = useToast();

  const [signatureData, setSignatureData] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"dossier" | "chat" | "sign">("dossier");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("clientToken", token);
    }
  }, [token]);

  const { data: portalData, isLoading: loadingDossier } = useQuery<any>({
    queryKey: ["/api/client/dossier", token],
    enabled: !!token,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery<any[]>({
    queryKey: ["/api/client/dossier", token, "entries"],
    enabled: !!token,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<any[]>({
    queryKey: ["/api/client/dossier", token, "messages"],
    enabled: !!token,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const signMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/client/dossier/${token}/sign`, {
        signature: signatureData,
        feedback: feedback || null,
        rating: rating || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Ondertekend", description: "Uw handtekening is opgeslagen" });
      queryClient.invalidateQueries({ queryKey: ["/api/client/dossier", token] });
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !chatFile) return;
    setIsSendingMessage(true);
    try {
      const formData = new FormData();
      if (newMessage.trim()) {
        formData.append("message", newMessage.trim());
      }
      if (chatFile) {
        formData.append("file", chatFile);
      }
      const res = await fetch(`/api/client/dossier/${token}/messages`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Bericht versturen mislukt");
      }
      setNewMessage("");
      setChatFile(null);
      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["/api/client/dossier", token, "messages"] });
    } catch {
      toast({ title: "Fout", description: "Bericht kon niet worden verstuurd", variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (loadingDossier) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!portalData?.dossier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Geen dossier gevonden of ongeldige link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { dossier, organization, quotation, signature } = portalData;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization?.logo && (
              <img src={organization.logo} alt={organization.name} className="h-8 object-contain" />
            )}
            <div>
              <h1 className="font-semibold text-lg" data-testid="text-portal-org-name">{organization?.name}</h1>
              <p className="text-sm text-muted-foreground">Klantenportaal</p>
            </div>
          </div>
          <Badge className={getPortalStatusColor(dossier.status)} data-testid="badge-dossier-status">
            {getPortalStatusLabel(dossier.status)}
          </Badge>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg" data-testid="text-dossier-title">{dossier.title}</CardTitle>
            {quotation && (
              <p className="text-sm text-muted-foreground">
                Offerte: {quotation.clientName} &middot; Totaal: &euro;{parseFloat(quotation.total || "0").toFixed(2)}
              </p>
            )}
          </CardHeader>
        </Card>

        <div className="flex gap-2">
          <Button
            variant={activeTab === "dossier" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("dossier")}
            data-testid="button-tab-dossier"
          >
            <Image className="w-4 h-4 mr-1" /> Dossier
          </Button>
          <Button
            variant={activeTab === "chat" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("chat")}
            data-testid="button-tab-chat"
          >
            <MessageCircle className="w-4 h-4 mr-1" /> Berichten
            {messages.filter((m: any) => m.senderType === "tenant" && !m.isRead).length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {messages.filter((m: any) => m.senderType === "tenant" && !m.isRead).length}
              </span>
            )}
          </Button>
          {dossier.status === "completed" && !signature && (
            <Button
              variant={activeTab === "sign" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("sign")}
              data-testid="button-tab-sign"
            >
              <PenTool className="w-4 h-4 mr-1" /> Ondertekenen
            </Button>
          )}
        </div>

        {activeTab === "dossier" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Bestanden & Foto's
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEntries ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : entries.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Er zijn nog geen bestanden geüpload.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {entries.map((entry: any) => (
                    <div key={entry.id} className="border rounded-lg overflow-hidden" data-testid={`card-entry-${entry.id}`}>
                      {entry.type === "note" ? (
                        <div className="p-3 bg-amber-50 h-32 overflow-auto">
                          <p className="text-sm">{entry.content}</p>
                        </div>
                      ) : entry.filePath && isImageFile(entry.filePath) ? (
                        <a href={entry.filePath} target="_blank" rel="noopener noreferrer">
                          <img
                            src={entry.filePath}
                            alt={entry.caption || "Foto"}
                            className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : entry.filePath && isPdfFile(entry.filePath) ? (
                        <a
                          href={entry.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-32 bg-red-50 p-3 hover:bg-red-100 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <FileText className="w-8 h-8 text-red-500" />
                            <span className="text-xs text-red-700 font-medium text-center truncate max-w-full px-1">
                              {entry.caption || getFileName(entry.filePath)}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-red-500">
                              <Eye className="w-3 h-3" /> Bekijken
                            </div>
                          </div>
                        </a>
                      ) : entry.filePath ? (
                        <a
                          href={entry.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-32 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <Download className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground text-center truncate max-w-full px-2">
                            {entry.caption || getFileName(entry.filePath)}
                          </span>
                        </a>
                      ) : (
                        <div className="p-3 h-32 flex items-center justify-center bg-gray-50">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="p-2 border-t">
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.caption || getFileName(entry.filePath) || new Date(entry.createdAt).toLocaleDateString("nl-NL")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "chat" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Berichten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto mb-4 p-2" style={{ background: "linear-gradient(to bottom, hsl(var(--muted) / 0.3), hsl(var(--muted) / 0.1))" }}>
                {loadingMessages ? (
                  <Skeleton className="h-20 w-full" />
                ) : messages.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Nog geen berichten.
                  </p>
                ) : (
                  messages.map((msg: any) => {
                    const isClient = msg.senderType === "client";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isClient ? "justify-end" : "justify-start"}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isClient
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          <p className={`text-xs font-bold mb-1 ${isClient ? "text-primary-foreground/80" : "text-foreground/70"}`}>
                            {msg.senderName}
                          </p>
                          {msg.filePath && (
                            <a href={msg.filePath} target="_blank" rel="noopener noreferrer" className="block mb-2">
                              {isImageFile(msg.filePath) ? (
                                <img
                                  src={msg.filePath}
                                  alt="Bijlage"
                                  className="rounded-md max-h-48 object-cover cursor-pointer"
                                  data-testid={`img-message-file-${msg.id}`}
                                />
                              ) : isPdfFile(msg.filePath) ? (
                                <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${isClient ? "bg-white/10" : "bg-background"}`}>
                                  <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                                  <span className="truncate">{getFileName(msg.filePath)}</span>
                                </div>
                              ) : (
                                <div className={`flex items-center gap-1 text-xs underline ${isClient ? "text-primary-foreground" : ""}`}>
                                  <Download className="w-3 h-3" />
                                  {getFileName(msg.filePath)}
                                </div>
                              )}
                            </a>
                          )}
                          {msg.message && (
                            <p className="text-sm break-words">{msg.message}</p>
                          )}
                          <p className={`text-[10px] mt-1 ${isClient ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.createdAt).toLocaleString("nl-NL")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              {chatFile && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-muted">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm truncate flex-1" data-testid="text-chat-file-name">{chatFile.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => { setChatFile(null); if (chatFileInputRef.current) chatFileInputRef.current.value = ""; }}
                    data-testid="button-remove-chat-file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={chatFileInputRef}
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) setChatFile(e.target.files[0]); }}
                  data-testid="input-chat-file"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => chatFileInputRef.current?.click()}
                  data-testid="button-attach-file"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Schrijf een bericht..."
                  data-testid="input-client-message"
                />
                <Button type="submit" size="icon" disabled={isSendingMessage} data-testid="button-send-message">
                  {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "sign" && dossier.status === "completed" && !signature && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="w-4 h-4" /> Goedkeuren & Ondertekenen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Beoordeling (optioneel)</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      data-testid={`button-star-${star}`}
                    >
                      <Star
                        className={`w-6 h-6 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Feedback (optioneel)</p>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Eventuele opmerkingen..."
                  rows={3}
                  data-testid="input-feedback"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Handtekening</p>
                <Textarea
                  value={signatureData}
                  onChange={(e) => setSignatureData(e.target.value)}
                  placeholder="Typ hier uw volledige naam als digitale handtekening"
                  rows={2}
                  data-testid="input-signature"
                />
              </div>

              <Button
                onClick={() => signMutation.mutate()}
                disabled={!signatureData || signMutation.isPending}
                className="w-full"
                data-testid="button-sign-dossier"
              >
                {signMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Goedkeuren & Ondertekenen
              </Button>
            </CardContent>
          </Card>
        )}

        {signature && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Dit dossier is goedgekeurd en ondertekend</p>
                  <p className="text-sm text-green-600">
                    Ondertekend op {new Date(signature.signedAt).toLocaleString("nl-NL")}
                    {signature.rating && ` · ${signature.rating}/5 sterren`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
