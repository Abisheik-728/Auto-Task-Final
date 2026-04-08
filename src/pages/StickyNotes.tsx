import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pin, PinOff, Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { analyticsService, QuickNote } from "@/services/analyticsService";

const colors = [
  { name: "yellow", bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-300 dark:border-yellow-700", dot: "bg-yellow-400" },
  { name: "blue", bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", dot: "bg-blue-400" },
  { name: "green", bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-300 dark:border-green-700", dot: "bg-green-400" },
  { name: "pink", bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-300 dark:border-pink-700", dot: "bg-pink-400" },
  { name: "purple", bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700", dot: "bg-purple-400" },
];

const StickyNotes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    if (!user) return;
    try {
      const data = await analyticsService.getNotes();
      setNotes(data);
    } catch {
      setNotes([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [user]);

  const addNote = async () => {
    if (!user) return;
    const randomColor = colors[Math.floor(Math.random() * colors.length)].name;
    try {
      const data = await analyticsService.createNote({ content: "", color: randomColor });
      setNotes((prev) => [data, ...prev]);
    } catch {}
  };

  const updateNote = async (id: string, content: string) => {
    await analyticsService.updateNote(id, { content });
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
  };

  const changeColor = async (id: string, color: string) => {
    await analyticsService.updateNote(id, { color });
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await analyticsService.updateNote(id, { pinned: !pinned });
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !pinned } : n))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    );
  };

  const deleteNote = async (id: string) => {
    await analyticsService.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast({ title: "Note deleted" });
  };

  const getColorClasses = (color: string) => colors.find((c) => c.name === color) ?? colors[0];

  const pinnedNotes = notes.filter((n) => n.pinned);
  const unpinnedNotes = notes.filter((n) => !n.pinned);

  return (
    <AppLayout>
      <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Sticky Notes</h1>
            <p className="mt-1 text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""} — quick capture for ideas and thoughts</p>
          </div>
          <Button onClick={addNote} className="gap-2">
            <Plus className="w-4 h-4" /> New Note
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No notes yet. Click "New Note" to get started!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pinnedNotes.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5" /> Pinned
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedNotes.map((note) => <NoteCard key={note.id} note={note} getColorClasses={getColorClasses} onUpdate={updateNote} onTogglePin={togglePin} onDelete={deleteNote} onChangeColor={changeColor} />)}
                </div>
              </div>
            )}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground mb-3">Others</h2>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedNotes.map((note) => <NoteCard key={note.id} note={note} getColorClasses={getColorClasses} onUpdate={updateNote} onTogglePin={togglePin} onDelete={deleteNote} onChangeColor={changeColor} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </PageTransition>
    </AppLayout>
  );
};

const NoteCard = ({ note, getColorClasses, onUpdate, onTogglePin, onDelete, onChangeColor }: {
  note: QuickNote;
  getColorClasses: (c: string) => typeof colors[0];
  onUpdate: (id: string, content: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
}) => {
  const c = getColorClasses(note.color);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -3, rotate: -0.5, transition: { duration: 0.15 } }}
    >
    <Card className={`${c.bg} ${c.border} border-2 p-4 space-y-3 transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button onClick={() => onTogglePin(note.id, note.pinned)} className="text-muted-foreground hover:text-foreground transition-colors">
            {note.pinned ? <Pin className="w-4 h-4 text-primary" /> : <PinOff className="w-4 h-4" />}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Palette className="w-4 h-4" /></button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex gap-1.5">
                {colors.map((col) => (
                  <button key={col.name} onClick={() => onChangeColor(note.id, col.name)}
                    className={`w-6 h-6 rounded-full ${col.dot} border-2 transition-transform ${note.color === col.name ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(note.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <Textarea
        value={note.content}
        onChange={(e) => onUpdate(note.id, e.target.value)}
        placeholder="Type your note..."
        className="bg-transparent border-0 resize-none focus-visible:ring-0 min-h-[100px] p-0 text-foreground"
      />
      <p className="text-[10px] text-muted-foreground/60">{new Date(note.createdAt).toLocaleDateString()}</p>
    </Card>
    </motion.div>
  );
};

export default StickyNotes;
