"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAppStore } from "@/lib/store";
import { listUsersApi, createUserApi, resetPasswordApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserItem = { id: string; username: string; fullName: string; role: "ADMIN" | "MANAGER" | "OWNER"; forceReset: boolean; createdAt: string };

export default function AdminUsersPage() {
  const { user } = useAppStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "OWNER">("OWNER");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "MANAGER" | "OWNER">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function refreshUsers() {
    const data = await listUsersApi();
    setUsers(data);
  }

  useEffect(() => {
    if (user?.role === "ADMIN") refreshUsers().catch(() => undefined);
  }, [user]);

  const filtered = users.filter((u) => {
    const text = `${u.username} ${u.fullName}`.toLowerCase();
    const okSearch = text.includes(search.toLowerCase());
    const okRole = roleFilter === "ALL" || u.role === roleFilter;
    return okSearch && okRole;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (user?.role !== "ADMIN") {
    return <DashboardLayout title="Administration" description="Acces reserve"><div className="text-sm text-muted-foreground">Cette page est reservee a l'administrateur.</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Utilisateurs" description="Gestion des comptes et mots de passe">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input placeholder="Identifiant" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "MANAGER" | "OWNER")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="MANAGER">MANAGER</SelectItem>
              <SelectItem value="OWNER">OWNER</SelectItem>
            </SelectContent>
          </Select>
          <Input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={async () => {
            try {
              await createUserApi({ username, fullName, role, password, forceReset: true });
              setUsername(""); setFullName(""); setPassword("");
              await refreshUsers();
              toast.success("Utilisateur cree.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erreur");
            }
          }}>Creer</Button>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Input placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as "ALL" | "ADMIN" | "MANAGER" | "OWNER"); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous roles</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="MANAGER">MANAGER</SelectItem>
                <SelectItem value="OWNER">OWNER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="divide-y divide-border">
            {paged.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{u.username} - {u.role}</p>
                  <p className="text-xs text-muted-foreground">{u.fullName}</p>
                </div>
                <Button variant="outline" size="sm" onClick={async () => {
                  const next = window.prompt(`Nouveau mot de passe pour ${u.username}`);
                  if (!next) return;
                  await resetPasswordApi(u.id, next);
                  toast.success("Mot de passe reinitialise.");
                  await refreshUsers();
                }}>
                  Reinitialiser mot de passe
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prec.</Button>
            <span className="text-xs text-muted-foreground">Page {page}/{totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suiv.</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
