import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell, Check, CheckCheck, FileText, Users, MessageCircle, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function getNotificationIcon(type: string) {
  switch (type) {
    case "new_lead": return <Users className="w-4 h-4 text-blue-500" />;
    case "quote_approved": return <FileText className="w-4 h-4 text-green-500" />;
    case "quote_rejected": return <FileText className="w-4 h-4 text-red-500" />;
    case "new_message": return <MessageCircle className="w-4 h-4 text-purple-500" />;
    case "dossier_signed": return <PenTool className="w-4 h-4 text-green-500" />;
    default: return <Bell className="w-4 h-4 text-gray-500" />;
  }
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const prevCountRef = useRef(0);

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: isOpen,
  });

  const unreadCount = countData?.count || 0;

  useEffect(() => {
    if (prevCountRef.current > 0 && unreadCount > prevCountRef.current) {
      toast({
        title: "Nieuwe melding",
        description: `U heeft ${unreadCount - prevCountRef.current} nieuwe melding(en)`,
      });
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="badge-unread-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden" data-testid="dropdown-notifications">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="font-semibold text-sm">Meldingen</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => markAllReadMutation.mutate()}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-3 h-3 mr-1" /> Alles gelezen
              </Button>
            )}
          </div>
          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Geen meldingen
              </div>
            ) : (
              notifications.slice(0, 20).map((notif: any) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notif.isRead ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markReadMutation.mutate(notif.id);
                  }}
                  data-testid={`notification-${notif.id}`}
                >
                  <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.isRead ? "font-medium" : ""}`}>{notif.title}</p>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(notif.createdAt).toLocaleString("nl-NL")}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
