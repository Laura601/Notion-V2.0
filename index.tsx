import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  ChevronRight, 
  Plus, 
  X, 
  Search, 
  Move, 
  MapPin, 
  Trash2, 
  Wind, 
  Box, 
  Hash, 
  CheckCircle2,
  Circle,
  ArrowLeft,
  Calendar,
  Cloud,
  User,
  Check,
  Edit2,
  MoreHorizontal,
  Edit3
} from 'lucide-react';

// 1. 初始化 Supabase 客户端 (使用你提供的配置)
const SB_URL = 'https://iqchfhaawrlamfbwrziq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxY2hmaGFhd3JsYW1mYndyemlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDcxMTYsImV4cCI6MjA4NTk4MzExNn0.-9lMLB5Lm-xV-aEnO6H9kOWVAWPVMwdfJbUmOLQbqSY';
// @ts-ignore
const supabase = window.supabase.createClient(SB_URL, SB_KEY);

interface Item {
  _id: string;
  _openid: string;
  name: string;
  icon: string;
  parentId: string | null;
  createdAt: number;
}

const App = () => {
  // 状态初始化：初始为空，通过云端加载
  const [items, setItems] = useState<Item[]>([]);
  
  const [isLoggedIn] = useState(true);
  const [userName] = useState('微信用户');
  const [workspaceName, setWorkspaceName] = useState('我的工作区');
  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [tempWorkspaceName, setTempWorkspaceName] = useState('');

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{id: string|null, name: string}[]>([]);
  
  // ---------------------------------------------------------
  // 2. 云端数据交互逻辑 (核心修改点)
  // ---------------------------------------------------------
  
  // 刷新全量数据
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (data) {
      // 将 Supabase 的 id 映射为代码中的 _id，确保 UI 不报错
      const formattedData = data.map((i: any) => ({
        ...i,
        _id: i.id,
        createdAt: new Date(i.created_at).getTime()
      }));
      setItems(formattedData);
    }
    if (error) console.error('数据读取失败:', error);
  };

  // 页面启动时加载一次
  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      setBreadcrumb([{id: null, name: workspaceName}]);
    }
  }, [isLoggedIn, workspaceName]);

  // UI Interaction States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isMoveTargetMode, setIsMoveTargetMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Item Action States
  const [activeActionItem, setActiveActionItem] = useState<Item | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('📦');

  // Stats Logic (基于当前 items 数组，无需修改)
  const getChildCount = (id: string) => items.filter(i => i.parentId === id).length;
  const getTotalChildrenCount = (id: string | null): number => {
    const directChildren = items.filter(i => i.parentId === id);
    let count = directChildren.length;
    directChildren.forEach(child => { count += getTotalChildrenCount(child._id); });
    return count;
  };

  const getFullPath = (parentId: string | null): string => {
    if (!parentId) return '';
    const parent = items.find(i => i._id === parentId);
    if (!parent) return '';
    const grandParentPath = getFullPath(parent.parentId);
    return (grandParentPath ? grandParentPath + ' > ' : '') + parent.name;
  };

  const buildBreadcrumbForId = (id: string | null) => {
    if (!id) return [{ id: null, name: workspaceName }];
    const path: {id: string|null, name: string}[] = [];
    let current: Item | undefined = items.find(i => i._id === id);
    while (current) {
      path.unshift({ id: current._id, name: current.name });
      current = items.find(i => i._id === current.parentId);
    }
    path.unshift({ id: null, name: workspaceName });
    return path;
  };

  const filteredItems = useMemo(() => {
    if (searchQuery) return items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return items.filter(i => i.parentId === currentId);
  }, [items, currentId, searchQuery]);

  const handleNavigate = (item: Item) => {
    if (isSelectionMode && !isMoveTargetMode) { toggleSelection(item._id); return; }
    if (searchQuery) {
      setBreadcrumb(buildBreadcrumbForId(item._id));
      setCurrentId(item._id);
      setSearchQuery('');
    } else {
      setCurrentId(item._id);
      setBreadcrumb([...breadcrumb, { id: item._id, name: item.name }]);
    }
  };

  const handleBreadcrumbClick = (idx: number) => {
    if (idx === 0 && currentId === null && !isSelectionMode) {
      setTempWorkspaceName(workspaceName);
      setIsEditingWorkspace(true);
      return;
    }
    const newBreadcrumb = breadcrumb.slice(0, idx + 1);
    setBreadcrumb(newBreadcrumb);
    setCurrentId(newBreadcrumb[idx].id);
    setSearchQuery('');
  };

  const saveWorkspaceName = () => {
    if (tempWorkspaceName.trim()) {
      setWorkspaceName(tempWorkspaceName);
      setBreadcrumb(prev => prev.map((b, i) => i === 0 ? { ...b, name: tempWorkspaceName } : b));
    }
    setIsEditingWorkspace(false);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
    if (newSet.size === 0) setIsSelectionMode(false);
  };

  // ---------------------------------------------------------
  // 3. 云端操作逻辑 (新增/移动/删除/修改)
  // ---------------------------------------------------------

  const confirmMove = async () => {
    const targets = Array.from(selectedIds);
    // 批量更新父 ID
    const { error } = await supabase
      .from('items')
      .update({ parentId: currentId })
      .in('id', targets);

    if (!error) {
      await fetchItems();
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setIsMoveTargetMode(false);
    }
  };

  const handleSaveNewItem = async () => {
    if (!editName) return;
    const { error } = await supabase
      .from('items')
      .insert([{
        name: editName,
        icon: editEmoji,
        parentId: currentId
      }]);
    
    if (!error) {
      await fetchItems();
      setIsAddModalOpen(false);
      setEditName('');
    }
  };

  const handleUpdateItem = async () => {
    if (!activeActionItem || !editName) return;
    const { error } = await supabase
      .from('items')
      .update({ name: editName, icon: editEmoji })
      .eq('id', activeActionItem._id);
    
    if (!error) {
      await fetchItems();
      setBreadcrumb(prev => prev.map(b => b.id === activeActionItem._id ? { ...b, name: editName } : b));
      setIsEditModalOpen(false);
      setActiveActionItem(null);
    }
  };

  const handleDeleteItem = async () => {
    if (!activeActionItem) return;
    
    // 递归收集所有子项 ID (保持你的原逻辑，但改为数据库操作)
    const idsToDelete: string[] = [];
    const collectIds = (id: string) => {
      idsToDelete.push(id);
      items.filter(i => i.parentId === id).forEach(child => collectIds(child._id));
    };
    collectIds(activeActionItem._id);

    const { error } = await supabase
      .from('items')
      .delete()
      .in('id', idsToDelete);

    if (!error) {
      await fetchItems();
      if (breadcrumb.some(b => b.id === activeActionItem._id)) {
        handleBreadcrumbClick(breadcrumb.findIndex(b => b.id === activeActionItem._id) - 1);
      }
      setIsDeleteConfirmOpen(false);
      setActiveActionItem(null);
    }
  };

  const openItemActions = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    setActiveActionItem(item);
    setEditName(item.name);
    setEditEmoji(item.icon);
  };

  // 下面全部保持你原本精美的 UI 代码不变
  return (
    <div className="fixed inset-0 bg-white text-[#37352F] flex flex-col overflow-hidden select-none">
       {/* Header */}
       <div className="pt-12 px-6 pb-2 sticky top-0 bg-white z-20">
          <div className="flex items-center justify-between py-2">
            {!isSelectionMode && !isMoveTargetMode ? (
              <div className="relative group w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D3D2CE]" size={14} />
                <input 
                  type="text"
                  placeholder="搜索物品..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F7F6F3] rounded-lg py-2.5 pl-9 pr-4 text-[13px] outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between w-full animate-in fade-in">
                <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); setIsMoveTargetMode(false); }} className="text-[#7A776E]"><ArrowLeft size={18}/></button>
                <span className="text-[14px] font-bold">{isMoveTargetMode ? '移动至...' : `已选 ${selectedIds.size}`}</span>
                <span className="w-4"></span>
              </div>
            )}
          </div>
       </div>

       {/* Breadcrumb */}
       <div className="px-6 border-b border-[#F1F1EF] pb-2 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
             {breadcrumb.map((b, i) => (
               <React.Fragment key={i}>
                 <div 
                   onClick={() => handleBreadcrumbClick(i)} 
                   className={`flex items-center gap-1 text-[12px] whitespace-nowrap cursor-pointer transition-colors ${i === breadcrumb.length - 1 ? 'text-[#37352F] font-bold underline decoration-[#EDECE9] underline-offset-4' : 'text-[#7A776E]'}`}
                 >
                   {i === 0 && <User size={12} className="text-blue-400" />}
                   {isEditingWorkspace && i === 0 && currentId === null ? (
                     <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                       <input 
                         autoFocus 
                         className="bg-slate-50 outline-none px-1 rounded border border-blue-200 w-24"
                         value={tempWorkspaceName}
                         onChange={e => setTempWorkspaceName(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && saveWorkspaceName()}
                       />
                       <Check size={14} className="text-green-500 shrink-0" onClick={saveWorkspaceName} />
                     </div>
                   ) : (
                     <span className="flex items-center gap-1">
                       {b.name}
                       {i === 0 && currentId === null && !isSelectionMode && <Edit2 size={10} className="opacity-40" />}
                     </span>
                   )}
                 </div>
                 {i < breadcrumb.length - 1 && <span className="text-[#D3D2CE] text-[10px] px-0.5">/</span>}
               </React.Fragment>
             ))}
          </div>
       </div>

       {/* Content List */}
       <div className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="space-y-1">
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <div 
                 key={item._id} 
                 onClick={() => handleNavigate(item)}
                 className={`group flex items-center justify-between py-3 px-3 rounded-2xl transition-all cursor-pointer hover:bg-[#F7F6F3] ${selectedIds.has(item._id) ? 'bg-[#F1F1EF]' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {isSelectionMode && !isMoveTargetMode && (
                      <div onClick={(e) => { e.stopPropagation(); toggleSelection(item._id); }} className="text-blue-500">
                        {selectedIds.has(item._id) ? <CheckCircle2 size={18}/> : <Circle size={18} className="text-[#D3D2CE]"/>}
                      </div>
                    )}
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div className="flex flex-col min-w-0">
                       <span className="text-[15px] text-[#37352F] font-medium truncate">{item.name}</span>
                       {searchQuery && <span className="text-[10px] text-[#D3D2CE] truncate">{getFullPath(item.parentId)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                     {getChildCount(item._id) > 0 && !isSelectionMode && (
                       <span className="text-[11px] font-bold text-[#7A776E] bg-[#F1F1EF] px-2 py-0.5 rounded-md min-w-[20px] text-center">{getChildCount(item._id)}</span>
                     )}
                     {!isSelectionMode && (
                       <button onClick={(e) => openItemActions(e, item)} className="p-2 text-[#D3D2CE] hover:text-[#37352F] transition-colors"><MoreHorizontal size={16}/></button>
                     )}
                     <ChevronRight size={16} className="text-[#D3D2CE]" />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center pt-32 text-center opacity-30">
                 <Wind size={32} className="mb-4" />
                 <p className="text-sm font-medium">暂无内容</p>
              </div>
            )}
          </div>
       </div>

       {/* Action Sheet Overlay */}
       {activeActionItem && !isEditModalOpen && !isDeleteConfirmOpen && (
         <div className="absolute inset-0 z-50 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setActiveActionItem(null)}></div>
           <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-2xl p-8 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center gap-4 mb-8 border-b border-[#F1F1EF] pb-5">
                <span className="text-4xl">{activeActionItem.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] text-[#7A776E] font-bold uppercase tracking-widest mb-1">正在操作</div>
                  <div className="text-lg font-bold text-[#37352F] truncate">{activeActionItem.name}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                 <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-4 w-full p-4 rounded-2xl hover:bg-[#F7F6F3] text-sm text-[#37352F] font-bold transition-colors">
                   <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center"><Edit3 size={20}/></div>
                   重命名 / 改图标
                 </button>
                 <button onClick={() => { setIsSelectionMode(true); toggleSelection(activeActionItem._id); setActiveActionItem(null); }} className="flex items-center gap-4 w-full p-4 rounded-2xl hover:bg-[#F7F6F3] text-sm text-[#37352F] font-bold transition-colors">
                   <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><Move size={20}/></div>
                   移动到其他位置
                 </button>
                 <button onClick={() => setIsDeleteConfirmOpen(true)} className="flex items-center gap-4 w-full p-4 rounded-2xl hover:bg-red-50 text-sm text-red-600 font-bold transition-colors">
                   <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center"><Trash2 size={20}/></div>
                   永久删除
                 </button>
              </div>
              <button onClick={() => setActiveActionItem(null)} className="mt-6 w-full py-4 text-[12px] font-black text-[#D3D2CE] uppercase tracking-widest">关闭</button>
           </div>
         </div>
       )}

       {/* Footer Actions */}
       <div className="bg-white border-t border-[#F1F1EF] pb-10">
          {isSelectionMode && !isMoveTargetMode ? (
             <div className="p-6 flex gap-4 animate-in slide-in-from-bottom duration-200">
                <button onClick={() => setIsMoveTargetMode(true)} className="flex-1 py-4 bg-[#37352F] text-white rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95">
                  <Move size={16}/> 移动到
                </button>
                <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="px-8 py-4 bg-[#F7F6F3] text-[#7A776E] rounded-2xl text-[13px] font-bold">取消</button>
             </div>
          ) : isMoveTargetMode ? (
            <div className="p-6 flex gap-4 animate-in slide-in-from-bottom duration-200 bg-blue-50">
                <button onClick={confirmMove} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-md">移动到此处 <MapPin size={16}/></button>
                <button onClick={() => setIsMoveTargetMode(false)} className="px-8 py-4 bg-white text-[#7A776E] border border-blue-100 rounded-2xl text-[13px] font-bold">取消</button>
            </div>
          ) : (
             <div className="p-6 flex justify-between items-center">
                <button onClick={() => setIsStatsOpen(true)} className="w-12 h-12 flex items-center justify-center text-[#D3D2CE] hover:text-[#37352F] transition-colors"><Hash size={24} /></button>
                <button 
                  onClick={() => { setIsAddModalOpen(true); setEditName(''); setEditEmoji('📦'); }}
                  className="w-14 h-14 bg-[#37352F] text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                >
                  <Plus size={28} />
                </button>
             </div>
          )}
       </div>

       {/* Modals */}
       {isStatsOpen && (
         <div className="absolute inset-0 z-[60] animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => setIsStatsOpen(false)}></div>
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-2xl p-10 animate-in slide-in-from-bottom duration-300">
               <div className="flex justify-between items-center mb-8">
                  <h4 className="font-bold text-[11px] uppercase tracking-widest text-[#7A776E]">统计详情</h4>
                  <button onClick={() => setIsStatsOpen(false)} className="p-2 text-[#D3D2CE]"><X size={20}/></button>
               </div>
               <div className="space-y-8">
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-500 font-bold text-xl">#</div>
                     <div>
                        <div className="text-[11px] text-[#7A776E] font-bold uppercase tracking-tight">总计内容</div>
                        <div className="text-2xl font-bold text-[#37352F]">{getTotalChildrenCount(currentId)} <span className="text-sm font-normal text-[#7A776E]">件</span></div>
                     </div>
                  </div>
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-amber-500"><Calendar size={24}/></div>
                     <div>
                        <div className="text-[11px] text-[#7A776E] font-bold uppercase tracking-tight">创建时间</div>
                        <div className="text-sm font-semibold text-[#37352F]">
                           {currentId ? new Date(items.find(i => i._id === currentId)?.createdAt || 0).toLocaleDateString() : '初始工作区'}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
       )}

      {/* Add / Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[4px] z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl border border-[#EDECE9] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-xl text-[#37352F]">{isEditModalOpen ? '编辑信息' : '你想添加什么？'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-[#D3D2CE]"><X size={28}/></button>
            </div>
            <div className="space-y-10">
              <div className="grid grid-cols-5 gap-3">
                {['📄', '📦', '🏠', '💡', '🧥', '📚', '💻', '🧥', '🧶', '👝'].map(e => (
                  <button key={e} onClick={() => setEditEmoji(e)} className={`text-3xl p-2 rounded-2xl transition-all ${editEmoji === e ? 'bg-[#F7F6F3] border border-[#EDECE9] scale-110' : 'opacity-20 hover:opacity-100'}`}>{e}</button>
                ))}
              </div>
              <input 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                placeholder="输入名称..." 
                className="w-full border-b-2 border-[#F1F1EF] py-3 text-xl outline-none focus:border-[#37352F] transition-colors font-bold text-[#37352F]" 
                autoFocus
              />
              <button onClick={isEditModalOpen ? handleUpdateItem : handleSaveNewItem} disabled={!editName} className="w-full bg-[#37352F] disabled:bg-[#F1F1EF] text-white py-5 rounded-[24px] font-bold text-sm shadow-xl active:scale-95 transition-all">
                {isEditModalOpen ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && activeActionItem && (
        <div className="fixed inset-0 bg-red-900/10 backdrop-blur-[4px] z-[110] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xs rounded-[40px] p-10 shadow-2xl border border-red-50 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[30px] flex items-center justify-center mx-auto mb-8">
              <Trash2 size={40} />
            </div>
            <h4 className="text-center text-lg font-bold text-[#37352F] mb-3">确定删除吗？</h4>
            <p className="text-center text-sm text-[#7A776E] leading-relaxed mb-10">
              这将永久从云端删除 <span className="font-bold text-[#37352F]">"{activeActionItem.name}"</span> 
              {getChildCount(activeActionItem._id) > 0 && ` 及其内部所有内容`}。
            </p>
            <div className="space-y-3">
              <button onClick={handleDeleteItem} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-sm shadow-xl">确认删除</button>
              <button onClick={() => { setIsDeleteConfirmOpen(false); setActiveActionItem(null); }} className="w-full py-4 text-[#D3D2CE] font-bold text-sm">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
