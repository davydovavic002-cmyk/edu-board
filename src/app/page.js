"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Folder, ChevronRight, ChevronDown, Type, 
  Pencil, MousePointer2, Trash2, ChevronLeft, Layout 
} from 'lucide-react';

// Безопасная инициализация Supabase для предотвращения ошибок билда на Render
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

  const updateNoteContent = (id, newContent) => {
    setElements(elements.map(el => el.id === id ? { ...el, content: newContent } : el));
  };

  const deleteElement = (id) => {
    setElements(elements.filter(el => el.id !== id));
  };

  const handleMouseDown = (e, el) => {
    if (tool !== 'select' || e.target.tagName === 'TEXTAREA') return;
    setDraggedElement(el.id);
    setOffset({ x: e.clientX - el.x, y: e.clientY - el.y });
  };

  const handleMouseMove = (e) => {
    if (!draggedElement || tool !== 'select') return;
    setElements(elements.map(el => el.id === draggedElement ? { ...el, x: e.clientX - offset.x, y: e.clientY - offset.y } : el));
  };

  const handleMouseUp = () => {
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
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden select-none" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {isSidebarOpen && (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-30">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold italic text-sm">E</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">EduCanvas</h1>
          </div>
          <div className="p-4 flex-1 overflow-y-auto font-sans">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Проекты</span>
              <button onClick={addFolder} className="p-1 hover:bg-blue-50 rounded text-blue-600 transition-colors"><Plus size={18} /></button>
            </div>
            <div className="space-y-1">
              {folders.map(f => (
                <div key={f.id} className="group">
                  <div className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm" onClick={() => setExpandedFolders({...expandedFolders, [f.id]: !expandedFolders[f.id]})}>
                    {expandedFolders[f.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={16} className="text-blue-500 fill-blue-50" />
                    <span className="flex-1 font-medium">{f.name}</span>
                    <Plus size={14} className="opacity-0 group-hover:opacity-100 text-blue-600" onClick={(e) => { e.stopPropagation(); addBoard(f.id); }} />
                  </div>
                  {expandedFolders[f.id] && f.boards.map(b => (
                    <div key={b.id} onClick={() => { setActiveBoard(b); setElements(b.elements || []); }} className={`ml-7 mt-1 p-2 text-xs rounded-lg cursor-pointer ${activeBoard?.id === b.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{b.name}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col relative overflow-hidden font-sans">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-transform"><ChevronLeft className={isSidebarOpen ? '' : 'rotate-180'} /></button>
            <h2 className="font-bold text-slate-800 text-sm">{activeBoard ? activeBoard.name : 'Рабочее пространство'}</h2>
          </div>
          {activeBoard && <div className="text-[9px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold border border-emerald-100">CLOUD ACTIVE</div>}
        </header>

        {activeBoard ? (
          <div className="flex-1 relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
            <div className="absolute left-6 top-10 flex flex-col gap-3 bg-white p-2 rounded-2xl shadow-xl border border-slate-200 z-50">
              <button onClick={() => setTool('select')} className={`p-3 rounded-xl transition-all ${tool==='select'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-slate-50'}`}><MousePointer2 size={20}/></button>
              <button onClick={() => setTool('pencil')} className={`p-3 rounded-xl transition-all ${tool==='pencil'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-slate-100'}`}><Pencil size={20}/></button>
              <div className="h-px bg-slate-100 mx-2" />
              <button onClick={addNote} className="p-3 hover:bg-slate-50 text-slate-500 rounded-xl transition-colors"><Type size={20}/></button>
            </div>

            {elements.map(el => (
              <div key={el.id} onMouseDown={(e) => handleMouseDown(e, el)} style={{ left: el.x, top: el.y, cursor: tool === 'select' ? 'grab' : 'default' }} className="absolute p-5 bg-white border border-slate-200 rounded-2xl min-w-[200px] shadow-lg">
                <div className="flex justify-between items-start mb-2"><div className="w-8 h-1 bg-slate-100 rounded-full" /><button onClick={() => deleteElement(el.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button></div>
                <textarea className="w-full bg-transparent border-none outline-none text-slate-700 resize-none font-medium text-sm leading-relaxed" value={el.content} onChange={(e) => updateNoteContent(el.id, e.target.value)} rows={3} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4"><Layout size={48} className="opacity-10" /><p className="text-sm">Выберите доску, чтобы начать обучение</p></div>
        )}
      </main>
    </div>
  );
}
