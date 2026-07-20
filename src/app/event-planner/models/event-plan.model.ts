export enum MediaType {
  MUSIC = 'Música',
  VIDEO = 'Video',
  AUDIO = 'Audio',
  PRESENTATION = 'Presentación',
  ANIMATION = 'Animación',
  HORA_LOCA = 'Hora Loca',
  OTHER = 'Otro'
}

export const MEDIA_TYPES: string[] = [
  MediaType.MUSIC,
  MediaType.VIDEO,
  MediaType.AUDIO,
  MediaType.PRESENTATION,
  MediaType.ANIMATION,
  MediaType.HORA_LOCA,
  MediaType.OTHER
];

export const MEDIA_TYPE_ICONS: { [key: string]: string } = {
  [MediaType.MUSIC]: 'music_note',
  [MediaType.VIDEO]: 'videocam',
  [MediaType.AUDIO]: 'graphic_eq',
  [MediaType.PRESENTATION]: 'slideshow',
  [MediaType.ANIMATION]: 'animation',
  [MediaType.HORA_LOCA]: 'celebration',
  [MediaType.OTHER]: 'category'
};

export const MEDIA_TYPE_COLORS: { [key: string]: string } = {
  [MediaType.MUSIC]: '#7c3aed',
  [MediaType.VIDEO]: '#0284c7',
  [MediaType.AUDIO]: '#0891b2',
  [MediaType.PRESENTATION]: '#d97706',
  [MediaType.ANIMATION]: '#db2777',
  [MediaType.HORA_LOCA]: '#ea580c',
  [MediaType.OTHER]: '#64748b'
};

export enum ActivityStatus {
  AVAILABLE = 'available',
  ADJUSTED = 'adjusted',
  EXCEEDED = 'exceeded'
}

export const EVENT_TYPES: string[] = [
  'Boda',
  'Cumpleaños',
  'Evento Corporativo',
  'Graduación',
  'Aniversario',
  'Quinceañera',
  'Conferencia',
  'Seminario',
  'Congreso',
  'Otro'
];

export interface MediaItem {
  id: string;
  activityId: string;
  type: string;
  title: string;
  description: string;
  url: string;
  durationSeconds: number;
  order: number;
  observations: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventActivity {
  id: string;
  eventId: string;
  order: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  observations: string;
  active: boolean;
  mediaItems: MediaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EventPlan {
  id: string;
  name: string;
  eventType: string;
  date: string;
  venue: string;
  description: string;
  activities: EventActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityStats {
  activityId: string;
  totalMediaSeconds: number;
  remainingSeconds: number;
  status: ActivityStatus;
  statusMessage: string;
  mediaCount: number;
}

export interface EventSummary {
  totalEventDurationSeconds: number;
  totalScheduledSeconds: number;
  totalMediaSeconds: number;
  totalFreeSeconds: number;
  totalExceededSeconds: number;
  activityCount: number;
  activeActivityCount: number;
  totalMediaItems: number;
  musicCount: number;
  videoCount: number;
  audioCount: number;
  averageMediaDurationSeconds: number;
  activitiesStats: { [activityId: string]: ActivityStats };
}

export type ViewMode = 'table' | 'timeline' | 'cards' | 'dj';
