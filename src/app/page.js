"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Folder, ChevronRight, ChevronDown, Square, Type, 
  FileText, Image as ImageIcon, Pencil, MousePointer2, 
  Trash2, ChevronLeft, Layout, Settings 
} from 'lucide-react';

// --- ИНИЦИАЛИЗАЦИЯ SUPABASE ---
const supabaseUrl = 'ТВОЙ_URL_ИЗ_SUPABASE';
const supabaseKey = 'ТВОЙ_KEY_ИЗ_SUPABASE';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function EduCanvas() {
  // Состояния для данных
  const [folders, setFolders] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [elements, setElements] = useState([]);
  
  // Состояния интерфейса
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [tool, setTool] = useState('select');

  // 1. ЗАГРУЗКА ДАННЫХ ПРИ СТАРТЕ
  useEffect(() => {
    const fetchData = async () => {
      const { data: foldersData } = await supabase.from('folders').select('*, boards(*)');
      if (foldersData) setFolders(foldersData);
    };
    fetchData();
  }, []);

  // 2. ЛОГИКА ПАПОК И ДОСОК
  const addFolder = async () => {
    const name = prompt('Введите название папки (например, "Математика 10А"):');
    if (!name) return;
    const { data } = await supabase.from('folders').insert([{ name }]).select();
    if (data) setFolders([...folders, { ...data[0], boards: [] }]);
  };

  const addBoard = async (folderId) => {
    const name = prompt('Введите название новой доски:');
    if (!name) return;
    const { data } = await supabase.from('boards').insert([{ name, folder_id: folderId }]).select();
    if (data) {
      setFolders(folders.map(f => f.id === folderId ? { ...f, boards: [...f.boards, data[0]] } : f));
      selectBoard(data[0]);
    }
  };

  const selectBoard = (board) => {
    setActiveBoard(board);
    setElements(board.elements || []);
  };

  const toggleFolder = (id) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 3. СОХРАНЕНИЕ ЭЛЕМЕНТОВ
  useEffect(() => {
    if (activeBoard) {
      const save = setTimeout(async () => {
        await supabase.from('boards').update({ elements }).eq('id', activeBoard.id);
      }, 1000);
      return () => clearTimeout(save);
    }
  }, [elements, activeBoard]);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      {isSidebarOpen && (
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Layout size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">EduCanvas</h1>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Мои Папки</span>
              <button onClick={addFolder} className="p-1 hover:bg-blue-50 rounded text-blue-600">
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-1">
              {folders.map(folder => (
                <div key={folder.id}>
                  <div 
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer group"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {expandedFolders[folder.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Folder size={18} className="text-blue-500" />
                    <span className="flex-1 font-medium text-slate-700">{folder.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addBoard(folder.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded text-blue-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  {expandedFolders[folder.id] && (
                    <div className="ml-7 mt-1 border-l border-slate-100 pl-2 space-y-1">
                      {folder.boards.map(board => (
                        <div 
                          key={board.id}
                          onClick={() => selectBoard(board)}
                          className={`p-2 text-sm rounded-lg cursor-pointer transition-all ${activeBoard?.id === board.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          {board.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className={isSidebarOpen ? '' : 'rotate-180'} />
            </button>
            <h2 className="font-semibold text-slate-700">{activeBoard?.name || 'Выберите доску'}</h2>
          </div>
          {activeBoard && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold uppercase">Облако синхронизировано</span>}
        </header>

        {activeBoard ? (
          <div className="flex-1 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] overflow-auto">
            {/* Панель инструментов */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-200 z-20">
              <ToolButton active={tool==='select'} onClick={()=>setTool('select')} icon={<MousePointer2 size={20}/>} />
              <ToolButton active={tool==='pencil'} onClick={()=>setTool('pencil')} icon={<Pencil size={20}/>} />
              <ToolButton onClick={() => setElements([...elements, { id: Date.now(), type: 'text', x: 250, y: 250, content: 'Новая заметка' }])} icon={<Type size={20}/>} />
            </div>

            {/* Элементы доски */}
            {elements.map(el => (
              <div key={el.id} style={{ left: el.x, top: el.y }} className="absolute p-4 bg-white border border-slate-200 shadow-lg rounded-xl min-w-[200px] cursor-move">
                <textarea 
                  className="w-full h-full bg-transparent border-none outline-none text-slate-700 resize-none"
                  defaultValue={el.content}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
             <Layout size={48} className="mb-4 opacity-20" />
             <p>Создайте папку и добавьте в неё доску, чтобы начать работу</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Вспомогательный компонент кнопки
function ToolButton({ icon, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {icon}
    </button>
  );
}
