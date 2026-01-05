import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WeddingDataService } from 'src/app/services/wedding-data.service';
import { Family, Guest, Rsvp } from 'src/app/models/wedding-data.model';
import { Observable } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

@Component({
    selector: 'app-data-registration',
    templateUrl: './data-registration.component.html',
    styleUrls: ['./data-registration.component.css']
})
export class DataRegistrationComponent implements OnInit {
    familyForm!: FormGroup;
    guestForm!: FormGroup;

    families$!: Observable<Family[]>;
    guests$!: Observable<Guest[]>;

    constructor(private fb: FormBuilder, private weddingService: WeddingDataService) { }

    ngOnInit(): void {
        this.initForms();
        this.families$ = this.weddingService.getFamilies();
        this.guests$ = this.weddingService.getGuests();
    }

    initForms() {
        this.familyForm = this.fb.group({
            familyName: ['', Validators.required],
            invitedCount: [0, [Validators.required, Validators.min(1)]],
            notes: ['']
        });

        this.guestForm = this.fb.group({
            name: ['', Validators.required],
            phone: [''],
            email: ['', [Validators.email]],
            familyId: ['', Validators.required]
        });
    }

    async onSubmitFamily() {
        if (this.familyForm.valid) {
            const family: Family = {
                ...this.familyForm.value,
                confirmedAttending: 0 // Initial value
            };
            try {
                await this.weddingService.addFamily(family);
                this.familyForm.reset({ invitedCount: 0 });
                alert('Familia registrada con éxito');
            } catch (error) {
                console.error('Error al registrar familia', error);
            }
        }
    }

    async onSubmitGuest() {
        if (this.guestForm.valid) {
            const guest: Guest = this.guestForm.value;
            try {
                await this.weddingService.addGuest(guest);
                this.guestForm.reset();
                alert('Invitado registrado con éxito');
            } catch (error) {
                console.error(error);
            }
        }
    }
}
