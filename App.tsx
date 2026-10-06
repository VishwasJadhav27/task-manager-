import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  CircleCheck,
  Flower2,
  Lightbulb,
  ListTodo,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  X,
} from "lucide-react";

type Category = "work" | "personal" | "ideas";
type View = "today" | "upcoming" | "all" | "completed" | Category;
type TimerMode = "focus" | "break";

type Task = {
  id: string;
  title: string;
  notes: string;
  category: Category;
  dueDate: string;
  completed: boolean;
  createdAt: number;
};

type TaskForm = Pick<Task, "title" | "notes" | "category" | "dueDate">;

const STORAGE_KEY = "daywell-tasks-v1";
const TIMER_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  break: 5 * 60,
};

const categories: { id: Category; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "personal", label: "Personal" },
  { id: "ideas", label: "Ideas" },
];

const mainViews: { id: View; label: string; icon: ReactNode }[] = [
  { id: "today", label: "Today", icon: <Sun size={19} strokeWidth={1.9} /> },
  { id: "upcoming", label: "Upcoming", icon: <CalendarDays size={19} strokeWidth={1.9} /> },
  { id: "all", label: "All tasks", icon: <ListTodo size={19} strokeWidth={1.9} /> },
  { id: "completed", label: "Completed", icon: <CircleCheck size={19} strokeWidth={1.9} /> },
];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function sampleTasks(): Task[] {
  const createdAt = Date.now();
  return [
    {
      id: "sample-plan",
      title: "Plan out the week ahead",
      notes: "",
      category: "work",
      dueDate: dateFromToday(0),
      completed: true,
      createdAt: createdAt - 4,
    },
    {
      id: "sample-draft",
      title: "Finish the first draft",
      notes: "",
      category: "work",
      dueDate: dateFromToday(0),
      completed: false,
      createdAt: createdAt - 3,
    },
    {
      id: "sample-walk",
      title: "Take a walk outside",
      notes: "",
      category: "personal",
      dueDate: dateFromToday(0),
      completed: false,
      createdAt: createdAt - 2,
    },
    {
      id: "sample-ideas",
      title: "Collect ideas for the next project",
      notes: "",
      category: "ideas",
      dueDate: dateFromToday(1),
      completed: false,
      createdAt: createdAt - 1,
    },
  ];
}

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.notes === "string" &&
    (task.category === "work" || task.category === "personal" || task.category === "ideas") &&
    typeof task.dueDate === "string" &&
    typeof task.completed === "boolean" &&
    typeof task.createdAt === "number"
  );
}

function loadTasks(): Task[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter(isTask);
    }
  } catch {
    // The app still works when storage is unavailable or contains invalid data.
  }
  return sampleTasks();
}

function formatDueDate(dueDate: string, today: string, completed: boolean): string {
  if (dueDate === today) return "Today";
  if (dueDate === dateFromToday(1)) return "Tomorrow";
  if (dueDate < today && !completed) return "Overdue";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${dueDate}T12:00:00`),
  );
}

function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function viewTitle(view: View): string {
  switch (view) {
    case "today":
      return "Today's tasks";
    case "upcoming":
      return "Coming up";
    case "all":
      return "All tasks";
    case "completed":
      return "Completed";
    default:
      return `${view.charAt(0).toUpperCase()}${view.slice(1)} tasks`;
  }
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [view, setView] = useState<View>("today");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>({
    title: "",
    notes: "",
    category: "work",
    dueDate: dateFromToday(0),
  });
  const [recentlyDeleted, setRecentlyDeleted] = useState<Task | null>(null);
  const [timerMode, setTimerMode] = useState<TimerMode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const timerEndRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const today = dateFromToday(0);
  const todayTasks = tasks.filter(
    (task) => task.dueDate === today || (task.dueDate < today && !task.completed),
  );
  const completedToday = todayTasks.filter((task) => task.completed).length;
  const progress = todayTasks.length ? (completedToday / todayTasks.length) * 100 : 0;

  const filteredTasks = tasks
    .filter((task) => {
      if (view === "today") return task.dueDate === today || (task.dueDate < today && !task.completed);
      if (view === "upcoming") return task.dueDate > today && !task.completed;
      if (view === "all") return true;
      if (view === "completed") return task.completed;
      return task.category === view;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      return a.dueDate.localeCompare(b.dueDate) || a.createdAt - b.createdAt;
    });

  const viewCounts: Record<View, number> = {
    today: todayTasks.length,
    upcoming: tasks.filter((task) => task.dueDate > today && !task.completed).length,
    all: tasks.length,
    completed: tasks.filter((task) => task.completed).length,
    work: tasks.filter((task) => task.category === "work").length,
    personal: tasks.filter((task) => task.category === "personal").length,
    ideas: tasks.filter((task) => task.category === "ideas").length,
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Saving is optional in browsers that block local storage.
    }
  }, [tasks]);

  useEffect(() => {
    if (!recentlyDeleted) return;
    const timeout = window.setTimeout(() => setRecentlyDeleted(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [recentlyDeleted]);

  useEffect(() => {
    if (!isFormOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFormOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isFormOpen]);

  // An end timestamp keeps the timer accurate even when the browser throttles tabs.
  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      if (timerEndRef.current === null) return;
      const remaining = Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        timerEndRef.current = null;
        setIsRunning(false);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  function openForm(task?: Task) {
    setEditingId(task?.id ?? null);
    setForm({
      title: task?.title ?? "",
      notes: task?.notes ?? "",
      category: task?.category ?? (view === "work" || view === "personal" || view === "ideas" ? view : "work"),
      dueDate: task?.dueDate ?? (view === "upcoming" ? dateFromToday(1) : today),
    });
    setIsFormOpen(true);
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title || !form.dueDate) return;

    if (editingId) {
      setTasks((previous) =>
        previous.map((task) => (task.id === editingId ? { ...task, ...form, title, notes: form.notes.trim() } : task)),
      );
    } else {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
      setTasks((previous) => [
        ...previous,
        { ...form, id, title, notes: form.notes.trim(), completed: false, createdAt: Date.now() },
      ]);
      // New tasks should be visible immediately, even if they are due later.
      if (
        view === "completed" ||
        (view === "today" && form.dueDate > today) ||
        (view === "upcoming" && form.dueDate <= today) ||
        ((view === "work" || view === "personal" || view === "ideas") && view !== form.category)
      ) {
        setView("all");
      }
    }
    setIsFormOpen(false);
  }

  function toggleTask(id: string) {
    setTasks((previous) =>
      previous.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
  }

  function deleteTask(task: Task) {
    setTasks((previous) => previous.filter((item) => item.id !== task.id));
    setRecentlyDeleted(task);
  }

  function undoDelete() {
    if (!recentlyDeleted) return;
    setTasks((previous) => [...previous, recentlyDeleted]);
    setRecentlyDeleted(null);
  }

  function selectTimerMode(mode: TimerMode) {
    timerEndRef.current = null;
    setIsRunning(false);
    setTimerMode(mode);
    setSecondsLeft(TIMER_DURATIONS[mode]);
  }

  function toggleTimer() {
    if (isRunning) {
      if (timerEndRef.current !== null) {
        setSecondsLeft(Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000)));
      }
      timerEndRef.current = null;
      setIsRunning(false);
    } else {
      const remaining = secondsLeft === 0 ? TIMER_DURATIONS[timerMode] : secondsLeft;
      setSecondsLeft(remaining);
      timerEndRef.current = Date.now() + remaining * 1000;
      setIsRunning(true);
    }
  }

  function resetTimer() {
    timerEndRef.current = null;
    setIsRunning(false);
    setSecondsLeft(TIMER_DURATIONS[timerMode]);
  }

  function keepFocusInModal(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>("button, input, select, textarea");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const ringCircumference = 2 * Math.PI * 91;
  const ringOffset = ringCircumference * (1 - secondsLeft / TIMER_DURATIONS[timerMode]);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="brand" aria-label="Daywell">
            <Flower2 className="brand-icon" size={29} strokeWidth={2.2} aria-hidden="true" />
            <span>daywell<span className="brand-dot">.</span></span>
          </div>
          <button className="mobile-add-button" onClick={() => openForm()} aria-label="Add a task">
            <Plus size={21} strokeWidth={2.2} />
          </button>
        </div>

        <nav className="sidebar-navigation" aria-label="Task views">
          <div className="nav-group">
            <p className="nav-heading">WORKSPACE</p>
            {mainViews.map((item) => (
              <button
                key={item.id}
                className={`nav-link ${view === item.id ? "active" : ""}`}
                onClick={() => setView(item.id)}
                aria-current={view === item.id ? "page" : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.label}</span>
                <span className="nav-count">{viewCounts[item.id]}</span>
              </button>
            ))}
          </div>

          <div className="nav-group lists-group">
            <p className="nav-heading">YOUR LISTS</p>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`nav-link ${view === category.id ? "active" : ""}`}
                onClick={() => setView(category.id)}
                aria-current={view === category.id ? "page" : undefined}
              >
                <span className={`category-dot ${category.id}`} aria-hidden="true" />
                <span className="nav-text">{category.label}</span>
                <span className="nav-count">{viewCounts[category.id]}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <span className="footer-sparkle" aria-hidden="true">*</span>
          <span>A little progress<br />goes a long way.</span>
        </div>
      </aside>

      <main className="main-content">
        <div className="main-inner">
          <header className="topbar">
            <span className="date-label"><span className="date-dot" />{dateLabel}</span>
            <button className="primary-button desktop-add-button" onClick={() => openForm()}>
              <Plus size={19} strokeWidth={2.2} /> New task
            </button>
          </header>

          <section className="intro" aria-labelledby="page-title">
            <span className="eyebrow">YOUR DAY, YOUR PACE</span>
            <h1 id="page-title">Make today feel <em>lighter.</em></h1>
            <p>Keep what matters in sight. Let the rest wait.</p>
          </section>

          <div className="workspace-grid">
            <section className="tasks-column" aria-labelledby="task-section-title">
              <div className="progress-block">
                <div className="progress-copy">
                  <span>Today's progress</span>
                  <span className="progress-count">{completedToday} of {todayTasks.length} done</span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Today's tasks completed"
                  aria-valuenow={completedToday}
                  aria-valuemin={0}
                  aria-valuemax={todayTasks.length || 1}
                >
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="list-heading">
                <div>
                  <span className="section-label">THE PLAN</span>
                  <h2 id="task-section-title">{viewTitle(view)}</h2>
                </div>
                <span className="task-total">{filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}</span>
              </div>

              <div className="task-list">
                {filteredTasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Lightbulb size={26} strokeWidth={1.7} /></div>
                    <h3>{view === "completed" ? "Nothing checked off yet." : "A little breathing room."}</h3>
                    <p>{view === "completed" ? "Finish a task and it will show up here." : "No tasks here right now. Add one when you're ready."}</p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div className={`task-row ${task.completed ? "is-complete" : ""}`} key={task.id}>
                      <label className="task-checkbox-label">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTask(task.id)}
                          aria-label={`${task.completed ? "Mark as incomplete" : "Complete"}: ${task.title}`}
                        />
                        <span className="task-checkbox-visual"><Check size={15} strokeWidth={3} /></span>
                      </label>
                      <div className="task-details">
                        <span className="task-title">{task.title}</span>
                        {task.notes && <p className="task-notes">{task.notes}</p>}
                        <div className="task-meta">
                          <span className={`task-category ${task.category}`}><span className="meta-dot" />{categories.find((category) => category.id === task.category)?.label}</span>
                          <span className="meta-divider" aria-hidden="true" />
                          <span className={task.dueDate < today && !task.completed ? "due-overdue" : ""}>{formatDueDate(task.dueDate, today, task.completed)}</span>
                        </div>
                      </div>
                      <div className="task-actions">
                        <button className="icon-button" onClick={() => openForm(task)} aria-label={`Edit ${task.title}`} title="Edit task">
                          <Pencil size={17} strokeWidth={1.9} />
                        </button>
                        <button className="icon-button delete-button" onClick={() => deleteTask(task)} aria-label={`Delete ${task.title}`} title="Delete task">
                          <Trash2 size={17} strokeWidth={1.9} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button className="add-task-row" onClick={() => openForm()}>
                  <span className="add-row-icon"><Plus size={18} strokeWidth={2} /></span>
                  Add a task
                </button>
              </div>
            </section>

            <aside className="focus-column" aria-label="Focus timer">
              <span className="section-label focus-label"><span className="focus-label-dot" /> YOUR FOCUS SPACE</span>
              <div className="timer-panel">
                <div className="timer-heading">
                  <h2>Find your focus.</h2>
                  <p>One thing at a time.</p>
                </div>

                <div className="timer-modes" role="group" aria-label="Timer mode">
                  <button className={timerMode === "focus" ? "selected" : ""} onClick={() => selectTimerMode("focus")} aria-pressed={timerMode === "focus"}>Focus</button>
                  <button className={timerMode === "break" ? "selected" : ""} onClick={() => selectTimerMode("break")} aria-pressed={timerMode === "break"}>Short break</button>
                </div>

                <div className="timer-face" role="timer" aria-label={`${formatTime(secondsLeft)} remaining`}>
                  <svg className="timer-ring" viewBox="0 0 220 220" aria-hidden="true">
                    <circle className="timer-ring-track" cx="110" cy="110" r="91" />
                    <circle
                      className="timer-ring-progress"
                      cx="110"
                      cy="110"
                      r="91"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <div className="timer-display">
                    <span className="timer-time">{formatTime(secondsLeft)}</span>
                    <span className="timer-subtitle">{secondsLeft === 0 ? "SESSION COMPLETE" : "MINUTES LEFT"}</span>
                  </div>
                </div>

                <div className="timer-controls">
                  <button className="timer-main-button" onClick={toggleTimer}>
                    {isRunning ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
                    {isRunning ? "Pause timer" : secondsLeft === 0 ? "Start again" : timerMode === "focus" ? "Start focus" : "Start break"}
                  </button>
                  <button className="timer-reset-button" onClick={resetTimer} aria-label="Reset timer" title="Reset timer">
                    <RotateCcw size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
              <p className="focus-note">Small steps are still steps. Keep going.</p>
            </aside>
          </div>
        </div>
      </main>

      {isFormOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false); }}>
          <div className="task-modal" ref={modalRef} onKeyDown={keepFocusInModal} role="dialog" aria-modal="true" aria-labelledby="task-dialog-title">
            <div className="modal-topline">
              <div>
                <span className="section-label">A LITTLE STEP FORWARD</span>
                <h2 id="task-dialog-title">{editingId ? "Edit task" : "New task"}</h2>
              </div>
              <button className="modal-close" onClick={() => setIsFormOpen(false)} aria-label="Close dialog"><X size={21} /></button>
            </div>

            <form onSubmit={saveTask}>
              <label className="field-label" htmlFor="task-title">What needs doing?</label>
              <input
                id="task-title"
                className="form-input"
                type="text"
                placeholder="e.g. Send the project proposal"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                maxLength={100}
                required
                autoFocus
              />

              <div className="form-two-columns">
                <div>
                  <label className="field-label" htmlFor="task-date">Due date</label>
                  <input
                    id="task-date"
                    className="form-input"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="task-category">List</label>
                  <select
                    id="task-category"
                    className="form-input form-select"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value as Category })}
                  >
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                  </select>
                </div>
              </div>

              <label className="field-label" htmlFor="task-notes">Notes <span>(optional)</span></label>
              <textarea
                id="task-notes"
                className="form-input form-textarea"
                placeholder="Add a little context..."
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                maxLength={240}
                rows={3}
              />

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button"><Plus size={18} />{editingId ? "Save changes" : "Add task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {recentlyDeleted && (
        <div className="undo-toast" role="status">
          <span>Task deleted</span>
          <button onClick={undoDelete}>Undo</button>
          <button className="toast-close" onClick={() => setRecentlyDeleted(null)} aria-label="Dismiss notification"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}