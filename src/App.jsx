import React, { useState, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { 
  enable as enableAutostart, 
  disable as disableAutostart, 
  isEnabled as isAutostartEnabled 
} from '@tauri-apps/plugin-autostart';
import { 
  Pin, 
  PinOff, 
  Lock, 
  Unlock, 
  Sliders, 
  Minus, 
  CheckSquare, 
  Calendar, 
  FileText, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Check, 
  Copy, 
  Settings, 
  X,
  Sun,
  Pencil,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { initializePindoDatabase, persistPindoState } from './data/pindoDatabase';
import './App.css';

const DEFAULT_TODAY_TASKS = [];
const DEFAULT_TOMORROW_TASKS = [];
const DEFAULT_NOTES = '';
const DEFAULT_PREFERENCES = {
  activeTab: 'today',
  isAlwaysOnTop: true,
  isLocked: false,
  opacity: 85,
  isCollapsed: false,
  expandedHeight: 520
};

const COLLAPSED_HEIGHT = 42;
const MIN_EXPANDED_HEIGHT = 360;
const MIN_WINDOW_WIDTH = 280;

function loadTaskList(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadNotes() {
  try {
    return localStorage.getItem('pindo_notes') ?? DEFAULT_NOTES;
  } catch {
    return DEFAULT_NOTES;
  }
}

function loadPreferences() {
  try {
    const saved = localStorage.getItem('pindo_preferences:v1');
    if (!saved) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(saved);
    const validTabs = ['today', 'tomorrow', 'notes'];

    return {
      activeTab: validTabs.includes(parsed.activeTab) ? parsed.activeTab : DEFAULT_PREFERENCES.activeTab,
      isAlwaysOnTop: typeof parsed.isAlwaysOnTop === 'boolean' ? parsed.isAlwaysOnTop : DEFAULT_PREFERENCES.isAlwaysOnTop,
      isLocked: typeof parsed.isLocked === 'boolean' ? parsed.isLocked : DEFAULT_PREFERENCES.isLocked,
      opacity: Number.isFinite(parsed.opacity)
        ? Math.min(100, Math.max(30, parsed.opacity))
        : DEFAULT_PREFERENCES.opacity,
      isCollapsed: typeof parsed.isCollapsed === 'boolean' ? parsed.isCollapsed : DEFAULT_PREFERENCES.isCollapsed,
      expandedHeight: Number.isFinite(parsed.expandedHeight)
        ? Math.max(MIN_EXPANDED_HEIGHT, parsed.expandedHeight)
        : DEFAULT_PREFERENCES.expandedHeight
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function PinDoMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#20252b" />
      <path
        d="M30.4 50 41.4 43v16.3c0 1.7-2 2.7-3.3 1.5l-7.7-7.3a2.3 2.3 0 0 1 0-3.5Z"
        fill="#4c6fff"
      />
      <path
        fill="#f2efe7"
        fillRule="evenodd"
        d="M17 50.8V25.5c0-8.7 6.8-14.4 16.1-14.4h9.1c9.5 0 15.3 5.4 15.3 13.9 0 7.4-4.2 12.3-11.7 16.9l-14.2 8.8 8.7 8.2c1.5 1.4.6 3.8-1.4 3.8-1.2 0-2.4-.3-3.5-.9l-13.1-6.5C18.9 53.6 17 52.5 17 50.8Zm9.1-25.9c-4 0-6.6 2.2-6.6 5.7v9.2l10.6-6.6h12c3.7 0 5.9-1.9 5.9-4.8 0-2.2-1.5-3.5-4.4-3.5H26.1Z"
      />
    </svg>
  );
}

export default function App() {
  const [appWindow, setAppWindow] = useState(null);
  const [legacyState] = useState(() => ({
    todayTasks: loadTaskList('pindo_today_tasks', DEFAULT_TODAY_TASKS),
    tomorrowTasks: loadTaskList('pindo_tomorrow_tasks', DEFAULT_TOMORROW_TASKS),
    notes: loadNotes(),
    preferences: loadPreferences()
  }));
  const initialPreferences = legacyState.preferences;
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  // App States
  const [activeTab, setActiveTab] = useState(initialPreferences.activeTab); // 'today' | 'tomorrow' | 'notes'
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(initialPreferences.isAlwaysOnTop);
  const [isLocked, setIsLocked] = useState(initialPreferences.isLocked);
  const [opacity, setOpacity] = useState(initialPreferences.opacity);
  const [isCollapsed, setIsCollapsed] = useState(initialPreferences.isCollapsed);
  const [expandedHeight, setExpandedHeight] = useState(initialPreferences.expandedHeight);
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const hasAppliedCollapsedSize = useRef(false);

  // Data States (SQLite, with one-time LocalStorage migration)
  const [todayTasks, setTodayTasks] = useState(legacyState.todayTasks);
  const [tomorrowTasks, setTomorrowTasks] = useState(legacyState.tomorrowTasks);
  const [notes, setNotes] = useState(legacyState.notes);

  // Inputs
  const [todayInput, setTodayInput] = useState('');
  const [todayPriority, setTodayPriority] = useState('med');
  const [tomorrowInput, setTomorrowInput] = useState('');
  const [tomorrowPriority, setTomorrowPriority] = useState('med');

  // Initialize SQLite and migrate existing LocalStorage data once.
  useEffect(() => {
    let isActive = true;

    initializePindoDatabase(legacyState)
      .then((storedState) => {
        if (!isActive) return;

        const preferences = {
          ...DEFAULT_PREFERENCES,
          ...storedState.preferences
        };

        setTodayTasks(storedState.todayTasks);
        setTomorrowTasks(storedState.tomorrowTasks);
        setNotes(storedState.notes);
        setActiveTab(preferences.activeTab);
        setIsAlwaysOnTop(preferences.isAlwaysOnTop);
        setIsLocked(preferences.isLocked);
        setOpacity(preferences.opacity);
        setIsCollapsed(preferences.isCollapsed);
        setExpandedHeight(preferences.expandedHeight);
        setIsDatabaseReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize SQLite storage:', error);
      });

    return () => {
      isActive = false;
    };
  }, [legacyState]);

  // Initialize Window & Autostart
  useEffect(() => {
    try {
      const win = getCurrentWindow();
      setAppWindow(win);
      win.setAlwaysOnTop(initialPreferences.isAlwaysOnTop)
        .then(() => win.isAlwaysOnTop())
        .then((isOnTop) => setIsAlwaysOnTop(isOnTop))
        .catch((error) => {
          console.error('Failed to restore always-on-top setting:', error);
          setToast({ message: '窗口置顶初始化失败', type: 'error', id: Date.now() });
        });

      // Initialize autostart check
      isAutostartEnabled()
        .then((enabled) => setAutoStartEnabled(enabled))
        .catch((error) => console.error('Failed to read autostart setting:', error));
    } catch (e) {
      console.log('Running outside Tauri environment or window init issue');
    }
  }, [initialPreferences.isAlwaysOnTop]);

  // Persist state changes to SQLite after initial hydration.
  useEffect(() => {
    if (!isDatabaseReady) return;
    persistPindoState('todayTasks', todayTasks)
      .catch((error) => console.error('Failed to save today tasks:', error));
  }, [isDatabaseReady, todayTasks]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    persistPindoState('tomorrowTasks', tomorrowTasks)
      .catch((error) => console.error('Failed to save tomorrow tasks:', error));
  }, [isDatabaseReady, tomorrowTasks]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    persistPindoState('notes', notes)
      .catch((error) => console.error('Failed to save notes:', error));
  }, [isDatabaseReady, notes]);

  useEffect(() => {
    if (!isDatabaseReady) return;
    persistPindoState('preferences', {
      activeTab,
      isAlwaysOnTop,
      isLocked,
      opacity,
      isCollapsed,
      expandedHeight
    }).catch((error) => console.error('Failed to save preferences:', error));
  }, [activeTab, expandedHeight, isAlwaysOnTop, isCollapsed, isDatabaseReady, isLocked, opacity]);

  useEffect(() => {
    if (!appWindow || !isDatabaseReady) return;
    appWindow.setAlwaysOnTop(isAlwaysOnTop)
      .catch((error) => console.error('Failed to apply stored always-on-top setting:', error));
  }, [appWindow, isAlwaysOnTop, isDatabaseReady]);

  useEffect(() => {
    if (!appWindow || !isDatabaseReady || hasAppliedCollapsedSize.current) return;
    hasAppliedCollapsedSize.current = true;

    const applyStoredWindowSize = async () => {
      try {
        const physicalSize = await appWindow.innerSize();
        const scaleFactor = await appWindow.scaleFactor();
        const logicalSize = physicalSize.toLogical(scaleFactor);

        if (isCollapsed) {
          await appWindow.setMinSize(new LogicalSize(MIN_WINDOW_WIDTH, COLLAPSED_HEIGHT));
          await appWindow.setSize(new LogicalSize(logicalSize.width, COLLAPSED_HEIGHT));
        } else {
          await appWindow.setMinSize(new LogicalSize(MIN_WINDOW_WIDTH, MIN_EXPANDED_HEIGHT));
        }
      } catch (error) {
        console.error('Failed to restore collapsed window state:', error);
      }
    };

    applyStoredWindowSize();
  }, [appWindow, isCollapsed, isDatabaseReady]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Window Controls
  const toggleAlwaysOnTop = async () => {
    if (isLocked) return;
    const nextState = !isAlwaysOnTop;
    if (appWindow) {
      try {
        await appWindow.setAlwaysOnTop(nextState);
        setIsAlwaysOnTop(nextState);
      } catch (e) {
        console.error(e);
        setToast({ message: '窗口置顶设置失败', type: 'error', id: Date.now() });
      }
    } else {
      setIsAlwaysOnTop(nextState);
    }
  };

  const toggleLockMode = () => {
    setIsLocked((current) => !current);
    setShowOpacitySlider(false);
    setShowSettingsModal(false);
    setEditingTask(null);
  };

  const handleHeaderMouseDown = async (event) => {
    if (event.button !== 0 || event.detail > 1 || event.target.closest('.no-drag')) return;

    try {
      await appWindow?.startDragging();
    } catch (error) {
      console.error('Failed to start window dragging:', error);
      setToast({ message: '窗口拖动失败', type: 'error', id: Date.now() });
    }
  };

  const toggleCollapsed = async () => {
    if (!appWindow) return;

    try {
      const physicalSize = await appWindow.innerSize();
      const scaleFactor = await appWindow.scaleFactor();
      const logicalSize = physicalSize.toLogical(scaleFactor);

      if (isCollapsed) {
        await appWindow.setSize(new LogicalSize(logicalSize.width, expandedHeight));
        await appWindow.setMinSize(new LogicalSize(MIN_WINDOW_WIDTH, MIN_EXPANDED_HEIGHT));
        setIsCollapsed(false);
      } else {
        const currentExpandedHeight = Math.max(MIN_EXPANDED_HEIGHT, logicalSize.height);
        setExpandedHeight(currentExpandedHeight);
        setShowOpacitySlider(false);
        setShowSettingsModal(false);
        setEditingTask(null);
        await appWindow.setMinSize(new LogicalSize(MIN_WINDOW_WIDTH, COLLAPSED_HEIGHT));
        await appWindow.setSize(new LogicalSize(logicalSize.width, COLLAPSED_HEIGHT));
        setIsCollapsed(true);
      }
    } catch (error) {
      console.error('Failed to toggle collapsed window state:', error);
      setToast({ message: '窗口收起失败', type: 'error', id: Date.now() });
    }
  };

  const handleHeaderDoubleClick = (event) => {
    if (event.target.closest('.no-drag')) return;
    toggleCollapsed();
  };

  const handleMinimize = async () => {
    if (!appWindow) return;

    try {
      await appWindow.hide();
    } catch (error) {
      console.error('Failed to hide window:', error);
      setToast({ message: '隐藏到托盘失败', type: 'error', id: Date.now() });
    }
  };

  const toggleAutostart = async () => {
    try {
      if (autoStartEnabled) {
        await disableAutostart();
        setAutoStartEnabled(false);
        setToast({ message: '已关闭开机自启动', type: 'success', id: Date.now() });
      } else {
        await enableAutostart();
        setAutoStartEnabled(true);
        setToast({ message: '已开启开机自启动', type: 'success', id: Date.now() });
      }
    } catch (e) {
      console.error('Failed to toggle autostart:', e);
      setToast({ message: '开机自启动设置失败', type: 'error', id: Date.now() });
    }
  };

  const copyNotes = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setToast({ message: '便签已复制', type: 'success', id: Date.now() });
    } catch (error) {
      console.error('Failed to copy notes:', error);
      setToast({ message: '复制失败，请手动选择文本', type: 'error', id: Date.now() });
    }
  };

  const startTaskEdit = (list, task) => {
    if (isLocked) return;
    setEditingTask({ list, id: task.id, text: task.text });
  };

  const cancelTaskEdit = () => {
    setEditingTask(null);
  };

  const saveTaskEdit = () => {
    const nextText = editingTask?.text.trim();
    if (!editingTask || !nextText) return;

    const updateTask = (task) => task.id === editingTask.id
      ? { ...task, text: nextText }
      : task;

    if (editingTask.list === 'today') {
      setTodayTasks((current) => current.map(updateTask));
    } else {
      setTomorrowTasks((current) => current.map(updateTask));
    }

    setEditingTask(null);
    setToast({ message: '任务已更新', type: 'success', id: Date.now() });
  };

  const handleEditKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      saveTaskEdit();
    } else if (event.key === 'Escape') {
      cancelTaskEdit();
    }
  };

  // Task Operations: Today
  const addTodayTask = (e) => {
    e.preventDefault();
    if (!todayInput.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      text: todayInput.trim(),
      completed: false,
      priority: todayPriority
    };
    setTodayTasks((current) => [newTask, ...current]);
    setTodayInput('');
  };

  const toggleTodayTask = (id) => {
    if (isLocked) return;
    setTodayTasks((current) => current.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodayTask = (id) => {
    setTodayTasks((current) => current.filter(t => t.id !== id));
  };

  const moveTodayTaskToTomorrow = (task) => {
    deleteTodayTask(task.id);
    setTomorrowTasks((current) => [{ id: Date.now().toString(), text: task.text, priority: task.priority }, ...current]);
  };

  const clearCompletedToday = () => {
    setTodayTasks((current) => current.filter(t => !t.completed));
  };

  const moveAllTodayToTomorrow = () => {
    const activeTasks = todayTasks.filter(t => !t.completed);
    const converted = activeTasks.map(t => ({ id: Date.now().toString() + Math.random(), text: t.text, priority: t.priority }));
    setTomorrowTasks((current) => [...converted, ...current]);
    setTodayTasks((current) => current.filter(t => t.completed));
  };

  // Task Operations: Tomorrow
  const addTomorrowTask = (e) => {
    e.preventDefault();
    if (!tomorrowInput.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      text: tomorrowInput.trim(),
      priority: tomorrowPriority
    };
    setTomorrowTasks((current) => [newTask, ...current]);
    setTomorrowInput('');
  };

  const deleteTomorrowTask = (id) => {
    setTomorrowTasks((current) => current.filter(t => t.id !== id));
  };

  const moveTomorrowTaskToToday = (task) => {
    deleteTomorrowTask(task.id);
    setTodayTasks((current) => [{ id: Date.now().toString(), text: task.text, completed: false, priority: task.priority }, ...current]);
  };

  const importAllTomorrowToToday = () => {
    const converted = tomorrowTasks.map(t => ({ id: Date.now().toString() + Math.random(), text: t.text, completed: false, priority: t.priority }));
    setTodayTasks((current) => [...converted, ...current]);
    setTomorrowTasks([]);
  };

  // Calculations
  const completedCount = todayTasks.filter(t => t.completed).length;
  const incompleteCount = todayTasks.length - completedCount;

  return (
    <div 
      className={`pindo-window ${isLocked ? 'is-locked' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}
      style={{ background: `rgba(246, 246, 243, ${opacity / 100})` }}
    >
      {/* Custom Control Header (Drag Region) */}
      <header
        className="pindo-header"
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={handleHeaderDoubleClick}
      >
        <div className="brand-section">
          <div className="logo-badge">
            <PinDoMark className="logo-mark" />
          </div>
          <span className="brand-title">PinDo</span>
          {isAlwaysOnTop && <span className="pin-status-tag">置顶</span>}
          {isCollapsed && (
            <span className="collapsed-task-count">今日 {incompleteCount} 项</span>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="action-buttons no-drag">
          {!isLocked && (
            <>
              <button 
                className={`icon-btn ${isAlwaysOnTop ? 'active' : ''}`}
                onClick={toggleAlwaysOnTop}
                title={isAlwaysOnTop ? "取消置顶" : "置顶在所有窗口上方"}
              >
                {isAlwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />}
              </button>

              <button 
                className={`icon-btn ${showOpacitySlider ? 'active' : ''}`}
                onClick={() => setShowOpacitySlider((current) => !current)}
                title="调节窗口透明度"
              >
                <Sliders size={14} />
              </button>
            </>
          )}

          <button
            className="icon-btn collapse-toggle"
            onClick={toggleCollapsed}
            title={isCollapsed ? '展开窗口' : '收起窗口'}
            aria-label={isCollapsed ? '展开窗口' : '收起窗口'}
          >
            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>

          <button 
            className={`icon-btn ${isLocked ? 'active' : ''}`}
            onClick={toggleLockMode}
            title={isLocked ? "解锁窗口" : "锁定界面 (防止误点击)"}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>

          {!isLocked && (
            <button 
              className="icon-btn"
              onClick={() => setShowSettingsModal(true)}
              title="设置"
            >
              <Settings size={14} />
            </button>
          )}

          <button 
            className="icon-btn"
            onClick={handleMinimize}
            title="隐藏到系统托盘"
          >
            <Minus size={14} />
          </button>
        </div>
      </header>

      {/* Opacity Slider Popover */}
      {showOpacitySlider && (
        <div className="slider-popover no-drag">
          <div className="slider-label">
            <span>不透明度</span>
            <span>{opacity}%</span>
          </div>
          <input 
            type="range" 
            min="30" 
            max="100" 
            value={opacity} 
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="opacity-slider"
          />
        </div>
      )}

      {/* Navigation Tabs */}
      {!isLocked && (
        <nav className="tabs-nav no-drag">
          <button 
            className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
            aria-label="今日待办"
            title="今日待办"
          >
            <CheckSquare size={13} />
            <span className="tab-label">今日待办</span>
            <span className="tab-badge">{todayTasks.length}</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'tomorrow' ? 'active' : ''}`}
            onClick={() => setActiveTab('tomorrow')}
            aria-label="明日计划"
            title="明日计划"
          >
            <Calendar size={13} />
            <span className="tab-label">明日计划</span>
            <span className="tab-badge">{tomorrowTasks.length}</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
            aria-label="随手记"
            title="随手记"
          >
            <FileText size={13} />
            <span className="tab-label">随手记</span>
          </button>
        </nav>
      )}

      {/* Main Content Area */}
      <main className="content-area">
        {/* TAB 1: 今日待办 */}
        {activeTab === 'today' && (
          <>
            {/* Quick Add Form */}
            {!isLocked && (
              <form onSubmit={addTodayTask} className="task-input-bar no-drag">
                <input 
                  type="text" 
                  value={todayInput}
                  onChange={(e) => setTodayInput(e.target.value)}
                  placeholder="添加今天要完成的功能..."
                  className="task-input"
                />
                <button
                  type="button"
                  className="priority-toggle-btn no-drag"
                  onClick={() => {
                    const next = todayPriority === 'med' ? 'high' : todayPriority === 'high' ? 'low' : 'med';
                    setTodayPriority(next);
                  }}
                  title={`优先级：${todayPriority === 'high' ? '🔴 紧急' : todayPriority === 'med' ? '🟡 普通' : '🔵 次要'} (点击切换)`}
                >
                  <span className={`priority-dot ${todayPriority}`}></span>
                </button>
                <button type="submit" className="add-btn">
                  <Plus size={16} />
                </button>
              </form>
            )}

            {/* Tasks List */}
            {todayTasks.length === 0 ? (
              <div className="empty-state">
                <CheckSquare className="empty-icon" />
                <p>今天暂无任务</p>
              </div>
            ) : (
              <div className="task-list">
                {todayTasks.map((task) => (
                  <div key={task.id} className={`task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`}>
                    <button
                      type="button"
                      className="custom-checkbox no-drag" 
                      onClick={() => toggleTodayTask(task.id)}
                      disabled={isLocked}
                      aria-label={task.completed ? `将“${task.text}”标记为未完成` : `将“${task.text}”标记为已完成`}
                    >
                      {task.completed && <Check size={12} color="#fff" />}
                    </button>

                    {editingTask?.list === 'today' && editingTask.id === task.id ? (
                      <textarea
                        autoFocus
                        rows={1}
                        className="task-edit-textarea no-drag"
                        value={editingTask.text}
                        onChange={(e) => {
                          setEditingTask((current) => ({ ...current, text: e.target.value }));
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={handleEditKeyDown}
                        onBlur={saveTaskEdit}
                        aria-label="编辑任务内容"
                      />
                    ) : (
                      <>
                        <span
                          className="task-text editable"
                          onDoubleClick={() => startTaskEdit('today', task)}
                          title={isLocked ? undefined : '双击编辑文本'}
                        >
                          {task.text}
                        </span>

                        {!isLocked && (
                          <div className="item-actions no-drag">
                            <button 
                              className="sm-icon-btn" 
                              onClick={() => moveTodayTaskToTomorrow(task)}
                              title="推迟至明日"
                            >
                              <ArrowRight size={11} />
                            </button>
                            <button 
                              className="sm-icon-btn danger" 
                              onClick={() => deleteTodayTask(task.id)}
                              title="删除"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            {!isLocked && todayTasks.length > 0 && (
              <div className="bottom-bar no-drag">
                <button className="txt-btn" onClick={clearCompletedToday}>
                  一键清空已完成 ({completedCount})
                </button>
                <button className="txt-btn" onClick={moveAllTodayToTomorrow}>
                  未完成移至明日
                </button>
              </div>
            )}
          </>
        )}

        {/* TAB 2: 明日计划 */}
        {activeTab === 'tomorrow' && (
          <>
            {/* Quick Add Form */}
            {!isLocked && (
              <form onSubmit={addTomorrowTask} className="task-input-bar no-drag">
                <input 
                  type="text" 
                  value={tomorrowInput}
                  onChange={(e) => setTomorrowInput(e.target.value)}
                  placeholder="预先列出明日的开发计划..."
                  className="task-input"
                />
                <button
                  type="button"
                  className="priority-toggle-btn no-drag"
                  onClick={() => {
                    const next = tomorrowPriority === 'med' ? 'high' : tomorrowPriority === 'high' ? 'low' : 'med';
                    setTomorrowPriority(next);
                  }}
                  title={`优先级：${tomorrowPriority === 'high' ? '🔴 紧急' : tomorrowPriority === 'med' ? '🟡 普通' : '🔵 次要'} (点击切换)`}
                >
                  <span className={`priority-dot ${tomorrowPriority}`}></span>
                </button>
                <button type="submit" className="add-btn">
                  <Plus size={16} />
                </button>
              </form>
            )}

            {/* Tomorrow Tasks List */}
            {tomorrowTasks.length === 0 ? (
              <div className="empty-state">
                <Calendar className="empty-icon" />
                <p>明日暂无计划</p>
              </div>
            ) : (
              <div className="task-list">
                {tomorrowTasks.map((task) => (
                  <div key={task.id} className={`task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`}>
                    {editingTask?.list === 'tomorrow' && editingTask.id === task.id ? (
                      <textarea
                        autoFocus
                        rows={1}
                        className="task-edit-textarea no-drag"
                        value={editingTask.text}
                        onChange={(e) => {
                          setEditingTask((current) => ({ ...current, text: e.target.value }));
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={handleEditKeyDown}
                        onBlur={saveTaskEdit}
                        aria-label="编辑任务内容"
                      />
                    ) : (
                      <>
                        <span
                          className="task-text editable"
                          onDoubleClick={() => startTaskEdit('tomorrow', task)}
                          title={isLocked ? undefined : '双击编辑文本'}
                        >
                          {task.text}
                        </span>

                        {!isLocked && (
                          <div className="item-actions no-drag">
                            <button 
                              className="sm-icon-btn" 
                              onClick={() => moveTomorrowTaskToToday(task)}
                              title="移至今日执行"
                            >
                              <Sun size={11} />
                            </button>
                            <button 
                              className="sm-icon-btn danger" 
                              onClick={() => deleteTomorrowTask(task.id)}
                              title="删除"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            {!isLocked && tomorrowTasks.length > 0 && (
              <div className="bottom-bar no-drag" style={{ justifyContent: 'flex-end' }}>
                <button className="txt-btn" onClick={importAllTomorrowToToday}>
                  全部移至今日 ({tomorrowTasks.length})
                </button>
              </div>
            )}
          </>
        )}

        {/* TAB 3: 随手记 (Quick Note) */}
        {activeTab === 'notes' && (
          <div className="note-container">
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录临时代码、网址、备忘文本..."
              className="note-textarea no-drag"
              disabled={isLocked}
            />

            {!isLocked && (
              <div className="note-footer no-drag">
                <span>{notes.length} 字 | {notes.split('\n').length} 行</span>
                <div className="btn-group">
                  <button className="txt-btn" onClick={copyNotes}>
                    <Copy size={11} style={{ marginRight: 4 }} />
                    复制全文
                  </button>
                  <button className="txt-btn" onClick={() => setNotes('')}>
                    清空
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay no-drag" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>PinDo 设置</span>
              <button className="sm-icon-btn" onClick={() => setShowSettingsModal(false)}>
                <X size={14} />
              </button>
            </div>

            <div className="setting-row">
              <div>
                <div>开机自启动</div>
                <div className="setting-sub">系统启动时自动驻留桌面/托盘</div>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={autoStartEnabled}
                  onChange={toggleAutostart}
                />
                <span className="slider-round"></span>
              </label>
            </div>

            <div className="setting-row">
              <div>
                <div>窗口无任务栏图标</div>
                <div className="setting-sub">全局隐藏在托盘，不占任务栏</div>
              </div>
              <span className="setting-status">已启用</span>
            </div>

            <div className="setting-row">
              <div>
                <div>默认始终置顶</div>
                <div className="setting-sub">固定在所有软件最上方</div>
              </div>
              <span className="setting-status">
                {isAlwaysOnTop ? '已启用' : '已关闭'}
              </span>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-message ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}
