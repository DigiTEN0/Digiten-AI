import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Zap, ArrowRight, Shield, FileText, BarChart3 } from "lucide-react";

export default function AuthPage() {
  const { login, register, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    fullName: "",
    organizationName: "",
  });

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync(loginForm);
      setLocation("/dashboard");
    } catch (err: any) {
      toast({
        title: "Inloggen mislukt",
        description: err.message || "Controleer uw gegevens",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(registerForm);
      setLocation("/dashboard");
    } catch (err: any) {
      toast({
        title: "Registratie mislukt",
        description: err.message || "Probeer het opnieuw",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Digiten.ai</span>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Inloggen</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Registreren</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader className="pb-4">
                  <h2 className="text-xl font-semibold">Welkom terug</h2>
                  <p className="text-sm text-muted-foreground">
                    Log in om uw offertes te beheren
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mailadres</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="uw@email.nl"
                        value={loginForm.username}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, username: e.target.value })
                        }
                        data-testid="input-login-email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Wachtwoord</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Uw wachtwoord"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, password: e.target.value })
                        }
                        data-testid="input-login-password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={login.isPending}
                      data-testid="button-login"
                    >
                      {login.isPending ? "Bezig met inloggen..." : "Inloggen"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-4">
                      Demo account: demo@digiten.ai / demo123
                    </p>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader className="pb-4">
                  <h2 className="text-xl font-semibold">Account aanmaken</h2>
                  <p className="text-sm text-muted-foreground">
                    Start direct met professionele offertes
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Volledige naam</Label>
                      <Input
                        id="reg-name"
                        placeholder="Jan de Vries"
                        value={registerForm.fullName}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, fullName: e.target.value })
                        }
                        data-testid="input-register-name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-org">Bedrijfsnaam</Label>
                      <Input
                        id="reg-org"
                        placeholder="Mijn Bedrijf BV"
                        value={registerForm.organizationName}
                        onChange={(e) =>
                          setRegisterForm({
                            ...registerForm,
                            organizationName: e.target.value,
                          })
                        }
                        data-testid="input-register-org"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">E-mailadres</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="uw@email.nl"
                        value={registerForm.username}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, username: e.target.value })
                        }
                        data-testid="input-register-email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Wachtwoord</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Minimaal 6 tekens"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, password: e.target.value })
                        }
                        data-testid="input-register-password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={register.isPending}
                      data-testid="button-register"
                    >
                      {register.isPending ? "Account aanmaken..." : "Registreren"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <h1 className="text-3xl font-bold mb-4">
            Stuur offertes in minuten, niet uren
          </h1>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Het complete CPQ platform voor service bedrijven. Van lead tot
            betaling in \u00E9\u00E9n systeem.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary-foreground/10 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Professionele offertes</p>
                <p className="text-sm text-primary-foreground/70">
                  Maak en verstuur offertes in enkele klikken
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary-foreground/10 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Digitale handtekening</p>
                <p className="text-sm text-primary-foreground/70">
                  Laat klanten online ondertekenen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary-foreground/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Real-time inzicht</p>
                <p className="text-sm text-primary-foreground/70">
                  Volg uw pipeline en omzet live
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
