import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Clock, MapPin, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { analyticsService, TimetableEntry } from "@/services/analyticsService";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const ENTRY_COLORS: Record<string, string> = {
  class: "bg-primary/20 border-primary text-primary",
  study: "bg-priority-low-bg border-priority-low text-priority-low",
  exam: "bg-priority-high-bg border-priority-high text-priority-high",
  event: "bg-priority-medium-bg border-priority-medium text-priority-medium",
  holiday: "bg-muted border-border text-muted-foreground",
};

const emptyForm = { title: "", entry_type: "class", subject: "", day_of_week: "1", start_time: "09:00", end_time: "10:00", location: "" };

const Timetable = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) return;
    analyticsService.getTimetableEntries().then(setEntries).catch(() => setEntries([]));
  }, [user]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      entry_type: entry.entryType,
      subject: entry.subject || "",
      day_of_week: String(entry.dayOfWeek),
      start_time: entry.startTime.slice(0, 5),
      end_time: entry.endTime.slice(0, 5),
      location: entry.location || "",
    });
    setDialogOpen(true);
  };

  const saveEntry = async () => {
    if (!user || !form.title) return;
    const payload = {
      title: form.title,
      entryType: form.entry_type,
      subject: form.subject || null,
      dayOfWeek: parseInt(form.day_of_week),
      startTime: form.start_time,
      endTime: form.end_time,
      location: form.location || null,
    };

    try {
      if (editingId) {
        const data = await analyticsService.updateTimetableEntry(editingId, payload);
        setEntries((prev) => prev.map((e) => (e.id === editingId ? data : e)));
        toast({ title: "Entry updated!" });
      } else {
        const data = await analyticsService.createTimetableEntry(payload);
        setEntries((prev) => [...prev, data]);
        toast({ title: "Entry added!" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const deleteEntry = async (id: string) => {
    await analyticsService.deleteTimetableEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const getEntriesForSlot = (day: number, hour: number) =>
    entries.filter((e) => e.dayOfWeek === day && parseInt(e.startTime.split(":")[0]) === hour);

  const todayIndex = new Date().getDay();

  return (
    <AppLayout>
      <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Timetable</h1>
            <p className="mt-1 text-muted-foreground">Manage your weekly schedule</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openAdd}><Plus className="w-4 h-4" /> Add Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} Timetable Entry</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Data Structures Lecture" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.entry_type} onValueChange={(v) => setForm({ ...form, entry_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["class", "study", "exam", "event", "holiday"].map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Computer Science" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Room 301" />
                </div>
                <Button onClick={saveEntry} className="w-full">{editingId ? "Update" : "Add"} Entry</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {entries.filter((e) => e.dayOfWeek === todayIndex).length > 0 && (
          <Card className="glass-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">📅 Today's Schedule ({DAYS[todayIndex]})</h3>
            <div className="flex flex-wrap gap-2">
              {entries
                .filter((e) => e.dayOfWeek === todayIndex)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((e) => (
                  <span key={e.id} className={`text-xs px-2.5 py-1.5 rounded-full border ${ENTRY_COLORS[e.entryType] || "bg-muted"}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {e.startTime.slice(0, 5)} — {e.title}
                  </span>
                ))}
            </div>
          </Card>
        )}

        <Card className="glass-card overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-3 text-sm font-medium text-muted-foreground">Time</div>
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
                <div key={dayIdx} className={`p-3 text-sm font-medium text-center border-l border-border ${dayIdx === todayIndex ? "text-primary bg-primary/5 font-bold" : "text-foreground"}`}>
                  {DAYS[dayIdx].slice(0, 3)}
                </div>
              ))}
            </div>
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border/50 min-h-[60px]">
                <div className="p-2 text-xs text-muted-foreground flex items-start">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const slotEntries = getEntriesForSlot(day, hour);
                  return (
                    <div key={day} className={`border-l border-border/50 p-1 relative ${day === todayIndex ? "bg-primary/[0.02]" : ""}`}>
                      {slotEntries.map((entry) => (
                        <div key={entry.id} className={`text-xs p-1.5 rounded border mb-1 group cursor-pointer ${ENTRY_COLORS[entry.entryType] || "bg-muted"}`} onClick={() => openEdit(entry)}>
                          <div className="font-medium truncate">{entry.title}</div>
                          {entry.location && (
                            <div className="flex items-center gap-1 mt-0.5 opacity-75">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{entry.location}</span>
                            </div>
                          )}
                          <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                            <button onClick={(e) => { e.stopPropagation(); openEdit(entry); }}><Pencil className="w-3 h-3 text-foreground/70" /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}><Trash2 className="w-3 h-3 text-destructive" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Timetable;
