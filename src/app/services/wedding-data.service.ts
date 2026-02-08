import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, query, where, Timestamp, docData, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Family, Guest, Rsvp } from '../models/wedding-data.model';
import emailjs from '@emailjs/browser';
import { environment } from 'src/environments/environment';

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

    getFamilyById(familyId: string): Observable<Family | undefined> {
        const familyDocRef = doc(this.firestore, `families/${familyId}`);
        return docData(familyDocRef, { idField: 'id' }) as Observable<Family | undefined>;
    }

    updateFamily(familyId: string, data: Partial<Family>) {
        const familyDocRef = doc(this.firestore, `families/${familyId}`);
        return updateDoc(familyDocRef, data);
    }

    deleteFamily(familyId: string) {
        const familyDocRef = doc(this.firestore, `families/${familyId}`);
        // Note: For a real app, you might want to delete guests too, 
        // but for now let's just delete the family document.
        return deleteDoc(familyDocRef);
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

    deleteGuest(guestId: string) {
        const guestDocRef = doc(this.firestore, `guests/${guestId}`);
        return deleteDoc(guestDocRef);
    }

    getGuestById(guestId: string): Observable<Guest | undefined> {
        const guestDocRef = doc(this.firestore, `guests/${guestId}`);
        return docData(guestDocRef, { idField: 'id' }) as Observable<Guest | undefined>;
    }

    // EmailJS Service
    async sendEmailWithEmailJS(toEmail: string, guestName: string, qrDataUrl: string, guestId: string) {
        const templateParams = {
            to_name: guestName,
            to_email: toEmail,
            qr_code: qrDataUrl, // La imagen base64 del QR
            guest_id: guestId
        };

        try {
            const response = await emailjs.send(
                environment.emailjs.serviceId,
                environment.emailjs.templateId,
                templateParams,
                environment.emailjs.publicKey
            );
            console.log('Email enviado exitosamente via EmailJS!', response.status, response.text);
            return response;
        } catch (error) {
            console.error('Error al enviar email via EmailJS:', error);
            throw error;
        }
    }

    // Email Service (via Firebase Extension)
    async sendConfirmationEmail(to: string, guestName: string, qrDataUrl: string, guestId: string) {
        const mailRef = collection(this.firestore, 'mail');

        const emailContent = {
            to: [to],
            message: {
                subject: '🎟️ Tu Boleto de Entrada - Boda Daniela & John',
                text: `Hola ${guestName}, gracias por confirmar tu asistencia. Tu código de entrada es: ${guestId}. Por favor presenta el código QR adjunto.`,
                html: `
                    <div style="font-family: 'Times New Roman', serif; color: #5D4037; text-align: center; padding: 20px; background-color: #fdf6ec;">
                        <h1 style="color: #DAA520;">¡Gracias por confirmar!</h1>
                        <p>Hola <strong>${guestName}</strong>,</p>
                        <p>Estamos muy felices de que nos acompañes en este día tan especial.</p>
                        <p>Por favor presenta este código QR en la entrada:</p>
                        <div style="margin: 20px auto; border: 5px solid #DAA520; padding: 10px; display: inline-block; background: white;">
                            <img src="${qrDataUrl}" alt="QR Code" width="200" height="200" />
                        </div>
                        <p style="font-size: 0.8em; color: #888;">ID: ${guestId}</p>
                        <hr style="border: 1px solid #DAA520; margin: 30px 0;" />
                        <p>Daniela & John David<br>15 de Agosto de 2026</p>
                    </div>
                `
            }
        };

        return addDoc(mailRef, emailContent);
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
