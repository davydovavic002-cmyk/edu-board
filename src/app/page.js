"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Folder, ChevronRight, ChevronDown, Type, 
  Pencil, MousePointer2, Trash2, ChevronLeft, Layout,
  ZoomIn, ZoomOut, Eraser
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default function EduCanvas() {
  const [folders, setFolders] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [elements, setElements] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [tool, setTool] = useState('select');
  const [draggedElement, setDraggedElement] = useState(null);
  const [resizingElement, setResizingElement] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [drawingColor, setDrawingColor] = useState('#2563eb');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => { if (supabase) fetchInitialData(); }, []);

  // Восстановление рисунка при смене доски
  useEffect(() => {
    if (activeBoard && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (activeBoard.drawing_data) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = activeBoard.drawing_data;
      }
    }
  }, [activeBoard]);

  const fetchInitialData = async () => {
    const { data } = await supabase.from('folders').select('*, boards(*)');
    if (data) setFolders(data);
  };

  const addFolder = async () => {
    const name = prompt('Название новой папки:');
    if (name && supabase) {
      const { data } = await supabase.from('folders').insert([{ name }]).select();
      if (data) setFolders([...folders, { ...data[0], boards: [] }]);
    }
  };

  const addBoard = async (folderId) => {
    const name = prompt('Название доски:');
    if (name && supabase) {
      const { data } = await supabase.from('boards').insert([{ name, folder_id: folderId }]).select();
      if (data) {
        setFolders(folders.map(f => f.id === folderId ? { ...f, boards: [...f.boards, data[0]] } : f));
        setActiveBoard(data[0]);
        setElements([]);
      }
    }
  };

  const addNote = () => setElements([...elements, { id: Date.now(), type: 'text', x: 200, y: 200, content: 'Новая заметка' }]);
  const addFrame = () => setElements([...elements, { id: Date.now(), type: 'frame', x: 150, y: 150, width: 400, height: 300, content: 'Область урока' }]);
  
  const clearCanvas = () => {
    if (confirm('Очистить всю доску?')) {
      setElements([]);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveToDatabase(true);
    }
  };

  const startDrawing = (e) => {
    if (tool !== 'pencil') return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) / zoom, (e.clientY - rect.top) / zoom);
  };

  const handleMouseDown = (e, el) => {
    if (tool !== 'select' || e.target.tagName === 'TEXTAREA') return;
    setDraggedElement(el.id);
    setOffset({ x: e.clientX / zoom - el.x, y: e.clientY / zoom - el.y });
  };

  const startResizing = (e, id) => {
    e.stopPropagation();
    setResizingElement(id);
  };

  const handleMouseMove = (e) => {
    if (tool === 'pencil' && isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo((e.clientX - rect.left) / zoom, (e.clientY - rect.top) / zoom);
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = 3 / zoom;
      ctx.lineCap = 'round';
      ctx.stroke();
      return;
    }

    if (resizingElement) {
      setElements(elements.map(el => el.id === resizingElement ? { ...el, width: Math.max(100, e.clientX / zoom - el.x), height: Math.max(100, e.clientY / zoom - el.y) } : el));
      return;
    }

    if (draggedElement && tool === 'select') {
      setElements(elements.map(el => el.id === draggedElement ? { ...el, x: e.clientX / zoom - offset.x, y: e.clientY / zoom - offset.y } : el));
    }
  };

  const handleMouseUp = () => {
    if (isDrawing || draggedElement || resizingElement) {
      saveToDatabase();
    }
    setDraggedElement(null);
    setResizingElement(null);
    setIsDrawing(false);
  };

  const saveToDatabase = useCallback(async (isClear = false) => {
    if (!activeBoard || !supabase) return;
    
    const drawingData = isClear ? null : canvasRef.current?.toDataURL();
    
    await supabase.from('boards').update({ 
      elements,
      drawing_data: drawingData 
    }).eq('id', activeBoard.id);
  }, [elements, activeBoard]);

  useEffect(() => {
    const timer = setTimeout(() => saveToDatabase(), 2000);
    return () => clearTimeout(timer);
  }, [elements, saveToDatabase]);

  return (
    <div className="app-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      
      {isSidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-header">
             <div className="logo-box">E</div>
             Edu Board
          </div>
          <div className="sidebar-content">
            <div className="sidebar-section-title">
              <span>ПРОЕКТЫ</span>
              <button onClick={addFolder} className="btn-add-icon"><Plus size={16}/></button>
            </div>
            {folders.map(f => (
              <div key={f.id} className="folder-group">
                <div className="folder-item" onClick={() => setExpandedFolders({...expandedFolders, [f.id]: !expandedFolders[f.id]})}>
                  {expandedFolders[f.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={16} className="icon-blue" />
                  <span className="folder-name">{f.name}</span>
                  <Plus size={14} onClick={(e) => { e.stopPropagation(); addBoard(f.id); }} />
                </div>
                {expandedFolders[f.id] && f.boards.map(b => (
                  <div key={b.id} onClick={() => { setActiveBoard(b); setElements(b.elements || []); }} className={`board-item ${activeBoard?.id === b.id ? 'active' : ''}`}>{b.name}</div>
                ))}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="btn-toggle"><ChevronLeft className={isSidebarOpen ? '' : 'rotate-180'} /></button>
            <span className="board-title">{activeBoard ? activeBoard.name : 'Выберите доску'}</span>
          </div>
          {activeBoard && <div className="status-badge">CLOUD ACTIVE</div>}
        </header>

        {activeBoard ? (
          <div className="canvas-area" style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
            
            <div className="toolbar">
              <button onClick={() => setTool('select')} className={`tool-btn ${tool==='select'?'active':''}`}><MousePointer2 size={20}/></button>
              <button onClick={() => setTool('pencil')} className={`tool-btn ${tool==='pencil'?'active':''}`}><Pencil size={20}/></button>
              <button onClick={addNote} className="tool-btn"><Type size={20}/></button>
              <button onClick={addFrame} className="tool-btn"><Layout size={20}/></button>
              
              <div className="color-picker">
                {['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#000000', '#8b5cf6', '#ec4899', '#64748b'].map(color => (
                  <div key={color} className={`color-dot ${drawingColor === color ? 'active' : ''}`} style={{ background: color }} onClick={() => setDrawingColor(color)} />
                ))}
              </div>
              
              <button onClick={clearCanvas} className="tool-btn btn-clear"><Eraser size={20}/></button>
            </div>

            <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: '5000px', height: '5000px', position: 'absolute' }}>
              {elements.map(el => (
                <div key={el.id} onMouseDown={(e) => handleMouseDown(e, el)} className={el.type === 'frame' ? 'frame' : 'note'} style={{ left: el.x, top: el.y, width: el.width, height: el.height, cursor: tool === 'select' ? 'grab' : 'default', zIndex: el.type === 'frame' ? 1 : 10 }}>
                  <div className="note-header">
                    {el.type === 'frame' ? <span className="frame-label">{el.content}</span> : <div className="note-handle" />}
                    <button onClick={() => setElements(elements.filter(item => item.id !== el.id))} className="btn-delete"><Trash2 size={12} /></button>
                  </div>
                  {el.type === 'text' && <textarea value={el.content} onChange={(e) => setElements(elements.map(item => item.id === el.id ? {...item, content: e.target.value} : item))} rows={3} />}
                  {el.type === 'frame' && <div className="resizer" onMouseDown={(e) => startResizing(e, el.id)} />}
                </div>
              ))}
              <canvas 
                ref={canvasRef} 
                className={`drawing-canvas ${tool === 'pencil' ? 'active' : ''}`} 
                width={5000} height={5000} 
                onMouseDown={startDrawing}
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: tool === 'pencil' ? 'all' : 'none' }} 
              />
            </div>

            <div className="zoom-controls">
              <button onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))} className="tool-btn"><ZoomOut size={18}/></button>
              <span style={{ fontSize: '12px', fontWeight: 'bold', width: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} className="tool-btn"><ZoomIn size={18}/></button>
            </div>
          </div>
        ) : (
          <div className="empty-state"><Layout size={48} /><p>Выберите доску, чтобы начать обучение</p></div>
        )}
      </main>
    </div>
  );
}
