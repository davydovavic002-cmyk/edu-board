"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Folder, ChevronRight, ChevronDown, Type, 
  Pencil, MousePointer2, Trash2, ChevronLeft, Layout,
  ZoomIn, ZoomOut, Eraser, Home
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default function EduCanvas() {
  const [folders, setFolders] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [elements, setElements] = useState([]);
  const [drawings, setDrawings] = useState([]); 
  const [currentLine, setCurrentLine] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [tool, setTool] = useState('select');
  const [draggedElement, setDraggedElement] = useState(null);
  const [resizingElement, setResizingElement] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [drawingColor, setDrawingColor] = useState('#2563eb');
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPos, setStartPanPos] = useState({ x: 0, y: 0 });

  useEffect(() => { if (supabase) fetchInitialData(); }, []);

  useEffect(() => {
    if (activeBoard) {
      setElements(activeBoard.elements || []);
      setDrawings(activeBoard.drawings || []);
      setPanOffset({ x: activeBoard.pan_x || 0, y: activeBoard.pan_y || 0 });
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
        setDrawings([]);
        setPanOffset({ x: 0, y: 0 });
      }
    }
  };

  const saveToDatabase = useCallback(async (updatedElements = elements, updatedDrawings = drawings, updatedPan = panOffset) => {
    if (!activeBoard || !supabase) return;
    await supabase.from('boards').update({ 
      elements: updatedElements, 
      drawings: updatedDrawings,
      pan_x: updatedPan.x,
      pan_y: updatedPan.y 
    }).eq('id', activeBoard.id);
  }, [activeBoard, elements, drawings, panOffset]);

  // Зум колесиком
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.min(Math.max(0.1, prev + delta), 3));
  };

  const startDrawing = (e) => {
    if (tool !== 'pencil') return;
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    setCurrentLine({ id: Date.now(), points: [{ x, y }], color: drawingColor });
  };

  const draw = (e) => {
    if (!isDrawing || !currentLine) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - panOffset.x) / zoom;
    const y = (e.clientY - rect.top - panOffset.y) / zoom;
    setCurrentLine(prev => ({ ...prev, points: [...prev.points, { x, y }] }));
  };

  const handleMouseDown = (e, el) => {
    // Ластик для элементов
    if (tool === 'eraser' && el) {
      const newElements = elements.filter(item => item.id !== el.id);
      setElements(newElements);
      saveToDatabase(newElements);
      return;
    }

    // Перемещение холста левой кнопкой мыши (на пустом месте)
    if (e.button === 0 && !el && (tool === 'select' || tool === 'eraser')) {
      setIsPanning(true);
      setStartPanPos({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (tool !== 'select' || e.target.tagName === 'TEXTAREA' || !el) return;

    // Поднимаем элемент выше (в конец массива) и фиксируем z-index
    const newElements = [...elements.filter(item => item.id !== el.id), el];
    setElements(newElements);
    setDraggedElement(el.id);
    setOffset({ x: e.clientX / zoom - el.x, y: e.clientY / zoom - el.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - startPanPos.x, y: e.clientY - startPanPos.y });
      return;
    }
    if (isDrawing) { draw(e); return; }
    if (resizingElement) {
      setElements(elements.map(el => el.id === resizingElement ? { 
        ...el, width: Math.max(150, e.clientX / zoom - el.x),
        height: el.type === 'frame' ? Math.max(100, e.clientY / zoom - el.y) : el.height
      } : el));
    }
    if (draggedElement) {
      setElements(elements.map(el => el.id === draggedElement ? { 
        ...el, x: (e.clientX - panOffset.x) / zoom - offset.x, y: (e.clientY - panOffset.y) / zoom - offset.y 
      } : el));
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      const newDrawings = [...drawings, currentLine];
      setDrawings(newDrawings);
      setCurrentLine(null);
      saveToDatabase(elements, newDrawings);
    } else if (draggedElement || resizingElement || isPanning) {
      saveToDatabase();
    }
    setDraggedElement(null);
    setResizingElement(null);
    setIsDrawing(false);
    setIsPanning(false);
  };

  const addText = () => setElements([...elements, { id: Date.now(), type: 'text', x: (window.innerWidth/2 - panOffset.x)/zoom, y: (window.innerHeight/2 - panOffset.y)/zoom, width: 300, content: '' }]);
  const addFrame = () => setElements([...elements, { id: Date.now(), type: 'frame', x: (window.innerWidth/2 - 400 - panOffset.x)/zoom, y: (window.innerHeight/2 - 300 - panOffset.y)/zoom, width: 800, height: 600, content: 'Область урока' }]);

  return (
    <div className="app-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={handleWheel}>
      <aside className="sidebar" style={{ width: isSidebarOpen ? '280px' : '0', overflow: 'hidden' }}>
        <div className="sidebar-header"><div className="logo-box">E</div>Edu Board</div>
        <div className="sidebar-content">
          <div className="sidebar-section-title"><span>ПРОЕКТЫ</span><button onClick={addFolder} className="btn-add-icon"><Plus size={16}/></button></div>
          {folders.map(f => (
            <div key={f.id} className="folder-group">
              <div className="folder-item" onClick={() => setExpandedFolders({...expandedFolders, [f.id]: !expandedFolders[f.id]})}>
                {expandedFolders[f.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={16} className="icon-blue" />
                <span className="folder-name">{f.name}</span>
                <Plus size={14} onClick={(e) => { e.stopPropagation(); addBoard(f.id); }} />
              </div>
              {expandedFolders[f.id] && f.boards.map(b => (
                <div key={b.id} onClick={() => setActiveBoard(b)} className={`board-item ${activeBoard?.id === b.id ? 'active' : ''}`}>{b.name}</div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="btn-toggle"><ChevronLeft className={isSidebarOpen ? '' : 'rotate-180'} /></button>
            <span className="board-title">{activeBoard ? activeBoard.name : 'Выберите доску'}</span>
          </div>
        </header>

        {activeBoard && (
          <div className="canvas-area" onMouseDown={(e) => handleMouseDown(e, null)}>
            <div className="toolbar">
              <button onClick={() => setTool('select')} className={`tool-btn ${tool==='select'?'active':''}`}><MousePointer2 size={20}/></button>
              <button onClick={() => setTool('pencil')} className={`tool-btn ${tool==='pencil'?'active':''}`}><Pencil size={20}/></button>
              <button onClick={() => setTool('eraser')} className={`tool-btn ${tool==='eraser'?'active':''}`}><Eraser size={20}/></button>
              <button onClick={addText} className="tool-btn"><Type size={20}/></button>
              <button onClick={addFrame} className="tool-btn"><Layout size={20}/></button>
              <div className="color-picker">
                {['#2563eb', '#ef4444', '#10b981', '#000000'].map(color => (
                  <div key={color} className={`color-dot ${drawingColor === color ? 'active' : ''}`} style={{ background: color }} onClick={() => setDrawingColor(color)} />
                ))}
              </div>
            </div>

            <div className="viewport" style={{ 
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, 
              transformOrigin: '0 0',
              cursor: isPanning ? 'grabbing' : 'default'
            }}>
              <div className="grid-layer" />
              
              <svg className="drawing-svg" onMouseDown={startDrawing} style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: tool === 'pencil' ? 'all' : 'none', zIndex: 60 }}>
                {drawings.map(line => (
                  <path 
                    key={line.id} 
                    d={`M ${line.points.map(p => `${p.x} ${p.y}`).join(' L ')}`} 
                    fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" 
                    style={{ pointerEvents: tool === 'eraser' ? 'stroke' : 'none', cursor: 'pointer' }}
                    onMouseEnter={() => tool === 'eraser' && setDrawings(prev => prev.filter(l => l.id !== line.id))}
                  />
                ))}
                {currentLine && (
                  <path d={`M ${currentLine.points.map(p => `${p.x} ${p.y}`).join(' L ')}`} fill="none" stroke={currentLine.color} strokeWidth="3" strokeLinecap="round" />
                )}
              </svg>

              <div className="elements-layer">
                {elements.map(el => (
                  <div key={el.id} 
                    className={`${el.type === 'frame' ? 'miro-frame' : 'miro-text-block'} ${tool === 'eraser' ? 'erasable' : ''}`}
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el); }}
                    style={{ 
                      left: el.x, top: el.y, width: el.width, height: el.type === 'frame' ? el.height : 'auto', 
                      position: 'absolute', zIndex: el.type === 'text' ? 100 : 50 
                    }}
                  >
                    {el.type === 'text' ? (
                      <textarea className="miro-input" value={el.content} placeholder="Текст..." 
                        onChange={(e) => setElements(elements.map(item => item.id === el.id ? {...item, content: e.target.value} : item))}
                      />
                    ) : <div className="miro-frame-header">{el.content}</div>}
                    {tool === 'select' && <div className="miro-resizer" onMouseDown={(e) => { e.stopPropagation(); setResizingElement(el.id); }} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="zoom-controls">
              <button onClick={() => { setPanOffset({x:0,y:0}); setZoom(1); }} className="tool-btn"><Home size={18}/></button>
              <span className="zoom-val">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
