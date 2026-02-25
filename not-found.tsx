import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full">
        <CardContent className="text-center py-12 space-y-4">
          <p className="text-6xl font-bold text-muted-foreground">404</p>
          <h1 className="text-xl font-semibold">Pagina niet gevonden</h1>
          <p className="text-sm text-muted-foreground">
            De pagina die u zoekt bestaat niet of is verplaatst.
          </p>
          <Button asChild data-testid="link-go-home">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
