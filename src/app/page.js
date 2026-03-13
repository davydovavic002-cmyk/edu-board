"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Folder, ChevronRight, ChevronDown, Type, 
  Pencil, MousePointer2, Trash2, ChevronLeft, Layout 
} from 'lucide-react';

// Инициализация через переменные окружения, которые ты настроила на Render
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EduCanvas() {
  // Данные
  const [folders, setFolders] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [elements, setElements] = useState([]);
  
  // Интерфейс
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [tool, setTool] = useState('select');
  
  // Drag and Drop
  const [draggedElement, setDraggedElement] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 1. Загрузка данных из базы при запуске
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data } = await supabase.from('folders').select('*, boards(*)');
      if (data) setFolders(data);
    };
    fetchInitialData();
  }, []);

  // 2. Управление папками и досками
  const addFolder = async () => {
    const name = prompt('Название новой папки:');
    if (!name) return;
    const { data } = await supabase.from('folders').insert([{ name }]).select();
    if (data) setFolders([...folders, { ...data[0], boards: [] }]);
  };

  const addBoard = async (folderId) => {
    const name = prompt('Название доски:');
    if (!name) return;
    const { data } = await supabase.from('boards').insert([{ name, folder_id: folderId }]).select();
    if (data) {
      setFolders(folders.map(f => f.id === folderId ? { ...f, boards: [...f.boards, data[0]] } : f));
      setActiveBoard(data[0]);
      setElements([]);
    }
  };

  // 3. Логика элементов (Заметки)
  const addNote = () => {
    const newNote = { 
      id: Date.now(), 
      type: 'text', 
      x: 350, 
      y: 200, 
      content: 'Новая заметка (нажми, чтобы редактировать)' 
    };
    setElements([...elements, newNote]);
  };

  const updateNoteContent = (id, newContent) => {
    setElements(elements.map(el => el.id === id ? { ...el, content: newContent } : el));
  };

  const deleteElement = (id) => {
    setElements(elements.filter(el => el.id !== id));
  };

  // 4. Логика перетаскивания (Drag and Drop)
  const handleMouseDown = (e, el) => {
    if (tool !== 'select' || e.target.tagName === 'TEXTAREA') return;
    setDraggedElement(el.id);
    setOffset({
      x: e.clientX - el.x,
      y: e.clientY - el.y
    });
  };

  const handleMouseMove = (e) => {
    if (!draggedElement || tool !== 'select') return;
    const newElements = elements.map(el => {
      if (el.id === draggedElement) {
        return { ...el, x: e.clientX - offset.x, y: e.clientY - offset.y };
      }
      return el;
    });
    setElements(newElements);
  };

  const handleMouseUp = () => {
    if (draggedElement) {
      saveToDatabase(); // Сохраняем в базу после того, как отпустили мышь
      setDraggedElement(null);
    }
  };

  // 5. Автосохранение в базу данных
  const saveToDatabase = useCallback(async () => {
    if (activeBoard) {
      await supabase.from('boards').update({ elements }).eq('id', activeBoard.id);
    }
  }, [elements, activeBoard]);

  // Сохраняем при изменении текста (с небольшой задержкой)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      saveToDatabase();
    }, 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [elements, saveToDatabase]);

  return (
    <div 
      className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* САЙДБАР */}
      {isSidebarOpen && (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm transition-all z-30">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold italic">E</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">EduCanvas</h1>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Проекты</span>
              <button onClick={addFolder} className="p-1 hover:bg-blue-50 rounded text-blue-600 transition-colors">
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-1">
              {folders.map(f => (
                <div key={f.id} className="group">
                  <div 
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                    onClick={() => setExpandedFolders({...expandedFolders, [f.id]: !expandedFolders[f.id]})}
                  >
                    {expandedFolders[f.id] ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                    <Folder size={18} className="text-blue-500 fill-blue-50" />
                    <span className="flex-1 font-medium text-slate-700">{f.name}</span>
                    <Plus 
                      size={14} 
                      className="opacity-0 group-hover:opacity-100 text-blue-600" 
                      onClick={(e) => { e.stopPropagation(); addBoard(f.id); }} 
                    />
                  </div>
                  {expandedFolders[f.id] && f.boards.map(b => (
                    <div 
                      key={b.id} 
                      onClick={() => { setActiveBoard(b); setElements(b.elements || []); }}
                      className={`ml-7 mt-1 p-2 text-sm rounded-lg cursor-pointer transition-all ${activeBoard?.id === b.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
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

      {/* РАБОЧАЯ ОБЛАСТЬ */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <ChevronLeft className={isSidebarOpen ? '' : 'rotate-180'} />
            </button>
            <h2 className="font-bold text-slate-800">{activeBoard ? activeBoard.name : 'Рабочее пространство'}</h2>
          </div>
          {activeBoard && <div className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold border border-emerald-100 uppercase tracking-tighter">Синхронизация OK</div>}
        </header>

        {activeBoard ? (
          <div className="flex-1 relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px]">
            {/* ПАНЕЛЬ ИНСТРУМЕНТОВ */}
            <div className="absolute left-6 top-10 flex flex-col gap-3 bg-white p-2 rounded-2xl shadow-2xl border border-slate-200 z-50">
              <button 
                onClick={() => setTool('select')} 
                className={`p-3 rounded-xl transition-all ${tool==='select'?'bg-blue-600 text-white shadow-lg shadow-blue-200':'hover:bg-slate-50 text-slate-500'}`}
              >
                <MousePointer2 size={22}/>
              </button>
              <button 
                onClick={() => setTool('pencil')} 
                className={`p-3 rounded-xl transition-all ${tool==='pencil'?'bg-blue-600 text-white shadow-lg':'hover:bg-slate-50 text-slate-500'}`}
              >
                <Pencil size={22}/>
              </button>
              <div className="h-px bg-slate-100 mx-2" />
              <button onClick={addNote} className="p-3 hover:bg-slate-50 text-slate-500 rounded-xl transition-colors"><Type size={22}/></button>
            </div>

            {/* ЭЛЕМЕНТЫ (ЗАМЕТКИ) */}
            {elements.map(el => (
              <div 
                key={el.id} 
                onMouseDown={(e) => handleMouseDown(e, el)}
                style={{ 
                  left: el.x, 
                  top: el.y, 
                  cursor: tool === 'select' ? (draggedElement === el.id ? 'grabbing' : 'grab') : 'default' 
                }}
                className={`absolute p-5 bg-white border-2 rounded-2xl min-w-[250px] shadow-xl transition-shadow ${draggedElement === el.id ? 'shadow-2xl border-blue-400' : 'border-white'}`}
              >
                <div className="flex justify-between items-start mb-2">
                   <div className="w-8 h-1 bg-slate-100 rounded-full" />
                   <button onClick={() => deleteElement(el.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                     <Trash2 size={14} />
                   </button>
                </div>
                <textarea 
                  className="w-full h-full bg-transparent border-none outline-none text-slate-700 resize-none font-medium leading-relaxed cursor-text"
                  value={el.content}
                  onChange={(e) => updateNoteContent(el.id, e.target.value)}
                  placeholder="Начните писать..."
                  rows={4}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center opacity-50">
               <Layout size={32} />
            </div>
            <p className="font-medium">Создайте или выберите доску, чтобы начать обучение</p>
          </div>
        )}
      </main>
    </div>
  );
}
