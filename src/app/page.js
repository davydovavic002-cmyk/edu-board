"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Folder, ChevronRight, ChevronDown, Type, 
  Pencil, MousePointer2, Trash2, ChevronLeft, Layout 
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export default function EduCanvas() {
  const [folders, setFolders] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [elements, setElements] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [tool, setTool] = useState('select');
  const [draggedElement, setDraggedElement] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // Новые состояния для рисования и фреймов
  const [drawingColor, setDrawingColor] = useState('#2563eb');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (supabase) {
      fetchInitialData();
    }
  }, []);

  const fetchInitialData = async () => {
    const { data } = await supabase.from('folders').select('*, boards(*)');
    if (data) setFolders(data);
  };

  const addFolder = async () => {
    const name = prompt('Название новой папки:');
    if (!name || !supabase) return;
    const { data } = await supabase.from('folders').insert([{ name }]).select();
    if (data) setFolders([...folders, { ...data[0], boards: [] }]);
  };

  const addBoard = async (folderId) => {
    const name = prompt('Название доски:');
    if (!name || !supabase) return;
    const { data } = await supabase.from('boards').insert([{ name, folder_id: folderId }]).select();
    if (data) {
      setFolders(folders.map(f => f.id === folderId ? { ...f, boards: [...f.boards, data[0]] } : f));
      setActiveBoard(data[0]);
      setElements([]);
    }
  };

  const addNote = () => {
    const newNote = { id: Date.now(), type: 'text', x: 350, y: 200, content: 'Нажми, чтобы редактировать' };
    setElements([...elements, newNote]);
  };

  const addFrame = () => {
    const newFrame = { id: Date.now(), type: 'frame', x: 100, y: 100, width: 600, height: 400, content: 'Новый фрейм' };
    setElements([...elements, newFrame]);
  };

  const updateNoteContent = (id, newContent) => {
    setElements(elements.map(el => el.id === id ? { ...el, content: newContent } : el));
  };

  const deleteElement = (id) => {
    setElements(elements.filter(el => el.id !== id));
  };

  // Логика рисования
  const startDrawing = (e) => {
    if (tool !== 'pencil') return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing || tool !== 'pencil') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleMouseDown = (e, el) => {
    if (tool !== 'select' || e.target.tagName === 'TEXTAREA') return;
    setDraggedElement(el.id);
    setOffset({ x: e.clientX - el.x, y: e.clientY - el.y });
  };

  const handleMouseMove = (e) => {
    if (tool === 'pencil') {
      draw(e);
      return;
    }
    if (!draggedElement || tool !== 'select') return;
    setElements(elements.map(el => el.id === draggedElement ? { ...el, x: e.clientX - offset.x, y: e.clientY - offset.y } : el));
  };

  const handleMouseUp = () => {
    if (tool === 'pencil') {
      stopDrawing();
      return;
    }
    if (draggedElement) {
      saveToDatabase();
      setDraggedElement(null);
    }
  };

  const saveToDatabase = useCallback(async () => {
    if (activeBoard && supabase) {
      await supabase.from('boards').update({ elements }).eq('id', activeBoard.id);
    }
  }, [elements, activeBoard]);

  useEffect(() => {
    const timer = setTimeout(() => saveToDatabase(), 1500);
    return () => clearTimeout(timer);
  }, [elements, saveToDatabase]);

  return (
    <div className="app-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      
      {/* САЙДБАР */}
      {isSidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-header">
             <div className="logo-box">E</div>
             EduCanvas
          </div>
          
          <div className="sidebar-content">
            <div className="sidebar-section-title">
              <span>ПРОЕКТЫ</span>
              <button onClick={addFolder} className="btn-add-icon">+</button>
            </div>

            <div className="folder-list">
              {folders.map(f => (
                <div key={f.id} className="folder-group">
                  <div className="folder-item" onClick={() => setExpandedFolders({...expandedFolders, [f.id]: !expandedFolders[f.id]})}>
                    {expandedFolders[f.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={16} className="icon-blue" />
                    <span className="folder-name">{f.name}</span>
                    <button className="btn-small-add" onClick={(e) => { e.stopPropagation(); addBoard(f.id); }}>+</button>
                  </div>
                  
                  {expandedFolders[f.id] && f.boards.map(b => (
                    <div 
                      key={b.id} 
                      onClick={() => { setActiveBoard(b); setElements(b.elements || []); }} 
                      className={`board-item ${activeBoard?.id === b.id ? 'active' : ''}`}
                    >
                      {b.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* ГЛАВНЫЙ ЭКРАН */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="btn-toggle">
              <ChevronLeft className={isSidebarOpen ? '' : 'rotate-180'} />
            </button>
            <span className="board-title">{activeBoard ? activeBoard.name : 'Выберите доску'}</span>
          </div>
          {activeBoard && <div className="status-badge">CLOUD ACTIVE</div>}
        </header>

        {activeBoard ? (
          <div className="canvas-area" style={{ position: 'relative', flex: 1 }}>
            
            {/* ТУЛБАР */}
            <div className="toolbar">
              <button onClick={() => setTool('select')} className={`tool-btn ${tool==='select'?'active':''}`}><MousePointer2 size={20}/></button>
              <button onClick={() => setTool('pencil')} className={`tool-btn ${tool==='pencil'?'active':''}`}><Pencil size={20}/></button>
              <button onClick={addNote} className="tool-btn"><Type size={20}/></button>
              <button onClick={addFrame} className="tool-btn"><Layout size={20}/></button>

              {/* ПАЛИТРА ЦВЕТОВ */}
              <div className="color-picker">
                {['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#000000'].map(color => (
                  <div 
                    key={color} 
                    className={`color-dot ${drawingColor === color ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setDrawingColor(color)}
                  />
                ))}
              </div>
            </div>

            {/* ЭЛЕМЕНТЫ (Фреймы и Заметки) */}
            {elements.map(el => (
              el.type === 'frame' ? (
                <div key={el.id} className="frame" style={{ left: el.x, top: el.y, width: el.width, height: el.height }}>
                  <div className="frame-label">{el.content}</div>
                </div>
              ) : (
                <div 
                  key={el.id} 
                  onMouseDown={(e) => handleMouseDown(e, el)} 
                  style={{ left: el.x, top: el.y, cursor: tool === 'select' ? 'grab' : 'default', zIndex: 10 }} 
                  className="note"
                >
                  <div className="note-header">
                    <div className="note-handle" />
                    <button onClick={() => deleteElement(el.id)} className="btn-delete"><Trash2 size={12} /></button>
                  </div>
                  <textarea 
                    value={el.content} 
                    onChange={(e) => updateNoteContent(el.id, e.target.value)} 
                    rows={3} 
                  />
                </div>
              )
            ))}

            {/* СЛОЙ ДЛЯ РИСОВАНИЯ */}
            <canvas 
              ref={canvasRef}
              className={`drawing-canvas ${tool === 'pencil' ? 'active' : ''}`}
              width={2000} 
              height={2000} 
              onMouseDown={startDrawing}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: tool === 'pencil' ? 'all' : 'none' }}
            />
          </div>
        ) : (
          <div className="empty-state">
            <Layout size={48} />
            <p>Выберите доску, чтобы начать обучение</p>
          </div>
        )}
      </main>
    </div>
  );
}
