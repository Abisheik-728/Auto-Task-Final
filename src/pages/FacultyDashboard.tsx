import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Users, BookOpen, ClipboardList, Plus, Trash2, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { assignmentService, Assignment } from "@/services/assignmentService";
import { resourceService, Resource } from "@/services/resourceService";

const SECTIONS = [
  { id: "csbs-a", label: "CSBS A", department: "Computer Science", students: 60 },
  { id: "csbs-b", label: "CSBS B", department: "Computer Science", students: 60 },
  { id: "csbs-c", label: "CSBS C", department: "Computer Science", students: 55 },
  { id: "it-a", label: "IT A", department: "Information Technology", students: 58 },
  { id: "it-b", label: "IT B", department: "Information Technology", students: 62 },
];

const SUBJECTS = ["Computer Science", "Mathematics", "Physics", "AI & ML", "Database Systems", "Data Structures", "Operating Systems"];

const FacultyDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Resource[]>([]);
  const [assignDialog, setAssignDialog] = useState(false);
  const [materialDialog, setMaterialDialog] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [assignForm, setAssignForm] = useState({
    title: "", description: "", subject: "Computer Science", section: "csbs-a", deadline: "",
  });
  const [materialForm, setMaterialForm] = useState({ title: "", subject: "Computer Science" });

  useEffect(() => {
    assignmentService.getAll().then(setAssignments).catch(() => []);
    resourceService.getAll().then(setMaterials).catch(() => []);
  }, []);

  const createAssignment = async () => {
    if (!assignForm.title) return;
    try {
      const data = await assignmentService.create({
        title: assignForm.title,
        description: assignForm.description || null,
        subject: assignForm.subject,
        section: assignForm.section,
        deadline: assignForm.deadline ? new Date(assignForm.deadline).toISOString() : null,
        status: "pending",
      });
      setAssignments((prev) => [data, ...prev]);
      const sec = SECTIONS.find((s) => s.id === assignForm.section);
      toast({
        title: "Assignment created!",
        description: `"${data.title}" assigned to ${sec?.label || assignForm.section} (${sec?.students || "?"} students)`,
      });
      setAssignForm({ title: "", description: "", subject: "Computer Science", section: "csbs-a", deadline: "" });
      setAssignDialog(false);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const uploadMaterial = async () => {
    if (!file || !materialForm.title) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", materialForm.title);
      formData.append("subject", materialForm.subject);
      const data = await resourceService.create(formData);
      setMaterials((prev) => [data, ...prev]);
      toast({ title: "Material uploaded!" });
      setMaterialForm({ title: "", subject: "Computer Science" });
      setFile(null);
      setMaterialDialog(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const stats = [
    { label: "Assignments", value: assignments.length, icon: ClipboardList, color: "text-primary" },
    { label: "Materials", value: materials.length, icon: BookOpen, color: "text-[hsl(var(--priority-low))]" },
    { label: "Sections", value: SECTIONS.length, icon: Users, color: "text-[hsl(var(--priority-medium))]" },
    { label: "Students", value: SECTIONS.reduce((s, sec) => s + sec.students, 0), icon: Users, color: "text-accent-foreground" },
  ];

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Faculty Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Welcome, {profile?.displayName || "Professor"} — manage assignments and study materials
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
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

          <Tabs defaultValue="assignments">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assignments" className="gap-2">
                <ClipboardList className="w-4 h-4" /> Assignments
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-2">
                <BookOpen className="w-4 h-4" /> Study Materials
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-display font-semibold text-foreground">Recent Assignments</h2>
                <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="w-4 h-4" /> Create Assignment</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={assignForm.title} onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })} placeholder="e.g. Data Structures Lab 5" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={assignForm.description} onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })} placeholder="Assignment details..." rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Select value={assignForm.subject} onValueChange={(v) => setAssignForm({ ...assignForm, subject: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Section</Label>
                          <Select value={assignForm.section} onValueChange={(v) => setAssignForm({ ...assignForm, section: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SECTIONS.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.label} ({s.students} students)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Deadline</Label>
                        <Input type="datetime-local" value={assignForm.deadline} onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })} />
                      </div>
                      <Button onClick={createAssignment} className="w-full" disabled={!assignForm.title}>
                        Create & Assign
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {assignments.length === 0 ? (
                <Card className="glass-card p-8 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No assignments yet. Create your first assignment!</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a) => {
                    const sec = SECTIONS.find((s) => s.id === a.section);
                    return (
                      <Card key={a.id} className="glass-card p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{a.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{a.subject}</Badge>
                            {sec && <Badge variant="outline" className="text-xs">{sec.label}</Badge>}
                            {a.deadline && (
                              <span className="text-xs text-muted-foreground">
                                Due: {new Date(a.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={a.status === "pending" ? "secondary" : "default"} className="capitalize text-xs shrink-0">
                          {a.status}
                        </Badge>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="materials" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-display font-semibold text-foreground">Uploaded Materials</h2>
                <Dialog open={materialDialog} onOpenChange={setMaterialDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Upload className="w-4 h-4" /> Upload Material</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Upload Study Material</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} placeholder="e.g. Chapter 5 Notes" />
                      </div>
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select value={materialForm.subject} onValueChange={(v) => setMaterialForm({ ...materialForm, subject: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>File</Label>
                        <Input type="file" accept=".pdf,.pptx,.ppt,.doc,.docx,.txt,.png,.jpg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                      </div>
                      <Button onClick={uploadMaterial} className="w-full" disabled={!file || !materialForm.title}>
                        Upload
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {materials.length === 0 ? (
                <Card className="glass-card p-8 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No materials uploaded yet.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {materials.map((m) => (
                    <Card key={m.id} className="glass-card p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{m.title}</p>
                        <Badge variant="secondary" className="text-xs mt-1">{m.subject}</Badge>
                      </div>
                      {m.fileUrl && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Section Overview */}
          <Card className="glass-card p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Section Overview
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SECTIONS.map((sec) => (
                <Card key={sec.id} className="p-4 border border-border">
                  <p className="font-semibold text-foreground">{sec.label}</p>
                  <p className="text-xs text-muted-foreground">{sec.department}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{sec.students} students</span>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default FacultyDashboard;
