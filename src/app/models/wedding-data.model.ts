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
    confirmed?: boolean;
    attending?: boolean;
    favoriteSong?: string;
    attendsCeremony?: boolean;
    attendsReception?: boolean;
}

export interface Rsvp {
    id?: string;
    guestId?: string; // Optional if we allow manual entry of full name
    fullName: string;
    email?: string;
    attending: boolean;
    attendsCeremony?: boolean;
    attendsReception?: boolean;
    guestCount: number;
    allergies: string[];
    otherAllergies?: string;
    message?: string;
    timestamp: Timestamp;
    dietaryRestrictions?: string; // Kept for backward compatibility if needed
    song?: string; // Kept for backward compatibility if needed
    phone?: string;
}

