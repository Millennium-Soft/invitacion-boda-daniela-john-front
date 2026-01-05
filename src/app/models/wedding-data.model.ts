import { Timestamp } from '@angular/fire/firestore';

export interface Family {
    id?: string;
    familyName: string;
    invitedCount: number;
    confirmedAttending: number;
    notes?: string;
}

export interface Guest {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    familyId: string;
}

export interface Rsvp {
    id?: string;
    guestId: string;
    attending: boolean;
    timestamp: Timestamp;
    dietaryRestrictions?: string;
    song?: string;
}
