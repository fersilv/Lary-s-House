import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import MainSite from './components/MainSite';
import AdminPanel from './components/AdminPanel';
import * as adminService from './services/adminService';
import { resizeImage } from './services/imageService';
import type { PartyEvent, Photo, Theme, MenuCategory, OracleQuery } from './types';
import HeartIcon from './components/icons/HeartIcon';

const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background-color)]">
        <div className="relative flex items-center justify-center">
            <HeartIcon className="w-24 h-24 text-[var(--primary-color)] animate-pulse" />
            <HeartIcon className="w-48 h-48 text-[var(--primary-color)] absolute opacity-30 animate-ping" />
            <p className="absolute bottom-[-40px] font-logo text-glow text-white animate-pulse">Carregando...</p>
        </div>
    </div>
);


function App() {
  const [events, setEvents] = useState<PartyEvent[]>([]);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(adminService.getTheme());
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
  const [approvedPhotos, setApprovedPhotos] = useState<Photo[]>([]);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [oracleHistory, setOracleHistory] = useState<OracleQuery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setEvents(adminService.getEvents());
      setTheme(adminService.getTheme());
      setHeroImage(adminService.getHeroImage());
      setPendingPhotos(adminService.getPendingPhotos());
      setApprovedPhotos(adminService.getApprovedPhotos());
      setMenu(adminService.getMenu());
      setOracleHistory(adminService.getOracleHistory());
      setLoading(false);
    }, 1500);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--background-color', theme.backgroundColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--glow-effect-css', theme.glowEffectCss);
    
    const fontLink = document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com"]');
    if (fontLink) {
        const fontName = theme.fontFamily.split(',')[0].replace(/'/g, '').replace(' ', '+');
        fontLink.href = `https://fonts.googleapis.com/css2?family=Audiowide&family=Pacifico&family=${fontName}:wght@300;400;500;700&display=swap`;
    }
  }, [theme]);

  const refreshPhotos = () => {
      setPendingPhotos([...adminService.getPendingPhotos()]);
      setApprovedPhotos([...adminService.getApprovedPhotos()]);
  };
  
  const refreshOracleHistory = () => {
      setOracleHistory([...adminService.getOracleHistory()]);
  }

  const handleUpdateEvents = async (updatedEvents: PartyEvent[], coverImageFile?: File | null, eventIdToUpdate?: string) => {
    let eventsToSave = [...updatedEvents];

    if (coverImageFile && eventIdToUpdate) {
        try {
            const base64 = await resizeImage(coverImageFile);
            const coverImagePath = adminService.saveCoverImage(eventIdToUpdate, base64);
            
            eventsToSave = eventsToSave.map(event => 
                event.id === eventIdToUpdate ? { ...event, coverImagePath } : event
            );
        } catch (error) {
            console.error("Failed to resize and save cover image:", error);
            alert("Houve um erro ao processar a imagem da capa.");
        }
    }
    
    adminService.saveEvents(eventsToSave);
    setEvents(eventsToSave);
  };

  const handleUpdateHeroImage = async (imageFile: File) => {
    try {
        const base64 = await resizeImage(imageFile, 1920, 0.85); // Higher resolution for hero
        adminService.saveHeroImage(base64);
        setHeroImage(base64);
        alert("Imagem do topo salva com sucesso!");
    } catch(error) {
        console.error("Failed to save hero image:", error);
        alert("Houve um erro ao salvar a imagem do topo.");
    }
  };
  
  const handleUpdateTheme = (newTheme: Theme) => {
    adminService.saveTheme(newTheme);
    setTheme(newTheme);
  };
  
  const handleResetTheme = () => {
    const defaultTheme = adminService.getDefaultTheme();
    handleUpdateTheme(defaultTheme);
    alert("Tema redefinido para o padrão!");
  }

  const handleUpdateMenu = (newMenu: MenuCategory[]) => {
    adminService.saveMenu(newMenu);
    setMenu(newMenu);
  };
  
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/admin" element={
          <AdminPanel 
            events={events}
            theme={theme}
            pendingPhotos={pendingPhotos}
            approvedPhotos={approvedPhotos}
            menu={menu}
            oracleHistory={oracleHistory}
            onEventsChange={handleUpdateEvents}
            onHeroImageChange={handleUpdateHeroImage}
            onThemeChange={handleUpdateTheme}
            onThemeReset={handleResetTheme}
            onPhotosChange={refreshPhotos}
            onMenuChange={handleUpdateMenu}
          />
        } />
        <Route path="/" element={
            <MainSite 
                events={events} 
                heroImage={heroImage}
                approvedPhotos={approvedPhotos}
                menu={menu}
                oracleHistory={oracleHistory}
                onPhotoUpload={refreshPhotos}
                onOracleQuery={refreshOracleHistory}
            />
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;