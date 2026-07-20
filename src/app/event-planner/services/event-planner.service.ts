import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import {
  Firestore, doc, setDoc, onSnapshot, Unsubscribe
} from '@angular/fire/firestore';
import {
  EventPlan, EventActivity, MediaItem, ActivityStats,
  EventSummary, ActivityStatus, MediaType
} from '../models/event-plan.model';

const PLAN_DOC_ID = 'main_plan';
const COLLECTION = 'event_plans';
const LOCAL_KEY = 'millennium_event_plan_v1';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultPlan(): EventPlan {
  const now = new Date().toISOString();
  return {
    id: PLAN_DOC_ID,
    name: 'Mi Evento',
    eventType: 'Boda',
    date: new Date().toISOString().split('T')[0],
    venue: '',
    description: '',
    activities: [],
    createdAt: now,
    updatedAt: now
  };
}

@Injectable()
export class EventPlannerService implements OnDestroy {
  private planSubject: BehaviorSubject<EventPlan>;

  plan$: Observable<EventPlan>;
  summary$: Observable<EventSummary>;

  private searchQuerySubject = new BehaviorSubject<string>('');
  searchQuery$ = this.searchQuerySubject.asObservable();

  // Real-time Firestore listener unsubscribe handle
  private firestoreUnsub: Unsubscribe | null = null;

  // Flag to avoid writing back to Firestore when we receive a remote update
  private ignoreNextRemote = false;

  constructor(private firestore: Firestore) {
    // Show local cache instantly (zero-latency first render)
    const cached = this.loadFromLocal();
    this.planSubject = new BehaviorSubject<EventPlan>(cached);
    this.plan$ = this.planSubject.asObservable();
    this.summary$ = this.plan$.pipe(map(plan => this.calculateSummary(plan)));

    // Subscribe to real-time Firestore changes
    this.subscribeToFirestore();
  }

  ngOnDestroy(): void {
    if (this.firestoreUnsub) this.firestoreUnsub();
  }

  // ---- Firestore Real-Time Subscription ----

  private subscribeToFirestore(): void {
    const ref = doc(this.firestore, COLLECTION, PLAN_DOC_ID);

    this.firestoreUnsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          // Document doesn't exist yet — push local plan to Firebase
          this.writeToFirestore(this.planSubject.value);
          return;
        }
        const remote = snap.data() as EventPlan;
        this.saveToLocal(remote);
        // Update BehaviorSubject without triggering a write-back
        this.planSubject.next({ ...remote });
      },
      (error) => {
        console.warn('[EventPlanner] Firestore listener error:', error);
      }
    );
  }

  private async writeToFirestore(plan: EventPlan): Promise<void> {
    try {
      const ref = doc(this.firestore, COLLECTION, PLAN_DOC_ID);
      await setDoc(ref, plan);
    } catch (e) {
      console.warn('[EventPlanner] Firestore write failed:', e);
    }
  }

  // ---- Local Storage Cache ----

  private loadFromLocal(): EventPlan {
    try {
      const s = localStorage.getItem(LOCAL_KEY);
      return s ? JSON.parse(s) : createDefaultPlan();
    } catch {
      return createDefaultPlan();
    }
  }

  private saveToLocal(plan: EventPlan): void {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(plan));
    } catch { /* unavailable */ }
  }

  // ---- Emit (local + Firestore) ----

  private emit(plan: EventPlan): void {
    plan.updatedAt = new Date().toISOString();
    this.saveToLocal(plan);           // instant local cache
    this.planSubject.next({ ...plan }); // update UI immediately
    this.writeToFirestore(plan);      // async remote sync
  }

  getCurrentPlan(): EventPlan {
    return this.planSubject.value;
  }

  updatePlan(updates: Partial<Omit<EventPlan, 'activities' | 'id' | 'createdAt'>>): void {
    const plan = { ...this.planSubject.value, ...updates };
    this.emit(plan);
  }

  // ---- Activity CRUD ----

  addActivity(data: Partial<EventActivity>): EventActivity {
    const plan = { ...this.planSubject.value };
    const now = new Date().toISOString();
    const activity: EventActivity = {
      id: generateId(),
      eventId: plan.id,
      order: plan.activities.length + 1,
      title: data.title || 'Nueva Actividad',
      description: data.description || '',
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      durationSeconds: data.durationSeconds || 0,
      observations: data.observations || '',
      active: data.active !== undefined ? data.active : true,
      mediaItems: [],
      createdAt: now,
      updatedAt: now
    };
    plan.activities = [...plan.activities, activity];
    this.emit(plan);
    return activity;
  }

  updateActivity(id: string, updates: Partial<EventActivity>): void {
    const plan = { ...this.planSubject.value };
    plan.activities = plan.activities.map(a =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
    );
    this.emit(plan);
  }

  deleteActivity(id: string): void {
    const plan = { ...this.planSubject.value };
    plan.activities = plan.activities
      .filter(a => a.id !== id)
      .map((a, i) => ({ ...a, order: i + 1 }));
    this.emit(plan);
  }

  duplicateActivity(id: string): void {
    const plan = { ...this.planSubject.value };
    const source = plan.activities.find(a => a.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const newId = generateId();
    const copy: EventActivity = {
      ...source,
      id: newId,
      title: `${source.title} (copia)`,
      order: plan.activities.length + 1,
      mediaItems: source.mediaItems.map(m => ({
        ...m,
        id: generateId(),
        activityId: newId
      })),
      createdAt: now,
      updatedAt: now
    };
    plan.activities = [...plan.activities, copy];
    this.emit(plan);
  }

  toggleActivity(id: string): void {
    const plan = { ...this.planSubject.value };
    plan.activities = plan.activities.map(a =>
      a.id === id ? { ...a, active: !a.active, updatedAt: new Date().toISOString() } : a
    );
    this.emit(plan);
  }

  reorderActivities(reordered: EventActivity[]): void {
    const plan = { ...this.planSubject.value };
    plan.activities = reordered.map((a, i) => ({ ...a, order: i + 1 }));
    this.emit(plan);
  }

  // ---- Media CRUD ----

  addMediaItem(activityId: string, data: Partial<MediaItem>): MediaItem {
    const plan = { ...this.planSubject.value };
    const activity = plan.activities.find(a => a.id === activityId);
    if (!activity) throw new Error(`Activity ${activityId} not found`);
    const now = new Date().toISOString();
    const item: MediaItem = {
      id: generateId(),
      activityId,
      type: data.type || MediaType.MUSIC,
      title: data.title || 'Nuevo elemento',
      description: data.description || '',
      url: data.url || '',
      durationSeconds: data.durationSeconds || 0,
      order: activity.mediaItems.length + 1,
      observations: data.observations || '',
      createdAt: now,
      updatedAt: now
    };
    plan.activities = plan.activities.map(a =>
      a.id === activityId
        ? { ...a, mediaItems: [...a.mediaItems, item], updatedAt: now }
        : a
    );
    this.emit(plan);
    return item;
  }

  updateMediaItem(activityId: string, itemId: string, updates: Partial<MediaItem>): void {
    const plan = { ...this.planSubject.value };
    const now = new Date().toISOString();
    plan.activities = plan.activities.map(a => {
      if (a.id !== activityId) return a;
      return {
        ...a,
        updatedAt: now,
        mediaItems: a.mediaItems.map(m =>
          m.id === itemId ? { ...m, ...updates, updatedAt: now } : m
        )
      };
    });
    this.emit(plan);
  }

  deleteMediaItem(activityId: string, itemId: string): void {
    const plan = { ...this.planSubject.value };
    const now = new Date().toISOString();
    plan.activities = plan.activities.map(a => {
      if (a.id !== activityId) return a;
      return {
        ...a,
        updatedAt: now,
        mediaItems: a.mediaItems
          .filter(m => m.id !== itemId)
          .map((m, i) => ({ ...m, order: i + 1 }))
      };
    });
    this.emit(plan);
  }

  reorderMediaItems(activityId: string, reordered: MediaItem[]): void {
    const plan = { ...this.planSubject.value };
    const now = new Date().toISOString();
    plan.activities = plan.activities.map(a => {
      if (a.id !== activityId) return a;
      return {
        ...a,
        updatedAt: now,
        mediaItems: reordered.map((m, i) => ({ ...m, order: i + 1 }))
      };
    });
    this.emit(plan);
  }

  // ---- Search ----

  setSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);
  }

  // ---- Calculations ----

  calculateActivityStats(activity: EventActivity): ActivityStats {
    const totalMediaSeconds = activity.mediaItems.reduce((sum, m) => sum + (m.durationSeconds || 0), 0);
    const remainingSeconds = activity.durationSeconds - totalMediaSeconds;
    const absRemaining = Math.abs(remainingSeconds);
    const h = Math.floor(absRemaining / 3600);
    const m = Math.floor((absRemaining % 3600) / 60);
    const s = absRemaining % 60;

    const formatParts = (): string => {
      const parts: string[] = [];
      if (h > 0) parts.push(`${h} hora${h !== 1 ? 's' : ''}`);
      if (m > 0) parts.push(`${m} minuto${m !== 1 ? 's' : ''}`);
      if (s > 0 && h === 0) parts.push(`${s} segundo${s !== 1 ? 's' : ''}`);
      return parts.join(' ') || '0 segundos';
    };

    let status: ActivityStatus;
    let statusMessage: string;

    if (remainingSeconds > 0) {
      status = ActivityStatus.AVAILABLE;
      statusMessage = `Restan ${formatParts()}`;
    } else if (remainingSeconds === 0) {
      status = ActivityStatus.ADJUSTED;
      statusMessage = 'Tiempo exacto';
    } else {
      status = ActivityStatus.EXCEEDED;
      statusMessage = `Excedido por ${formatParts()}`;
    }

    return {
      activityId: activity.id,
      totalMediaSeconds,
      remainingSeconds,
      status,
      statusMessage,
      mediaCount: activity.mediaItems.length
    };
  }

  calculateSummary(plan: EventPlan): EventSummary {
    const active = plan.activities.filter(a => a.active);
    const allMedia = active.flatMap(a => a.mediaItems);
    const totalScheduledSeconds = active.reduce((sum, a) => sum + a.durationSeconds, 0);
    const totalMediaSeconds = allMedia.reduce((sum, m) => sum + m.durationSeconds, 0);

    const activitiesStats: { [key: string]: ActivityStats } = {};
    let totalExceededSeconds = 0;
    let totalFreeSeconds = 0;

    for (const activity of active) {
      const stats = this.calculateActivityStats(activity);
      activitiesStats[activity.id] = stats;
      if (stats.remainingSeconds < 0) {
        totalExceededSeconds += Math.abs(stats.remainingSeconds);
      } else {
        totalFreeSeconds += stats.remainingSeconds;
      }
    }

    const musicCount = allMedia.filter(m => m.type === MediaType.MUSIC).length;
    const videoCount = allMedia.filter(m => m.type === MediaType.VIDEO).length;
    const audioCount = allMedia.filter(m => m.type === MediaType.AUDIO).length;
    const averageMediaDurationSeconds = allMedia.length > 0
      ? Math.round(totalMediaSeconds / allMedia.length)
      : 0;

    return {
      totalEventDurationSeconds: totalScheduledSeconds,
      totalScheduledSeconds,
      totalMediaSeconds,
      totalFreeSeconds,
      totalExceededSeconds,
      activityCount: plan.activities.length,
      activeActivityCount: active.length,
      totalMediaItems: allMedia.length,
      musicCount,
      videoCount,
      audioCount,
      averageMediaDurationSeconds,
      activitiesStats
    };
  }

  // ---- Utilities ----

  timeToSeconds(time: string): number {
    if (!time || !time.includes(':')) return 0;
    const parts = time.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  timeDiffSeconds(startTime: string, endTime: string): number {
    const start = this.timeToSeconds(startTime);
    const end = this.timeToSeconds(endTime);
    return Math.max(0, end - start);
  }

  parseDurationInput(input: string): number {
    if (!input) return 0;
    input = input.trim();
    if (!input.includes(':')) return parseInt(input, 10) || 0;
    const parts = input.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const absSeconds = Math.abs(Math.round(seconds));
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  resetPlan(): void {
    const plan = createDefaultPlan();
    this.saveToLocal(plan);
    this.planSubject.next(plan);
    this.writeToFirestore(plan);
  }

  exportPlan(): string {
    return JSON.stringify(this.planSubject.value, null, 2);
  }

  importPlan(json: string): boolean {
    try {
      const plan = JSON.parse(json) as EventPlan;
      if (!plan.id || !plan.name) return false;
      plan.id = PLAN_DOC_ID; // ensure document id matches
      this.saveToLocal(plan);
      this.planSubject.next(plan);
      this.writeToFirestore(plan);
      return true;
    } catch {
      return false;
    }
  }
}
