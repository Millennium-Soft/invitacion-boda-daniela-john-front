import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WeddingDataService } from 'src/app/services/wedding-data.service';
import { Family, Guest, Rsvp } from 'src/app/models/wedding-data.model';
import { Observable, combineLatest, tap, of } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';
import Swal from 'sweetalert2';

interface FamilyWithGuests extends Family {
    guests: Guest[];
    invitationUrl: string;
}

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
    familiesWithGuests$!: Observable<FamilyWithGuests[]>;
    errorMsg: string = '';

    baseUrl = window.location.origin; // Gets the current domain
    selectedTab: 'list' | 'register-family' | 'register-guest' = 'list';
    currentTabIndex: number = 0;

    isEditingFamily: boolean = false;
    editingFamilyId: string | null = null;
    isEditingGuest: boolean = false;
    editingGuestId: string | null = null;

    constructor(private fb: FormBuilder, private weddingService: WeddingDataService) { }

    ngOnInit(): void {
        this.initForms();
        console.log('Initializing data registration...');

        this.families$ = this.weddingService.getFamilies().pipe(
            tap(f => console.log('DEBUG: Families from Firebase:', f)),
            catchError(error => {
                console.error('Error fetching families:', error);
                this.errorMsg = `Error connecting to Firebase: ${error.message}`;
                return of([]);
            }),
            startWith([])
        );

        this.guests$ = this.weddingService.getGuests().pipe(
            tap(g => console.log('DEBUG: Guests from Firebase:', g)),
            catchError(error => {
                console.error('Error fetching guests:', error);
                return of([]);
            }),
            startWith([])
        );

        this.loadFamiliesWithGuests();
    }

    loadFamiliesWithGuests() {
        this.familiesWithGuests$ = combineLatest([
            this.families$,
            this.guests$
        ]).pipe(
            tap(([f, g]) => console.log('DEBUG: CombineLatest emitted:', f?.length, 'families', g?.length, 'guests')),
            map(([families, guests]) => {
                if (!families) families = [];
                if (!guests) guests = [];

                return families.map(family => {
                    const familyGuests = guests.filter(g => g.familyId === family.id);
                    // Extra short URL: only base domain + ID
                    const invitationUrl = `${this.baseUrl}/?id=${family.id}`;

                    return {
                        ...family,
                        guests: familyGuests,
                        invitationUrl
                    };
                });
            })
        );
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
            const familyData = this.familyForm.value;
            try {
                if (this.isEditingFamily && this.editingFamilyId) {
                    await this.weddingService.updateFamily(this.editingFamilyId, familyData);
                    Swal.fire({
                        icon: 'success',
                        title: '¡Familia Actualizada!',
                        text: 'Los datos de la familia han sido actualizados',
                        confirmButtonColor: '#A865C9'
                    });
                    this.cancelEditFamily();
                } else {
                    const family: Family = {
                        ...familyData,
                        confirmedAttending: 0
                    };
                    await this.weddingService.addFamily(family);
                    this.familyForm.reset({ invitedCount: 0 });
                    Swal.fire({
                        icon: 'success',
                        title: '¡Familia Registrada!',
                        text: 'La familia ha sido registrada con éxito',
                        confirmButtonColor: '#A865C9'
                    });
                }
            } catch (error) {
                console.error('Error al procesar familia', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo procesar la solicitud',
                    confirmButtonColor: '#A865C9'
                });
            }
        }
    }

    async onSubmitGuest() {
        if (this.guestForm.valid) {
            const guestData = this.guestForm.value;
            try {
                if (this.isEditingGuest && this.editingGuestId) {
                    await this.weddingService.updateGuest(this.editingGuestId, guestData);
                    Swal.fire({
                        icon: 'success',
                        title: '¡Invitado Actualizado!',
                        text: 'Los datos del invitado han sido actualizados',
                        confirmButtonColor: '#A865C9'
                    });
                    this.cancelEditGuest();
                } else {
                    await this.weddingService.addGuest(guestData);
                    this.guestForm.reset();
                    Swal.fire({
                        icon: 'success',
                        title: '¡Invitado Registrado!',
                        text: 'El invitado ha sido registrado con éxito',
                        confirmButtonColor: '#A865C9'
                    });
                }
            } catch (error) {
                console.error('Error al procesar invitado', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo procesar la solicitud',
                    confirmButtonColor: '#A865C9'
                });
            }
        }
    }

    editFamily(family: Family) {
        this.isEditingFamily = true;
        this.editingFamilyId = family.id!;
        this.familyForm.patchValue({
            familyName: family.familyName,
            invitedCount: family.invitedCount,
            notes: family.notes || ''
        });
        this.currentTabIndex = 1; // Switch to Registrar Familia tab
    }

    cancelEditFamily() {
        this.isEditingFamily = false;
        this.editingFamilyId = null;
        this.familyForm.reset({ invitedCount: 0 });
    }

    async deleteFamily(id: string) {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto! Se eliminarán también los invitados asociados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#A865C9',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await this.weddingService.deleteFamily(id);
                Swal.fire('¡Eliminado!', 'La familia ha sido eliminada.', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar la familia.', 'error');
            }
        }
    }

    editGuest(guest: Guest) {
        this.isEditingGuest = true;
        this.editingGuestId = guest.id!;
        this.guestForm.patchValue({
            name: guest.name,
            phone: guest.phone || '',
            email: guest.email || '',
            familyId: guest.familyId
        });
        this.currentTabIndex = 2; // Switch to Registrar Invitado tab
    }

    cancelEditGuest() {
        this.isEditingGuest = false;
        this.editingGuestId = null;
        this.guestForm.reset();
    }

    async deleteGuest(id: string) {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#A865C9',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await this.weddingService.deleteGuest(id);
                Swal.fire('¡Eliminado!', 'El invitado ha sido eliminado.', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar el invitado.', 'error');
            }
        }
    }

    copyInvitationLink(url: string, familyName: string) {
        navigator.clipboard.writeText(url).then(() => {
            Swal.fire({
                icon: 'success',
                title: '¡Enlace Copiado!',
                text: `Enlace de invitación para ${familyName} copiado al portapapeles`,
                timer: 2000,
                showConfirmButton: false
            });
        }).catch(err => {
            console.error('Error al copiar:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo copiar el enlace',
                confirmButtonColor: '#A865C9'
            });
        });
    }

    getAttendingCount(guests: Guest[]): number {
        return guests.filter(g => g.confirmed && g.attending).length;
    }

    getConfirmedCount(guests: Guest[]): number {
        return guests.filter(g => g.confirmed).length;
    }
}
