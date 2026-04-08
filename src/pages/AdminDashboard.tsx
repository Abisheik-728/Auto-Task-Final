import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Activity, Megaphone, Shield, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { analyticsService } from "@/services/analyticsService";

interface UserRow {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

const AdminDashboard = () => {
  const { roles } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [stats, setStats] = useState({ users: 0, tasks: 0, sessions: 0, materials: 0 });

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [adminStats, adminUsers] = await Promise.all([
        analyticsService.getAdminStats(),
        analyticsService.getAdminUsers(),
      ]);
      setStats(adminStats);
      setUsers(adminUsers as UserRow[]);
    } catch {}
  };

  const filteredUsers = users.filter((u) =>
    (u.displayName ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const broadcastAnnouncement = () => {
    if (!announcement.trim()) return;
    toast({ title: "Announcement broadcast!", description: announcement });
    setAnnouncement("");
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Platform management and analytics</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
            { label: "Total Tasks", value: stats.tasks, icon: Activity, color: "text-priority-low" },
            { label: "Study Sessions", value: stats.sessions, icon: Activity, color: "text-priority-medium" },
            { label: "Materials", value: stats.materials, icon: Activity, color: "text-accent-foreground" },
          ].map((s) => (
            <Card key={s.label} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">Broadcast Announcement</h2>
          </div>
          <Textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Write an announcement for all users..."
            rows={3}
          />
          <Button onClick={broadcastAnnouncement} className="gap-2">
            <Megaphone className="w-4 h-4" /> Send Announcement
          </Button>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-foreground">User Management</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <Card key={u.userId} className="glass-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{u.displayName || "Unnamed User"}</p>
                  <p className="text-xs text-muted-foreground">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="secondary" className="capitalize">student</Badge>
              </Card>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-8">No users found</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
