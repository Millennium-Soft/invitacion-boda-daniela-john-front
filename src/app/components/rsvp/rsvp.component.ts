import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WeddingDataService } from 'src/app/services/wedding-data.service';
import { Family, Guest, Rsvp } from 'src/app/models/wedding-data.model';
import { Observable, BehaviorSubject, combineLatest, map } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

@Component({
    selector: 'app-rsvp-registration',
    templateUrl: './rsvp.component.html',
    styleUrls: ['./rsvp.component.css']
})
export class RsvpComponent implements OnInit {
    searchForm!: FormGroup;
    rsvpForm!: FormGroup;

    families$!: Observable<Family[]>;
    guests$!: Observable<Guest[]>;

    selectedGuest: Guest | null = null;
    foundGuests: Guest[] = [];

    constructor(private fb: FormBuilder, private weddingService: WeddingDataService) { }

    ngOnInit(): void {
        // We will load all guests/families to search locally for better UX, 
        // or we could implement a search query. For simplicity, let's load and filter.
        this.families$ = this.weddingService.getFamilies();
        this.guests$ = this.weddingService.getGuests();

        this.initForms();
    }

    initForms() {
        this.searchForm = this.fb.group({
            searchTerm: ['']
        });

        this.rsvpForm = this.fb.group({
            phone: [''],
            email: [''],
            attending: [false],
            attendsCeremony: [true],
            attendsReception: [true],
            dietaryRestrictions: [''],
            song: ['']
        });

        // Escuchar cambios para actualizar validadores
        this.rsvpForm.get('attending')?.valueChanges.subscribe(() => {
            this.updateValidators();
        });

        this.rsvpForm.get('attendsReception')?.valueChanges.subscribe(() => {
            this.updateValidators();
        });

        this.updateValidators();
    }

    updateValidators() {
        const attending = this.rsvpForm.get('attending')?.value;
        const attendsReception = this.rsvpForm.get('attendsReception')?.value;

        const phoneControl = this.rsvpForm.get('phone');
        const emailControl = this.rsvpForm.get('email');

        if (attending && attendsReception) {
            phoneControl?.setValidators([Validators.required]);
            emailControl?.setValidators([Validators.required, Validators.email]);
        } else {
            phoneControl?.clearValidators();
            emailControl?.clearValidators();
        }

        phoneControl?.updateValueAndValidity({ emitEvent: false });
        emailControl?.updateValueAndValidity({ emitEvent: false });
    }

    // Helper method to find guest
    searchGuest() {
        const term = this.searchForm.get('searchTerm')?.value?.toLowerCase();
        if (!term) return;

        this.guests$.subscribe(guests => {
            this.foundGuests = guests.filter(g => g.name.toLowerCase().includes(term));
        });
    }

    selectGuest(guest: Guest) {
        this.selectedGuest = guest;
        // Pre-fill form if data exists
        this.rsvpForm.patchValue({
            phone: guest.phone || '',
            email: guest.email || '',
            attending: false,
            attendsCeremony: guest.attendsCeremony ?? true,
            attendsReception: guest.attendsReception ?? true,
            dietaryRestrictions: '',
            song: ''
        }, { emitEvent: true });

        this.updateValidators();
    }

    async onSubmitRsvp() {
        if (this.rsvpForm.valid && this.selectedGuest && this.selectedGuest.id) {
            const formValue = this.rsvpForm.value;
            const isAttending = formValue.attending;
            const isAttendingReception = isAttending && formValue.attendsReception;
            const isAttendingCeremony = isAttending && formValue.attendsCeremony;

            if (isAttending && !isAttendingCeremony && !isAttendingReception) {
                alert('Por favor selecciona al menos un evento para confirmar tu asistencia.');
                return;
            }

            try {
                // 1. Update Guest Info
                const guestUpdate: Partial<Guest> = {};
                guestUpdate.confirmed = true;
                guestUpdate.attending = isAttending;
                guestUpdate.attendsCeremony = isAttending ? isAttendingCeremony : false;
                guestUpdate.attendsReception = isAttending ? isAttendingReception : false;

                if (isAttendingReception) {
                    guestUpdate.phone = formValue.phone || '';
                    guestUpdate.email = formValue.email || '';
                    if (formValue.song) {
                        guestUpdate.favoriteSong = formValue.song;
                    }
                }

                await this.weddingService.updateGuest(this.selectedGuest.id, guestUpdate);

                // 2. Create RSVP
                const rsvp: Rsvp = {
                    guestId: this.selectedGuest.id,
                    fullName: this.selectedGuest.name,
                    attending: isAttending,
                    attendsCeremony: isAttending ? isAttendingCeremony : false,
                    attendsReception: isAttending ? isAttendingReception : false,
                    guestCount: 1, // Default to 1 for this component
                    allergies: [], // Default empty
                    dietaryRestrictions: isAttendingReception ? (formValue.dietaryRestrictions || '') : '',
                    song: isAttendingReception ? (formValue.song || '') : '',
                    phone: isAttendingReception ? (formValue.phone || '') : '',
                    email: isAttendingReception ? (formValue.email || '') : '',
                    timestamp: Timestamp.now()
                };

                await this.weddingService.addRsvp(rsvp);

                alert('¡Gracias por confirmar tu asistencia!');
                this.reset();

            } catch (error) {
                console.error('Error enviando RSVP:', error);
                alert('Hubo un error al enviar tu respuesta. Por favor intenta de nuevo.');
            }
        }
    }

    reset() {
        this.selectedGuest = null;
        this.foundGuests = [];
        this.searchForm.reset();
        this.rsvpForm.reset();
    }
}
