import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Quotation } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Pencil, Trash2, Users } from "lucide-react";

type EmployeeUser = Omit<User, "password">;

interface SubscriptionInfo {
  status: string;
  trialEndsAt: string | null;
  employeeCount: number;
  maxEmployees: number;
  plan: string;
}

export default function MedewerkersPage() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeUser | null>(null);

  const [addForm, setAddForm] = useState({ fullName: "", email: "", phone: "" });
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", password: "" });

  const employeesQuery = useQuery<EmployeeUser[]>({
    queryKey: ["/api/employees"],
  });

  const subscriptionQuery = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription"],
  });

  const quotationsQuery = useQuery<Quotation[]>({
    queryKey: ["/api/quotations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { fullName: string; email: string; phone: string }) => {
      await apiRequest("POST", "/api/employees", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      setAddOpen(false);
      setAddForm({ fullName: "", email: "", phone: "" });
      toast({ title: "Medewerker aangemaakt", description: "De uitnodiging is verstuurd." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { fullName: string; phone: string; password?: string } }) => {
      const body: Record<string, string> = { fullName: data.fullName, phone: data.phone };
      if (data.password) body.password = data.password;
      await apiRequest("PATCH", `/api/employees/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setEditOpen(false);
      setSelectedEmployee(null);
      toast({ title: "Medewerker bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      setDeleteOpen(false);
      setSelectedEmployee(null);
      toast({ title: "Medewerker verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ quotationId, employeeId }: { quotationId: number; employeeId: string }) => {
      await apiRequest("POST", `/api/quotations/${quotationId}/assign`, { employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      toast({ title: "Medewerker toegewezen" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });

  const employees = employeesQuery.data ?? [];
  const subscription = subscriptionQuery.data;
  const quotations = quotationsQuery.data ?? [];

  const openEdit = (emp: EmployeeUser) => {
    setSelectedEmployee(emp);
    setEditForm({ fullName: emp.fullName ?? "", phone: emp.phone ?? "", password: "" });
    setEditOpen(true);
  };

  const openDelete = (emp: EmployeeUser) => {
    setSelectedEmployee(emp);
    setDeleteOpen(true);
  };

  if (employeesQuery.isLoading || subscriptionQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Medewerkers</h1>
          <Badge variant="secondary" data-testid="badge-employee-count">
            {subscription ? `${subscription.employeeCount}/${subscription.maxEmployees}` : `${employees.length}`} medewerkers
          </Badge>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          data-testid="button-add-employee"
          disabled={subscription ? subscription.employeeCount >= subscription.maxEmployees : false}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Medewerker toevoegen
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground py-4" data-testid="text-no-employees">
              Nog geen medewerkers toegevoegd.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefoon</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                    <TableCell className="font-medium" data-testid={`text-employee-name-${emp.id}`}>
                      {emp.fullName ?? emp.username}
                    </TableCell>
                    <TableCell data-testid={`text-employee-email-${emp.id}`}>
                      {emp.username}
                    </TableCell>
                    <TableCell data-testid={`text-employee-phone-${emp.id}`}>
                      {emp.phone ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(emp)}
                          data-testid={`button-edit-employee-${emp.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openDelete(emp)}
                          data-testid={`button-delete-employee-${emp.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Offerte toewijzingen</CardTitle>
        </CardHeader>
        <CardContent>
          {quotationsQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : quotations.length === 0 ? (
            <p className="text-muted-foreground py-4" data-testid="text-no-quotations">
              Geen offertes beschikbaar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offerte</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Toegewezen aan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id} data-testid={`row-quotation-${q.id}`}>
                    <TableCell className="font-medium" data-testid={`text-quotation-number-${q.id}`}>
                      {q.invoiceNumber ?? `#${q.id}`}
                    </TableCell>
                    <TableCell data-testid={`text-quotation-client-${q.id}`}>
                      {q.clientName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-quotation-status-${q.id}`}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={q.assignedEmployeeId ?? "unassigned"}
                        onValueChange={(value) => {
                          assignMutation.mutate({
                            quotationId: q.id,
                            employeeId: value === "unassigned" ? "" : value,
                          });
                        }}
                        data-testid={`select-assign-employee-${q.id}`}
                      >
                        <SelectTrigger className="w-48" data-testid={`trigger-assign-employee-${q.id}`}>
                          <SelectValue placeholder="Selecteer medewerker" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Niet toegewezen</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id} data-testid={`option-employee-${emp.id}-${q.id}`}>
                              {emp.fullName ?? emp.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medewerker toevoegen</DialogTitle>
            <DialogDescription>
              Vul de gegevens in om een nieuwe medewerker uit te nodigen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-fullName">Volledige naam *</Label>
              <Input
                id="add-fullName"
                value={addForm.fullName}
                onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Jan Jansen"
                data-testid="input-add-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">E-mailadres *</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jan@bedrijf.nl"
                data-testid="input-add-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Telefoonnummer</Label>
              <Input
                id="add-phone"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="06-12345678"
                data-testid="input-add-phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-add">
              Annuleren
            </Button>
            <Button
              onClick={() => createMutation.mutate(addForm)}
              disabled={!addForm.fullName || !addForm.email || createMutation.isPending}
              data-testid="button-submit-add"
            >
              {createMutation.isPending ? "Bezig..." : "Toevoegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medewerker bewerken</DialogTitle>
            <DialogDescription>
              Pas de gegevens van de medewerker aan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Volledige naam</Label>
              <Input
                id="edit-fullName"
                value={editForm.fullName}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                data-testid="input-edit-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefoonnummer</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                data-testid="input-edit-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nieuw wachtwoord (optioneel)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Laat leeg om niet te wijzigen"
                data-testid="input-edit-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} data-testid="button-cancel-edit">
              Annuleren
            </Button>
            <Button
              onClick={() => {
                if (!selectedEmployee) return;
                updateMutation.mutate({
                  id: selectedEmployee.id,
                  data: editForm,
                });
              }}
              disabled={!editForm.fullName || updateMutation.isPending}
              data-testid="button-submit-edit"
            >
              {updateMutation.isPending ? "Bezig..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Medewerker verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je {selectedEmployee?.fullName ?? selectedEmployee?.username} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedEmployee) deleteMutation.mutate(selectedEmployee.id);
              }}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Bezig..." : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
