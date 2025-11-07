import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import type { PartyEvent, Photo, Theme, MenuCategory, MenuItem, OracleQuery } from '../types';
import * as adminService from '../services/adminService';

interface AdminPanelProps {
  events: PartyEvent[];
  theme: Theme;
  pendingPhotos: Photo[];
  approvedPhotos: Photo[];
  menu: MenuCategory[];
  oracleHistory: OracleQuery[];
  onEventsChange: (events: PartyEvent[], coverImageFile?: File | null, eventIdToUpdate?: string) => void;
  onHeroImageChange: (imageFile: File) => void;
  onThemeChange: (theme: Theme) => void;
  onThemeReset: () => void;
  onPhotosChange: () => void;
  onMenuChange: (menu: MenuCategory[]) => void;
}

const emptyEvent: Omit<PartyEvent, 'id' | 'coverImagePath' | 'status'> = { title: '', date: '', time: '', description: '', mapLink: '' };
const emptyMenuItem: Omit<MenuItem, 'id'> = { name: '', description: '', price: '' };

const Section: React.FC<{title: string; children: React.ReactNode; className?: string}> = ({title, children, className}) => (
    <div className={`bg-black/40 p-6 rounded-lg shadow-md border border-white/10 ${className}`}>
        <h2 className="text-2xl font-semibold mb-4 text-glow font-display" style={{color: 'var(--primary-color)'}}>{title}</h2>
        {children}
    </div>
);

const PhotoManagementModal: React.FC<{
    photos: Photo[];
    onClose: () => void;
    onDelete: (photoIds: string[]) => void;
}> = ({ photos, onClose, onDelete }) => {
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

    const toggleSelection = (photoId: string) => {
        setSelectedPhotoIds(prev =>
            prev.includes(photoId)
                ? prev.filter(id => id !== photoId)
                : [...prev, photoId]
        );
    };
    
    const handleDelete = () => {
        if (selectedPhotoIds.length === 0) {
            alert("Nenhuma foto selecionada.");
            return;
        }
        onDelete(selectedPhotoIds);
        setSelectedPhotoIds([]);
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] p-6 rounded-lg shadow-lg w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-glow font-display" style={{color: 'var(--primary-color)'}}>Gerenciar Fotos Aprovadas</h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white text-3xl">&times;</button>
                </div>
                <div className="flex-grow grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto p-2">
                    {photos.map(photo => {
                        const imageBase64 = adminService.getPhotoImage(photo.path);
                        const isSelected = selectedPhotoIds.includes(photo.id);
                        if (!imageBase64) return null;
                        return (
                            <div key={photo.id} className="relative aspect-square cursor-pointer group" onClick={() => toggleSelection(photo.id)}>
                                <img src={`data:image/jpeg;base64,${imageBase64}`} alt={`Foto de ${photo.uploaderName}`} className="rounded-lg w-full h-full object-cover"/>
                                <div className={`absolute inset-0 rounded-lg transition-all ${isSelected ? 'bg-black/50 ring-4 ring-[var(--primary-color)]' : 'bg-black/0 group-hover:bg-black/30'}`}></div>
                                {isSelected && <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--primary-color)] rounded-full text-black flex items-center justify-center font-bold">✓</div>}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 flex justify-end">
                    <button 
                        onClick={handleDelete}
                        disabled={selectedPhotoIds.length === 0}
                        className="font-bold bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        Deletar {selectedPhotoIds.length > 0 ? `(${selectedPhotoIds.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};


const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { onEventsChange, onHeroImageChange, onThemeChange, onThemeReset, onPhotosChange, onMenuChange } = props;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventFormData, setEventFormData] = useState(emptyEvent);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [localMenu, setLocalMenu] = useState<MenuCategory[]>(props.menu);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [menuItemFormData, setMenuItemFormData] = useState(emptyMenuItem);
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  useEffect(() => { setLocalMenu(props.menu); }, [props.menu]);

  useEffect(() => {
    const particleBg = document.getElementById('particle-background');
    if (particleBg) particleBg.style.display = 'none';
    return () => { if (particleBg) particleBg.style.display = 'block'; };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const credentials = adminService.getAdminCredentials();
    if (username === credentials.username && password === credentials.password) setIsAuthenticated(true);
    else setError('Usuário ou senha incorretos.');
  };

  const handleEventFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEventFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setCoverImageFile(e.target.files[0]);
  };

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setHeroImageFile(e.target.files[0]);
    }
  };

  const handleHeroImageSave = () => {
    if (heroImageFile) {
        onHeroImageChange(heroImageFile);
        setHeroImageFile(null); // Clear after upload
    } else {
        alert("Por favor, selecione uma imagem.");
    }
  };

  const handleEventFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let updatedEvents;
    const eventId = editingEventId || `event-${new Date().toISOString()}`;
    
    if (editingEventId) {
      updatedEvents = props.events.map(ev => ev.id === editingEventId ? { ...ev, ...eventFormData } : ev);
    } else {
      const newEvent: PartyEvent = { ...eventFormData, id: eventId, status: 'scheduled' };
      updatedEvents = [...props.events, newEvent];
    }

    onEventsChange(updatedEvents, coverImageFile, eventId);
    setEditingEventId(null);
    setEventFormData(emptyEvent);
    setCoverImageFile(null);
  };
  
  const handleEditEvent = (event: PartyEvent) => {
      setEditingEventId(event.id);
      setEventFormData({ title: event.title, date: event.date, time: event.time, description: event.description, mapLink: event.mapLink });
      setCoverImageFile(null);
  };

  const cancelEditEvent = () => { setEditingEventId(null); setEventFormData(emptyEvent); setCoverImageFile(null); };
  
  const handleDeleteEvent = (eventId: string) => {
    const pendingCount = props.pendingPhotos.filter(p => p.eventId === eventId).length;
    const approvedCount = props.approvedPhotos.filter(p => p.eventId === eventId).length;
    const totalPhotos = pendingCount + approvedCount;
    
    let confirmMessage = 'Tem certeza que deseja deletar este evento? Esta ação não pode ser desfeita.';
    if (totalPhotos > 0) {
        confirmMessage = `Este evento tem ${totalPhotos} foto(s). Deletar o evento também irá remover TODAS as suas fotos. Tem certeza?`;
    }

    if (window.confirm(confirmMessage)) {
        if (totalPhotos > 0) {
            adminService.deletePhotosForEvent(eventId, 'approved');
            adminService.deletePhotosForEvent(eventId, 'pending');
            onPhotosChange();
        }
        onEventsChange(props.events.filter(ev => ev.id !== eventId));
        alert('Evento deletado com sucesso.');
    }
  };

  const handleToggleCancelEvent = (eventId: string) => {
    const updatedEvents = props.events.map(event => {
        if (event.id === eventId) {
            return { ...event, status: event.status === 'cancelled' ? 'scheduled' : 'cancelled' };
        }
        return event;
    });
    onEventsChange(updatedEvents);
  };
  
  const handleApprovePhoto = (photoId: string) => { adminService.approvePhoto(photoId); onPhotosChange(); };
  const handleRejectPhoto = (photoId: string) => { if (window.confirm('Tem certeza?')) { adminService.rejectPhoto(photoId); onPhotosChange(); } };
  
  const handleDeleteSelectedPhotos = (photoIds: string[]) => {
    if (photoIds.length === 0) return;
    if (window.confirm(`Tem certeza que deseja deletar permanentemente ${photoIds.length} foto(s) aprovada(s)?`)) {
        adminService.deleteApprovedPhotos(photoIds);
        onPhotosChange();
    }
  };


  const handleAiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        const reader = new FileReader();
        reader.onloadend = () => setAiImage((reader.result as string).split(',')[1]);
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleGenerateTheme = async () => {
    if (!aiPrompt && !aiImage) return alert("Forneça um prompt de texto ou uma imagem.");
    setIsGeneratingTheme(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const instruction = "Analise o prompt e/ou a imagem e gere um objeto JSON com um tema CSS para um site de boate: 'primaryColor' (neon), 'secondaryColor' (neon), 'backgroundColor' (escuro), 'fontFamily' (Google Font), 'glowEffectCss' (text-shadow CSS). Prompt:";
        const parts: any[] = [{ text: instruction }, { text: aiPrompt }];
        if (aiImage) parts.push({ inlineData: { mimeType: 'image/jpeg', data: aiImage } });
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        primaryColor: { type: Type.STRING },
                        secondaryColor: { type: Type.STRING },
                        backgroundColor: { type: Type.STRING },
                        fontFamily: { type: Type.STRING },
                        glowEffectCss: { type: Type.STRING },
                    },
                    required: ["primaryColor", "secondaryColor", "backgroundColor", "fontFamily", "glowEffectCss"]
                }
            }
        });
        onThemeChange(JSON.parse(response.text));
        alert("Tema gerado e aplicado!");
    } catch (error) {
        console.error("Erro ao gerar tema:", error);
        alert("Ocorreu um erro ao gerar o tema.");
    } finally { setIsGeneratingTheme(false); }
  };
  
  const handleSaveMenu = () => { onMenuChange(localMenu); alert('Cardápio salvo!'); };
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setLocalMenu([...localMenu, { id: `cat-${Date.now()}`, name: newCategoryName, items: [] }]);
    setNewCategoryName("");
  };
  const handleDeleteCategory = (catId: string) => {
    if (window.confirm('Deletar categoria e todos os seus itens?')) {
        setLocalMenu(localMenu.filter(c => c.id !== catId));
    }
  };
  const handleMenuItemFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setMenuItemFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }
  const handleSaveMenuItem = (categoryId: string) => {
    const category = localMenu.find(c => c.id === categoryId);
    if (!category) return;
    let updatedItems;
    if (editingItemId) {
        updatedItems = category.items.map(item => item.id === editingItemId ? { ...menuItemFormData, id: editingItemId } : item);
    } else {
        updatedItems = [...category.items, { ...menuItemFormData, id: `item-${Date.now()}` }];
    }
    const updatedMenu = localMenu.map(c => c.id === categoryId ? { ...c, items: updatedItems } : c);
    setLocalMenu(updatedMenu);
    setEditingItemId(null);
    setEditingCategoryId(null);
    setMenuItemFormData(emptyMenuItem);
  };
  const handleEditMenuItem = (item: MenuItem, categoryId: string) => {
      setEditingItemId(item.id);
      setEditingCategoryId(categoryId);
      setMenuItemFormData({ name: item.name, description: item.description, price: item.price });
  };
  const handleDeleteMenuItem = (itemId: string, categoryId: string) => {
      const updatedMenu = localMenu.map(c => {
          if (c.id === categoryId) return { ...c, items: c.items.filter(item => item.id !== itemId) };
          return c;
      });
      setLocalMenu(updatedMenu);
  };
  
  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPassword || newPassword !== confirmPassword) {
          alert("As senhas não conferem ou estão em branco.");
          return;
      }
      if (newPassword.length < 4) {
          alert("A senha deve ter pelo menos 4 caracteres.");
          return;
      }
      const creds = adminService.getAdminCredentials();
      adminService.saveAdminCredentials({ ...creds, password: newPassword });
      alert("Senha alterada com sucesso!");
      setNewPassword('');
      setConfirmPassword('');
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background-color)] text-white p-4">
        <div className="p-8 bg-black/30 backdrop-blur-md rounded-lg shadow-lg w-full max-w-sm neon-border">
          <h1 className="text-3xl font-bold mb-6 text-center text-glow font-display" style={{color: 'var(--primary-color)'}}>Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-white/70 mb-2" htmlFor="username">Usuário</label>
              <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent" style={{'--tw-ring-color': 'var(--primary-color)'} as React.CSSProperties}/>
            </div>
            <div className="mb-6">
              <label className="block text-white/70 mb-2" htmlFor="password">Senha</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent" style={{'--tw-ring-color': 'var(--primary-color)'} as React.CSSProperties}/>
            </div>
            {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
            <button type="submit" className="w-full font-bold bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-black py-2 rounded-lg hover:scale-105 transition-transform" style={{boxShadow: '0 0 20px var(--primary-color)'}}>Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)] text-white p-4 sm:p-8">
      {isPhotoManagerOpen && <PhotoManagementModal photos={props.approvedPhotos} onClose={() => setIsPhotoManagerOpen(false)} onDelete={handleDeleteSelectedPhotos} />}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-glow font-logo" style={{color: 'var(--primary-color)'}}>Painel de Administração</h1>
            <Link to="/" className="text-[var(--secondary-color)] hover:underline text-glow">&larr; Voltar para o site</Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            {/* Coluna Principal - Gestão de Eventos e Cardápio */}
            <div className="xl:col-span-2 space-y-8">
                <Section title="Gerenciar Eventos">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <form onSubmit={handleEventFormSubmit} className="space-y-4">
                            <h3 className="text-xl font-medium text-[var(--secondary-color)] text-glow">{editingEventId ? 'Editar Evento' : 'Novo Evento'}</h3>
                            <input name="title" placeholder="Título" value={eventFormData.title} onChange={handleEventFormChange} required className="w-full p-2 bg-black/50 rounded"/>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" name="date" value={eventFormData.date} onChange={handleEventFormChange} required className="w-full p-2 bg-black/50 rounded"/>
                                <input name="time" placeholder="Horário" value={eventFormData.time} onChange={handleEventFormChange} required className="p-2 bg-black/50 rounded"/>
                            </div>
                            <textarea name="description" placeholder="Descrição" value={eventFormData.description} onChange={handleEventFormChange} required className="w-full p-2 bg-black/50 rounded"/>
                            <input name="mapLink" placeholder="Link do Google Maps" value={eventFormData.mapLink} onChange={handleEventFormChange} className="w-full p-2 bg-black/50 rounded"/>
                            <div>
                                <label className="text-sm text-white/70">Capa do Evento (Opcional)</label>
                                <input type="file" onChange={handleCoverImageChange} accept="image/*" className="w-full text-sm file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-white/10 file:text-white/80 mt-1"/>
                            </div>
                            <div className="flex gap-4">
                                <button type="submit" className="font-bold bg-[var(--primary-color)] text-black py-2 px-4 rounded-lg">{editingEventId ? 'Atualizar' : 'Adicionar'}</button>
                                {editingEventId && <button type="button" onClick={cancelEditEvent} className="font-bold bg-white/20 text-white py-2 px-4 rounded-lg">Cancelar</button>}
                            </div>
                        </form>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {props.events.map(event => {
                                const isPast = new Date(event.date + 'T00:00:00') < new Date(new Date().toDateString());
                                const pendingCount = props.pendingPhotos.filter(p => p.eventId === event.id).length;
                                const approvedCount = props.approvedPhotos.filter(p => p.eventId === event.id).length;
                                return (
                                <div key={event.id} className="p-3 bg-black/30 rounded-md flex flex-col gap-2">
                                    <div>
                                        <p className="font-bold">{event.title}</p>
                                        <p className="text-xs text-white/60">Fotos: {approvedCount} aprovadas, {pendingCount} pendentes</p>
                                        {event.status === 'cancelled' && <span className="text-xs text-red-400 font-bold">CANCELADO</span>}
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => handleEditEvent(event)} className="text-sm bg-[var(--secondary-color)] text-black font-bold py-1 px-3 rounded">Editar</button>
                                        {!isPast && (
                                        <button onClick={() => handleToggleCancelEvent(event.id)} className={`text-sm font-bold py-1 px-3 rounded ${event.status === 'cancelled' ? 'bg-yellow-500 text-black' : 'bg-orange-500 text-white'}`}>
                                            {event.status === 'cancelled' ? 'Reativar' : 'Cancelar'}
                                        </button>
                                        )}
                                        <button onClick={() => handleDeleteEvent(event.id)} className="text-sm bg-red-600 text-white font-bold py-1 px-3 rounded">Deletar</button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </Section>
                 <Section title="Gerenciar Cardápio">
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                        {localMenu.map(cat => (
                            <div key={cat.id} className="p-4 bg-black/20 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold text-[var(--secondary-color)]">{cat.name}</h3>
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-400 text-xs">Deletar Categoria</button>
                                </div>
                                <div className="space-y-2 mb-4">
                                    {cat.items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-2 bg-black/30 rounded">
                                            <span>{item.name} - {item.price}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditMenuItem(item, cat.id)} className="text-xs bg-white/20 py-1 px-2 rounded">Editar</button>
                                                <button onClick={() => handleDeleteMenuItem(item.id, cat.id)} className="text-xs bg-red-600/50 py-1 px-2 rounded">Remover</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {editingCategoryId === cat.id ? (
                                    <div className="p-3 bg-black/40 rounded-md space-y-2">
                                        <input name="name" placeholder="Nome do Item" value={menuItemFormData.name} onChange={handleMenuItemFormChange} className="w-full p-2 bg-black/50 rounded"/>
                                        <input name="description" placeholder="Descrição" value={menuItemFormData.description} onChange={handleMenuItemFormChange} className="w-full p-2 bg-black/50 rounded"/>
                                        <input name="price" placeholder="Preço (Ex: R$ 25,00)" value={menuItemFormData.price} onChange={handleMenuItemFormChange} className="w-full p-2 bg-black/50 rounded"/>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleSaveMenuItem(cat.id)} className="bg-[var(--secondary-color)] text-black text-sm font-bold p-2 rounded">Salvar Item</button>
                                            <button onClick={() => { setEditingCategoryId(null); setEditingItemId(null); setMenuItemFormData(emptyMenuItem); }} className="bg-white/20 text-sm p-2 rounded">Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => handleEditMenuItem(emptyMenuItem as MenuItem, cat.id)} className="text-sm text-[var(--primary-color)]">+ Adicionar Item</button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 p-4 bg-black/20 rounded-lg flex gap-4">
                        <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nome da nova categoria" className="flex-grow p-2 bg-black/50 rounded" />
                        <button onClick={handleAddCategory} className="font-bold bg-[var(--primary-color)] text-black py-2 px-4 rounded-lg">Adicionar Categoria</button>
                    </div>
                    <button onClick={handleSaveMenu} className="w-full mt-6 font-bold bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-lg hover:scale-105 transition-transform">SALVAR ALTERAÇÕES NO CARDÁPIO</button>
                </Section>
                <Section title="Histórico do Oráculo" className="max-h-[600px] flex flex-col">
                    <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                        {props.oracleHistory.map((query, index) => (
                            <details key={index} className="bg-black/20 rounded-lg">
                                <summary className="p-3 cursor-pointer text-white/80 font-semibold list-none">
                                    <span className="font-normal text-xs text-white/50">{new Date(query.date).toLocaleString('pt-BR')}</span> - {query.feeling.substring(0, 50)}...
                                </summary>
                                <div className="p-4 border-t border-white/10 text-sm">
                                    <p className="mb-2"><strong className="text-[var(--secondary-color)]">Sentimento:</strong> {query.feeling}</p>
                                    <div className="bg-black/30 p-3 rounded">
                                        <p><strong className="text-[var(--primary-color)]">Drink:</strong> {query.result.drinkName}</p>
                                        <p className="italic text-white/70 text-xs mt-1">"{query.result.story}"</p>
                                        <p className="mt-2"><strong className="text-[var(--primary-color)]">Conselho:</strong> {query.result.advice}</p>
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                </Section>
            </div>
             {/* Coluna Secundária - Configurações e Fotos */}
            <div className="xl:col-span-1 space-y-8">
                 <Section title="Moderação de Fotos">
                     <div className="grid grid-cols-1 gap-8">
                        <div>
                            <h3 className="text-xl mb-4">Pendentes ({props.pendingPhotos.length})</h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {props.pendingPhotos.map(photo => {
                                 const imageBase64 = adminService.getPhotoImage(photo.path);
                                 const event = props.events.find(e => e.id === photo.eventId);
                                 return imageBase64 ? (
                                    <div key={photo.id} className="bg-black/30 p-3 rounded-lg">
                                        <img src={`data:image/jpeg;base64,${imageBase64}`} className="w-full h-40 object-cover rounded-md mb-2" alt=""/>
                                        <p className="text-sm font-bold text-white/80">{photo.uploaderName}</p>
                                        <p className="text-xs text-white/60 mb-2">Evento: {event ? event.title : 'Desconhecido'}</p>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => handleApprovePhoto(photo.id)} className="w-full text-sm bg-green-500 font-bold py-1 px-3 rounded">Aprovar</button>
                                            <button onClick={() => handleRejectPhoto(photo.id)} className="w-full text-sm bg-red-600 font-bold py-1 px-3 rounded">Rejeitar</button>
                                        </div>
                                    </div>
                                ) : null;
                            })}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl">Aprovadas ({props.approvedPhotos.length})</h3>
                                <button onClick={() => setIsPhotoManagerOpen(true)} className="text-sm bg-blue-600 text-white font-bold py-1 px-3 rounded">Gerenciar Fotos</button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2">
                            {props.approvedPhotos.map(photo => {
                                 const imageBase64 = adminService.getPhotoImage(photo.path);
                                 return imageBase64 ? (
                                     <div key={photo.id} className="aspect-square">
                                        <img src={`data:image/jpeg;base64,${imageBase64}`} className="w-full h-full object-cover rounded-md" alt=""/>
                                    </div>
                                 ) : null;
                            })}
                            </div>
                        </div>
                     </div>
                </Section>
                <Section title="Configurações e Tema">
                    <details className="bg-black/20 rounded-lg">
                        <summary className="font-semibold text-lg cursor-pointer p-3 list-none text-[var(--secondary-color)]">Alterar Senha</summary>
                        <form onSubmit={handlePasswordChange} className="space-y-4 p-4 border-t border-white/10">
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nova Senha" required className="w-full p-2 bg-black/50 rounded"/>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmar Nova Senha" required className="w-full p-2 bg-black/50 rounded"/>
                            <button type="submit" className="font-bold text-black py-2 px-4 rounded-lg bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] hover:scale-105 transition-transform text-sm">Salvar Senha</button>
                        </form>
                    </details>
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-[var(--secondary-color)]">Imagem do Topo</h3>
                        <input type="file" onChange={handleHeroImageChange} accept="image/*" className="w-full text-sm file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-white/10 file:text-white/80 mt-1"/>
                        <button onClick={handleHeroImageSave} className="mt-4 font-bold text-black py-2 px-4 rounded-lg bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] hover:scale-105 transition-transform text-sm">Salvar Imagem</button>
                    </div>
                     <div className="mt-6">
                        <h3 className="text-lg font-semibold text-[var(--secondary-color)] mb-2">Personalizar Tema com IA</h3>
                        <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Descreva o tema (ex: cyberpunk com neon azul)" rows={3} className="w-full p-2 bg-black/50 border border-white/20 rounded-lg"></textarea>
                        <input type="file" onChange={handleAiImageUpload} accept="image/*" className="w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary-color)] file:text-black mt-4"/>
                        {aiImage && <img src={`data:image/jpeg;base64,${aiImage}`} alt="Preview" className="max-h-32 rounded-lg mt-4" />}
                        <div className="flex gap-4 mt-4">
                            <button onClick={handleGenerateTheme} disabled={isGeneratingTheme} className="w-full font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:scale-105 transition-transform disabled:opacity-50">
                                {isGeneratingTheme ? 'Gerando...' : 'Gerar'}
                            </button>
                            <button onClick={onThemeReset} className="w-full font-bold bg-white/20 text-white py-2 px-4 rounded-lg hover:bg-white/30 transition-colors">Redefinir</button>
                        </div>
                    </div>
                </Section>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;