import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Download, Trash2, FolderOpen, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { resourceService, Resource } from "@/services/resourceService";

const SUBJECTS = ["Computer Science", "Mathematics", "Physics", "AI & ML", "Database Systems", "General"];

const StudyMaterials = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "General" });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    resourceService.getAll().then(setMaterials).catch(() => setMaterials([]));
  }, [user]);

  const handleUpload = async () => {
    if (!user || !file || !form.title) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", form.title);
      formData.append("subject", form.subject);
      const data = await resourceService.create(formData);
      setMaterials((prev) => [data, ...prev]);
      toast({ title: "File uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setDialogOpen(false);
    setFile(null);
    setForm({ title: "", subject: "General" });
    setUploading(false);
  };

  const deleteMaterial = async (id: string) => {
    await resourceService.delete(id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const filtered = materials.filter((m) => {
    if (filterSubject !== "all" && m.subject !== filterSubject) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Study Materials</h1>
            <p className="mt-1 text-muted-foreground">Organize and access your academic resources</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Upload className="w-4 h-4" /> Upload File</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Study Material</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter 5 Notes" />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>File</Label>
                  <Input type="file" accept=".pdf,.pptx,.ppt,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <Button onClick={handleUpload} disabled={uploading || !file || !form.title} className="w-full">
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search materials..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card className="glass-card p-8 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No materials found. Upload your first file!</p>
            </Card>
          )}
          {filtered.map((m) => (
            <Card key={m.id} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{m.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{m.subject}</Badge>
                  {m.fileSize && <span className="text-xs text-muted-foreground">{formatSize(m.fileSize)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.fileUrl && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMaterial(m.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default StudyMaterials;
