import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, query, where, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Family, Guest, Rsvp } from '../models/wedding-data.model';

@Injectable({
    providedIn: 'root'
})
export class WeddingDataService {

    constructor(private firestore: Firestore) { }

    //Families
    addFamily(family: Family) {
        const familiesRef = collection(this.firestore, 'families');
        return addDoc(familiesRef, family);
    }

    getFamilies(): Observable<Family[]> {
        const familiesRef = collection(this.firestore, 'families');
        return collectionData(familiesRef, { idField: 'id' }) as Observable<Family[]>;
    }

    // Guests
    addGuest(guest: Guest) {
        const guestsRef = collection(this.firestore, 'guests');
        return addDoc(guestsRef, guest);
    }

    getGuests(): Observable<Guest[]> {
        const guestsRef = collection(this.firestore, 'guests');
        return collectionData(guestsRef, { idField: 'id' }) as Observable<Guest[]>;
    }

    getGuestsByFamily(familyId: string): Observable<Guest[]> {
        const guestsRef = collection(this.firestore, 'guests');
        const q = query(guestsRef, where('familyId', '==', familyId));
        return collectionData(q, { idField: 'id' }) as Observable<Guest[]>;
    }

    updateGuest(guestId: string, data: Partial<Guest>) {
        const guestDocRef = doc(this.firestore, `guests/${guestId}`);
        return updateDoc(guestDocRef, data);
    }

    // RSVPs
    addRsvp(rsvp: Rsvp) {
        const rsvpsRef = collection(this.firestore, 'rsvps');
        return addDoc(rsvpsRef, rsvp);
    }

    getRsvps(): Observable<Rsvp[]> {
        const rsvpsRef = collection(this.firestore, 'rsvps');
        return collectionData(rsvpsRef, { idField: 'id' }) as Observable<Rsvp[]>;
    }
}
