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
            phone: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            attending: [false],
            dietaryRestrictions: [''],
            song: ['']
        });
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
            dietaryRestrictions: '',
            song: ''
        });
    }

    async onSubmitRsvp() {
        if (this.rsvpForm.valid && this.selectedGuest && this.selectedGuest.id) {
            const formValue = this.rsvpForm.value;

            try {
                // 1. Update Guest Contact Info
                await this.weddingService.updateGuest(this.selectedGuest.id, {
                    phone: formValue.phone,
                    email: formValue.email
                });

                // 2. Create RSVP
                const rsvp: Rsvp = {
                    guestId: this.selectedGuest.id,
                    fullName: this.selectedGuest.name,
                    attending: formValue.attending,
                    guestCount: 1, // Default to 1 for this component
                    allergies: [], // Default empty
                    dietaryRestrictions: formValue.dietaryRestrictions,
                    song: formValue.song,
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
