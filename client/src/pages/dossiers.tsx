import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, CheckCircle, PenTool, Clock } from "lucide-react";

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
    case "completed": return "Klaar";
    case "signed": return "Ondertekend";
    default: return status;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "open": return <Clock className="w-4 h-4" />;
    case "completed": return <PenTool className="w-4 h-4" />;
    case "signed": return <CheckCircle className="w-4 h-4" />;
    default: return <FolderOpen className="w-4 h-4" />;
  }
}

export default function DossiersPage() {
  const { data: dossiers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dossiers"],
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dossiers-title">Dossiers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer klantdossiers met foto's, berichten en handtekeningen
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : dossiers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nog geen dossiers. Dossiers worden automatisch aangemaakt bij het versturen van een factuur.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dossiers.map((dossier: any) => (
            <Link key={dossier.id} href={`/dossiers/${dossier.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-dossier-${dossier.id}`}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getStatusIcon(dossier.status)}
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-dossier-title-${dossier.id}`}>{dossier.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{dossier.clientName}</span>
                        {dossier.clientEmail && (
                          <>
                            <span>&middot;</span>
                            <span>{dossier.clientEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {dossier.hasSignature && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <Badge className={getStatusColor(dossier.status)} data-testid={`badge-status-${dossier.id}`}>
                      {getStatusLabel(dossier.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(dossier.createdAt).toLocaleDateString("nl-NL")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
