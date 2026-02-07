mport React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, 
  Folder, 
  Package, 
  MoreVertical, 
  ChevronRight, 
  Home, 
  ArrowLeft, 
  Trash2, 
  Edit2, 
  Move, 
  X,
  Check,
  Loader2,
  Search
} from 'lucide-react';

// --- Supabase Config ---
// Variables are assumed to be injected or available in the environment
const supabaseUrl = (window as any)._env_?.SUPABASE_URL || '';
const supabaseKey = (window as any)._env_?.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Types ---
interface Item {
  id: string;
  name: string;
  type: 'folder' | 'item';
  parent_id: string | null;
  created_at: string;
}

// --- App Component ---
const App: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: '根目录' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Data for modals
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [newEntry, setNewEntry] = useState({ name: '', type: 'item' as 'folder' | 'item' });
  const [editName, setEditName] = useState('');

  // Selection & Move Logic
  const [isMoveTargetMode, setIsMoveTargetMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemToMove, setItemToMove] = useState<Item | null>(null);

  // --- Fetch Data ---
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('type', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // --- Actions ---
  const handleAddItem = async () => {
    if (!newEntry.name.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('items')
        .insert([{
          name: newEntry.name.trim(),
          type: newEntry.type,
          parent_id: currentFolderId // Will be null or UUID
        }]);
      
      if (error) throw error;
      await fetchItems();
      setIsAddModalOpen(false);
      setNewEntry({ name: '', type: 'item' });
    } catch (err) {
      console.error('Add failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditItem = async () => {
    if (!activeItem || !editName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({ name: editName.trim() })
        .eq('id', activeItem.id);
      
      if (!error) {
      // 局部更新：直接在本地找到那个物品改掉它的名字和图标
      setItems(prev => prev.map(item => 
        item._id === activeActionItem._id 
          ? { ...item, name: editName, icon: editEmoji } 
          : item
      ));
      setBreadcrumb(prev => prev.map(b => b.id === activeActionItem._id ? { ...b, name: editName } : b));
      setIsEditModalOpen(false);
      setActiveActionItem(null);
    }
    } catch (err) {
      console.error('Edit failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!activeItem) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', activeItem.id);
      
      if (error) throw error;
      await fetchItems();
      setIsDeleteConfirmOpen(false);
      setActiveItem(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveItem = async () => {
    if (!itemToMove) return;
    
    // Prevent moving a folder into itself
    if (itemToMove.id === currentFolderId) {
      alert("不能将文件夹移动到自身内部");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({ parent_id: currentFolderId }) // Move to current viewed folder
        .eq('id', itemToMove.id);
      
      if (error) throw error;
      await fetchItems();
      setIsMoveTargetMode(false);
      setItemToMove(null);
    } catch (err) {
      console.error('Move failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- UI Helpers ---
  const currentItems = useMemo(() => {
    const filtered = items.filter(item => item.parent_id === currentFolderId);
    if (!searchTerm) return filtered;
    return filtered.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, currentFolderId, searchTerm]);

  const navigateTo = (id: string | null, name: string) => {
    if (isMoveTargetMode && itemToMove && itemToMove.id === id) return; // Prevent clicking into the item being moved

    setCurrentFolderId(id);
    if (id === null) {
      setPath([{ id: null, name: '根目录' }]);
    } else {
      const newPath = [...path];
      const index = newPath.findIndex(p => p.id === id);
      if (index !== -1) {
        setPath(newPath.slice(0, index + 1));
      } else {
        setPath([...newPath, { id, name }]);
      }
    }
    setSearchTerm('');
  };

  const enterMoveMode = (item: Item) => {
    setItemToMove(item);
    setIsMoveTargetMode(true);
  };

  // --- Components ---
  const Modal = ({ isOpen, onClose, title, children }: any) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#F7F6F3] text-[#37352F]">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 pt-4 pb-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar py-1">
          {path.map((p, idx) => (
            <React.Fragment key={p.id || 'root'}>
              <button 
                onClick={() => navigateTo(p.id, p.name)}
                className={`flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors ${
                  idx === path.length - 1 ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {p.id === null && <Home size={14} />}
                {p.name}
              </button>
              {idx < path.length - 1 && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
        
        <div className="mt-4 flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
          <Search size={16} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索当前目录..."
            className="bg-transparent border-none outline-none text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <Loader2 className="animate-spin" size={24} />
            <p className="text-sm">加载中...</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 opacity-60">
            <div className="p-6 bg-white rounded-full">
              <Package size={48} strokeWidth={1} />
            </div>
            <p className="text-sm">空空如也，点击下方添加</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {currentItems.map(item => (
              <div 
                key={item.id}
                className={`group flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all ${
                  isMoveTargetMode && itemToMove?.id === item.id ? 'opacity-40 grayscale pointer-events-none' : ''
                }`}
                onClick={() => item.type === 'folder' ? navigateTo(item.id, item.name) : null}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.type === 'folder' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                    {item.type === 'folder' ? <Folder size={20} fill="currentColor" fillOpacity={0.2} /> : <Package size={20} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-[15px]">{item.name}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{item.type === 'folder' ? '文件夹' : '物品'}</span>
                  </div>
                </div>

                {!isMoveTargetMode && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setActiveItem(item);
                        setEditName(item.name);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-50"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => enterMoveMode(item)}
                      className="p-2 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-gray-50"
                    >
                      <Move size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setActiveItem(item);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Bar / Move Bar */}
      <div className="fixed bottom-6 left-4 right-4 z-40">
        {isMoveTargetMode ? (
          <div className="bg-amber-500 text-white rounded-2xl shadow-xl p-4 flex items-center justify-between animate-in slide-in-from-bottom-4">
            <div className="flex flex-col">
              <span className="text-xs opacity-80">移动中: {itemToMove?.name}</span>
              <span className="text-sm font-bold truncate max-w-[150px]">至: {path[path.length - 1].name}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setIsMoveTargetMode(false);
                  setItemToMove(null);
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
                disabled={isSaving}
              >
                取消
              </button>
              <button 
                onClick={handleMoveItem}
                className="px-4 py-2 bg-white text-amber-600 rounded-xl text-sm font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                移动到此处
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full bg-[#37352F] text-white rounded-2xl shadow-xl p-4 flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] hover:bg-black"
          >
            <Plus size={20} />
            新增项 / 文件夹
          </button>
        )}
      </div>

      {/* Add Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => !isSaving && setIsAddModalOpen(false)} 
        title="新增项目"
      >
        <div className="space-y-4">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button 
              onClick={() => setNewEntry({ ...newEntry, type: 'item' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${newEntry.type === 'item' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              <Package size={16} /> 物品
            </button>
            <button 
              onClick={() => setNewEntry({ ...newEntry, type: 'folder' })}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${newEntry.type === 'folder' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500'}`}
            >
              <Folder size={16} /> 文件夹
            </button>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 ml-1">名称</label>
            <input 
              autoFocus
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 focus:bg-white transition-all"
              placeholder="输入名称..."
              value={newEntry.name}
              onChange={e => setNewEntry({ ...newEntry, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
            />
          </div>
          <button 
            onClick={handleAddItem}
            disabled={isSaving || !newEntry.name.trim()}
            className="w-full py-3 bg-[#37352F] text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : '确认添加'}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => !isSaving && setIsEditModalOpen(false)} 
        title="重命名"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 ml-1">新名称</label>
            <input 
              autoFocus
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 focus:bg-white transition-all"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditItem()}
            />
          </div>
          <button 
            onClick={handleEditItem}
            disabled={isSaving || !editName.trim()}
            className="w-full py-3 bg-[#37352F] text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : '保存更改'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal 
        isOpen={isDeleteConfirmOpen} 
        onClose={() => !isSaving && setIsDeleteConfirmOpen(false)} 
        title="确定删除？"
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-500 leading-relaxed">
            你确定要删除 <span className="font-bold text-gray-800">"{activeItem?.name}"</span> 吗？<br/>如果是文件夹，其内部的所有物品也将一并删除（依赖数据库级联规则）。
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium active:scale-95"
              disabled={isSaving}
            >
              取消
            </button>
            <button 
              onClick={handleDeleteItem}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : '确认删除'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

// --- Render ---
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
