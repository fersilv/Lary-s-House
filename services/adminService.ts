import type { PartyEvent, Photo, Theme, MenuCategory, OracleQuery, AdminCredentials } from '../types';
import * as fs from './fileSystemApi';

// Virtual file paths
const EVENTS_PATH = 'database/events.json';
const THEME_PATH = 'database/theme.json';
const PENDING_PHOTOS_PATH = 'database/pending_photos.json';
const APPROVED_PHOTOS_PATH = 'database/approved_photos.json';
const MENU_PATH = 'database/menu.json';
const ORACLE_HISTORY_PATH = 'database/oracle_history.json';
const ADMIN_CREDENTIALS_PATH = 'database/admin_credentials.json';
const HERO_IMAGE_PATH = 'database/hero_image.json';


const defaultEvents: PartyEvent[] = [
  {
    id: 'festa-neon',
    title: 'Festa Neon',
    date: '2024-09-28',
    time: '22:00',
    description: 'Vista sua melhor roupa branca e venha brilhar na nossa festa neon com tintas, luz negra e os melhores DJs da região.',
    mapLink: 'https://maps.app.goo.gl/abcdef123456',
    status: 'scheduled'
  },
  {
    id: 'sertanejo-universitario',
    title: 'Sertanejo Universitário',
    date: '2024-10-04',
    time: '23:00',
    description: 'Uma noite dedicada ao melhor do sertanejo, com show ao vivo e promoção de combo de cerveja.',
    mapLink: 'https://maps.app.goo.gl/abcdef123456',
    status: 'scheduled'
  }
];

export const defaultTheme: Theme = {
  primaryColor: '#ff00ff',
  secondaryColor: '#00ffff',
  backgroundColor: '#100320',
  fontFamily: "'Poppins', sans-serif",
  glowEffectCss: '0 0 3px #ff00ff, 0 0 1px #ff00ff',
  heroImage: null
};

const defaultMenu: MenuCategory[] = [
    {
        id: 'cat-1',
        name: 'Drinks Clássicos',
        items: [
            { id: 'item-1', name: 'Gin Tônica', description: 'Gin, água tônica, limão e especiarias.', price: 'R$ 25,00' },
            { id: 'item-2', name: 'Caipirinha', description: 'Cachaça, limão, açúcar e gelo.', price: 'R$ 20,00' },
        ]
    },
    {
        id: 'cat-2',
        name: 'Porções',
        items: [
            { id: 'item-3', name: 'Batata Frita', description: 'Porção de batata frita crocante com cheddar e bacon.', price: 'R$ 30,00' },
        ]
    }
];

// Initialize file system with defaults if they don't exist
fs.initializeFileSystem({
    [EVENTS_PATH]: defaultEvents,
    [THEME_PATH]: defaultTheme,
    [PENDING_PHOTOS_PATH]: [],
    [APPROVED_PHOTOS_PATH]: [],
    [MENU_PATH]: defaultMenu,
    [ORACLE_HISTORY_PATH]: [],
    [ADMIN_CREDENTIALS_PATH]: { username: 'admin', password: 'admin' },
    [HERO_IMAGE_PATH]: null
});

// Events
export const getEvents = (): PartyEvent[] => fs.readJsonFile<PartyEvent[]>(EVENTS_PATH);
export const saveEvents = (events: PartyEvent[]): void => fs.writeJsonFile(EVENTS_PATH, events);

// Event Cover Image
export const saveCoverImage = (eventId: string, base64Data: string): string => {
    const path = `images/covers/${eventId}-${Date.now()}.jpg`;
    fs.writeImage(path, base64Data);
    return path;
}

// Hero Image
export const getHeroImage = (): string | null => fs.readJsonFile<string | null>(HERO_IMAGE_PATH);
export const saveHeroImage = (base64: string): void => fs.writeJsonFile(HERO_IMAGE_PATH, base64);


// Theme
export const getTheme = (): Theme => fs.readJsonFile<Theme>(THEME_PATH);
export const saveTheme = (theme: Theme): void => fs.writeJsonFile(THEME_PATH, theme);
export const getDefaultTheme = (): Theme => defaultTheme;

// Menu
export const getMenu = (): MenuCategory[] => fs.readJsonFile<MenuCategory[]>(MENU_PATH);
export const saveMenu = (menu: MenuCategory[]): void => fs.writeJsonFile(MENU_PATH, menu);

// Photos
export const getPendingPhotos = (): Photo[] => fs.readJsonFile<Photo[]>(PENDING_PHOTOS_PATH);
export const getApprovedPhotos = (): Photo[] => fs.readJsonFile<Photo[]>(APPROVED_PHOTOS_PATH);


export const addPendingPhotos = (photosData: Array<{ eventId: string; uploaderName: string; base64: string }>): void => {
  const pendingPhotos = getPendingPhotos();
  const newPhotos: Photo[] = [];

  photosData.forEach(photoData => {
    const photoId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const path = `images/${photoData.eventId}/${photoId}.jpg`;

    fs.writeImage(path, photoData.base64);

    newPhotos.push({
      id: photoId,
      eventId: photoData.eventId,
      uploaderName: photoData.uploaderName,
      path: path,
      status: 'pending'
    });
  });

  fs.writeJsonFile(PENDING_PHOTOS_PATH, [...pendingPhotos, ...newPhotos]);
};


export const approvePhoto = (photoId: string): void => {
  let pendingPhotos = getPendingPhotos();
  const photoToApprove = pendingPhotos.find(p => p.id === photoId);
  
  if (photoToApprove) {
    pendingPhotos = pendingPhotos.filter(p => p.id !== photoId);
    const approvedPhotos = getApprovedPhotos();
    photoToApprove.status = 'approved';
    fs.writeJsonFile(APPROVED_PHOTOS_PATH, [...approvedPhotos, photoToApprove]);
    fs.writeJsonFile(PENDING_PHOTOS_PATH, pendingPhotos);
  }
};

export const rejectPhoto = (photoId: string): void => {
    const currentPendingPhotos = getPendingPhotos();
    const photoToDelete = currentPendingPhotos.find(p => p.id === photoId);

    if (photoToDelete) {
        fs.deleteFile(photoToDelete.path);
        const updatedPendingPhotos = currentPendingPhotos.filter(p => p.id !== photoId);
        fs.writeJsonFile(PENDING_PHOTOS_PATH, updatedPendingPhotos);
    } else {
        console.warn(`Attempted to reject a photo with ID "${photoId}" but it was not found in the pending list.`);
    }
};

export const deleteApprovedPhotos = (photoIds: string[]): void => {
    let allPhotos = getApprovedPhotos();
    const photosToDelete = allPhotos.filter(p => photoIds.includes(p.id));
    
    if (photosToDelete.length > 0) {
        photosToDelete.forEach(photo => fs.deleteFile(photo.path));
        const remainingPhotos = allPhotos.filter(p => !photoIds.includes(p.id));
        fs.writeJsonFile(APPROVED_PHOTOS_PATH, remainingPhotos);
    }
};

export const deletePhotosForEvent = (eventId: string, status: 'approved' | 'pending'): void => {
    const sourceKey = status === 'approved' ? APPROVED_PHOTOS_PATH : PENDING_PHOTOS_PATH;
    let allPhotos = fs.readJsonFile<Photo[]>(sourceKey);
    const photosToDelete = allPhotos.filter(p => p.eventId === eventId);
    
    if (photosToDelete.length > 0) {
        photosToDelete.forEach(photo => fs.deleteFile(photo.path));
        const remainingPhotos = allPhotos.filter(p => p.eventId !== eventId);
        fs.writeJsonFile(sourceKey, remainingPhotos);
    }
};


export const getPhotoImage = (path: string): string | null => {
    return fs.readImage(path);
}

// Oracle History
export const getOracleHistory = (): OracleQuery[] => fs.readJsonFile<OracleQuery[]>(ORACLE_HISTORY_PATH);
export const saveOracleQuery = (query: Omit<OracleQuery, 'date'>): void => {
    const history = getOracleHistory();
    const newEntry: OracleQuery = { ...query, date: new Date().toISOString() };
    fs.writeJsonFile(ORACLE_HISTORY_PATH, [newEntry, ...history]);
};

// Admin Credentials
export const getAdminCredentials = (): AdminCredentials => fs.readJsonFile<AdminCredentials>(ADMIN_CREDENTIALS_PATH);
export const saveAdminCredentials = (creds: AdminCredentials): void => fs.writeJsonFile(ADMIN_CREDENTIALS_PATH, creds);