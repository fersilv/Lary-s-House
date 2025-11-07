export interface PartyEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format for easier logic
  time: string;
  description: string;
  mapLink: string;
  coverImagePath?: string; // Path to cover image in virtual file system
  status?: 'scheduled' | 'cancelled';
}

export interface Photo {
  id: string;
  eventId: string;
  uploaderName: string;
  path: string; // Path in the virtual file system, e.g., /images/event-id/photo-id.jpg
  status: 'pending' | 'approved';
}

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  glowEffectCss: string;
  heroImage?: string; // base64 encoded hero image
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface OracleQuery {
    feeling: string;
    result: any;
    date: string;
}

export interface AdminCredentials {
    username: string;
    password: string;
}