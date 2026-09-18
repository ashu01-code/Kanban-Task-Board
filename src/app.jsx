import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './App.css';

const loadTasks = () => {
  try {
    const stored = localStorage.getItem('kanban-tasks');
    if (stored) return JSON.parse(stored);
    return [];
  } catch (error) {
    console.warn('Failed to load tasks:', error);
    return [];
  }
};

const saveTasks = (tasks) => {
  try {
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
  } catch (error) {
    console.warn('Failed to save tasks:', error);
  }
};

const AddTask = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onAddTask(title, priority);
      setTitle('');
      setPriority('medium');
    }
  };

  return (
    <form className="add-task-wrapper" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter a new task..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        aria-label="Task title"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        aria-label="Priority level"
      >
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <button type="submit" disabled={!title.trim()}>
        Add Task
      </button>
    </form>
  );
};

const SearchBar = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="search-wrapper">
      <input
        type="text"
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search tasks"
      />
    </div>
  );
};

const TaskCard = ({ task, onDeleteTask, onMoveTask, onEditTask }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'None';
    }
  };

  const handleSaveEdit = () => {
    if (editValue.trim()) {
      onEditTask(task.id, editValue);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditValue(task.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveEdit();
    else if (e.key === 'Escape') handleCancelEdit();
  };

  const getMoveOptions = (currentStatus) => {
    const options = [];
    if (currentStatus === 'todo') {
      options.push({ label: '→ In Progress', value: 'inProgress' });
    } else if (currentStatus === 'inProgress') {
      options.push({ label: '← To Do', value: 'todo' });
      options.push({ label: '→ Done', value: 'done' });
    } else if (currentStatus === 'done') {
      options.push({ label: '← In Progress', value: 'inProgress' });
    }
    return options;
  };

  return (
    <div className={`task-card ${getPriorityClass(task.priority)}`}>
      <div className="task-card-content">
        {isEditing ? (
          <input
            type="text"
            className="task-title-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveEdit}
            autoFocus
            maxLength={200}
          />
        ) : (
          <span className="task-title">{task.title}</span>
        )}

        <div className="task-meta">
          <span className={`priority-badge ${task.priority}`}>
            {getPriorityLabel(task.priority)}
          </span>

          <div className="task-actions">
            {!isEditing ? (
              <>
                <button className="edit-btn" onClick={() => setIsEditing(true)} aria-label="Edit task">✎</button>
                <div className="task-move-buttons">
                  {getMoveOptions(task.status).map(option => (
                    <button
                      key={option.value}
                      className="move-btn"
                      onClick={() => onMoveTask(task.id, option.value)}
                      aria-label={`Move to ${option.label}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button className="delete-btn" onClick={() => onDeleteTask(task.id)} aria-label="Delete task">✕</button>
              </>
            ) : (
              <>
                <button className="save-btn" onClick={handleSaveEdit} aria-label="Save edit">✓</button>
                <button className="cancel-btn" onClick={handleCancelEdit} aria-label="Cancel edit">✕</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SortableTaskCard = ({ task, onDeleteTask, onMoveTask, onEditTask }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onDeleteTask={onDeleteTask}
        onMoveTask={onMoveTask}
        onEditTask={onEditTask}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
};
const Column = ({ title, status, tasks, onDeleteTask, onMoveTask, onEditTask }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(task => task.id === active.id);
      const movedTask = tasks[oldIndex];
      if (movedTask && movedTask.status !== status) {
        onMoveTask(movedTask.id, status);
      }
    }
  };

  return (
    <div className="column">
      <div className="column-header">
        <h2>{title}</h2>
        <span className="task-count">{tasks.length} tasks</span>
      </div>
      <div className="column-content">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            {tasks.length === 0 ? (
              <div className="no-tasks">No tasks</div>
            ) : (
              tasks.map(task => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onDeleteTask={onDeleteTask}
                  onMoveTask={onMoveTask}
                  onEditTask={onEditTask}
                />
              ))
            )}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

const Board = ({ tasks, onDeleteTask, onMoveTask, onEditTask }) => {
  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo' },
    { id: 'inProgress', title: 'In Progress', status: 'inProgress' },
    { id: 'done', title: 'Done', status: 'done' }
  ];

  return (
    <div className="board-container">
      {columns.map(column => (
        <Column
          key={column.id}
          title={column.title}
          status={column.status}
          tasks={tasks.filter(task => task.status === column.status)}
          onDeleteTask={onDeleteTask}
          onMoveTask={onMoveTask}
          onEditTask={onEditTask}
        />
      ))}
    </div>
  );
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedTasks = loadTasks();
    if (storedTasks.length > 0) setTasks(storedTasks);
  }, []);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const addTask = (title, priority) => {
    if (!title.trim()) return;
    const newTask = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      priority: priority,
      status: 'todo'
    };
    setTasks(prev => [...prev, newTask]);
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const moveTask = (id, newStatus) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, status: newStatus } : task
    ));
  };

  const editTask = (id, newTitle) => {
    if (!newTitle.trim()) return;
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, title: newTitle.trim() } : task
    ));
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Kanban Task Board</h1>
        <p>Organize your work and stay productive</p>
      </header>

      <div className="controls-wrapper">
        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <AddTask onAddTask={addTask} />
      </div>

      <Board
        tasks={filteredTasks}
        onDeleteTask={deleteTask}
        onMoveTask={moveTask}
        onEditTask={editTask}
      />
    </div>
  );
}

export default App;