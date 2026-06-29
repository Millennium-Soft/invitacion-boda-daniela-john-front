import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WeddingDataService } from '../../services/wedding-data.service';
import { Guest } from '../../models/wedding-data.model';
import { Html5Qrcode } from 'html5-qrcode';
import { take } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-guest-validation',
    templateUrl: './guest-validation.component.html',
    styleUrls: ['./guest-validation.component.css']
})
export class GuestValidationComponent implements OnInit, OnDestroy, AfterViewInit {
    guestId: string | null = null;
    enteredId: string = '';
    guest: Guest | undefined;
    familyName: string = '';

    isLoading = false;
    isValid = false;
    isManualMode = false;
    isScanning = false;
    isSearchingByName = false;
    searchTerm: string = '';
    allGuests: Guest[] = [];
    filteredGuests: Guest[] = [];

    statusMessage = '';
    statusIcon = '';
    statusColor = '';

    // Control de Asistencia General (Lista inferior)
    listSearchTerm: string = '';
    filterStatus: 'all' | 'inside' | 'pending' = 'all';
    familiesMap: { [key: string]: string } = {};

    isUserAuthenticated = false;

    private html5QrCode: Html5Qrcode | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private weddingService: WeddingDataService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.guestId = this.route.snapshot.paramMap.get('id');
        
        // Verificar si accedió a través de la ruta secreta del organizador
        const routeDataAdmin = this.route.snapshot.data['isAdmin'];
        if (routeDataAdmin === true) {
            sessionStorage.setItem('isEventAdmin', 'true');
        }

        // Comprobar si tiene el permiso administrativo guardado en sessionStorage o Firebase
        const isSessionAdmin = sessionStorage.getItem('isEventAdmin') === 'true';

        if (isSessionAdmin) {
            this.isUserAuthenticated = true;
            this.loadAllGuests();
            this.loadFamilies();
            
            if (this.guestId) {
                this.validateGuest(this.guestId);
            } else {
                this.prepareManualValidation();
            }
        } else {
            // Si no es administrador por sesión, verificar de forma reactiva si el organizador ha iniciado sesión
            this.authService.authState$.pipe(take(1)).subscribe({
                next: (user) => {
                    this.isUserAuthenticated = !!user;

                    if (this.isUserAuthenticated) {
                        this.loadAllGuests();
                        this.loadFamilies();
                    }
                    
                    if (this.guestId) {
                        this.validateGuest(this.guestId);
                    } else {
                        this.prepareManualValidation();
                    }
                }
            });
        }
    }

    loadAllGuests() {
        this.weddingService.getGuests().subscribe({
            next: (guests) => {
                this.allGuests = guests;
                console.log('Total guests loaded for search:', guests.length);
            }
        });
    }

    loadFamilies() {
        this.weddingService.getFamilies().subscribe({
            next: (families) => {
                families.forEach(f => {
                    if (f.id) {
                        this.familiesMap[f.id] = f.familyName;
                    }
                });
                console.log('Families loaded mapping:', Object.keys(this.familiesMap).length);
            }
        });
    }

    onSearchInput() {
        const term = this.searchTerm.trim().toLowerCase();
        if (term.length < 2) {
            this.filteredGuests = [];
            return;
        }

        this.filteredGuests = this.allGuests.filter(g =>
            g.name.toLowerCase().includes(term)
        ).slice(0, 5); // Limit to top 5 results for clarity
    }

    selectGuestFromSearch(guest: Guest) {
        if (guest.id) {
            this.searchTerm = '';
            this.filteredGuests = [];
            this.isSearchingByName = false;
            this.validateGuest(guest.id);
        }
    }

    toggleNameSearch() {
        this.isSearchingByName = !this.isSearchingByName;
        if (this.isSearchingByName) {
            this.isScanning = false;
            this.isManualMode = false;
            this.searchTerm = '';
            this.filteredGuests = [];
        } else {
            this.prepareManualValidation();
        }
    }

    ngAfterViewInit() {
        // No inicializamos aquí porque el elemento 'reader' no existe aún en el DOM
    }

    ngOnDestroy() {
        this.stopScanner();
    }

    prepareManualValidation() {
        this.isManualMode = true;
        this.isScanning = false;
        this.isSearchingByName = false;
        this.statusMessage = 'Validar invitado';
        this.statusIcon = 'qr_code_scanner';
        this.statusColor = '#DAA520';
    }

    async startScanner() {
        this.isScanning = true;
        this.isManualMode = false;
        this.isSearchingByName = false;
        this.guest = undefined;
        this.isValid = false;

        // Esperar un momento para que Angular renderice el div con id="reader"
        setTimeout(async () => {
            try {
                if (!this.html5QrCode) {
                    this.html5QrCode = new Html5Qrcode("reader");
                }

                const cameras = await Html5Qrcode.getCameras();

                if (!cameras || cameras.length === 0) {
                    this.statusMessage = 'No se detectó ninguna cámara';
                    this.isManualMode = true;
                    this.isScanning = false;
                    return;
                }

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                await this.html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        this.stopScanner();
                        this.handleScannedData(decodedText);
                    },
                    (errorMessage) => { }
                );

            } catch (err: any) {
                console.error('Error al iniciar cámara:', err);
                this.isScanning = false;
                this.isManualMode = true;
                this.statusMessage = 'Error al acceder a la cámara o requiere HTTPS';
                this.statusIcon = 'error';
                this.statusColor = '#f44336';
            }
        }, 100); // 100ms es suficiente para que el DOM se actualice
    }

    stopScanner() {
        if (this.html5QrCode && this.html5QrCode.isScanning) {
            this.html5QrCode.stop()
                .then(() => {
                    this.isScanning = false;
                    console.log('Scanner detenido correctamente');
                })
                .catch(err => {
                    console.error('Error al detener scanner:', err);
                    this.isScanning = false;
                });
        } else {
            this.isScanning = false;
        }
    }

    handleScannedData(data: string) {
        // Si el QR contiene una URL completa, extraer el ID
        let id = data;
        if (data.includes('/validate/')) {
            const parts = data.split('/validate/');
            id = parts[parts.length - 1];
        } else if (data.includes('/ticket/')) {
            const parts = data.split('/ticket/');
            id = parts[parts.length - 1];
        }

        this.validateGuest(id.trim());
    }

    onManualSubmit() {
        if (this.enteredId && this.enteredId.trim().length > 0) {
            this.validateGuest(this.enteredId.trim());
        }
    }

    resetValidation() {
        this.stopScanner();
        this.guest = undefined;
        this.familyName = '';
        this.enteredId = '';
        this.isValid = false;
        this.isManualMode = true;
        this.isScanning = false;
        this.statusMessage = 'Validar invitado';
        this.statusIcon = 'qr_code_scanner';
        this.statusColor = '#DAA520';
    }

    validateGuest(id: string) {
        this.isLoading = true;
        this.isManualMode = false;
        this.isScanning = false;
        this.statusMessage = 'Verificando...';
        this.familyName = '';

        this.weddingService.getGuestById(id).pipe(take(1)).subscribe({
            next: (guest) => {
                if (guest) {
                    this.guest = guest;

                    this.weddingService.getFamilyById(guest.familyId).pipe(take(1)).subscribe({
                        next: (family) => {
                            if (family) {
                                this.familyName = family.familyName;
                            }
                        }
                    });

                    if (guest.confirmed && guest.attending) {
                        if (this.isUserAuthenticated) {
                            if (guest.checkedIn) {
                                this.setInvalid('El invitado ya ingresó al salón.');
                                this.statusIcon = 'assignment_turned_in';
                                this.statusColor = '#f44336';
                            } else {
                                this.registerIngress(guest);
                            }
                        } else {
                            if (guest.checkedIn) {
                                this.setInvalid('Este boleto de entrada ya fue registrado.');
                                this.statusIcon = 'assignment_turned_in';
                                this.statusColor = '#f44336';
                            } else {
                                this.setValidGuestView(guest);
                            }
                        }
                    } else if (guest.confirmed && !guest.attending) {
                        this.setInvalid('El invitado declinó la asistencia.');
                        this.statusIcon = 'cancel';
                    } else {
                        this.setInvalid('Falta confirmación de asistencia.');
                        this.statusIcon = 'help_outline';
                    }
                } else {
                    this.setInvalid('Invitado no encontrado.');
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error(err);
                this.setInvalid('Error de conexión.');
                this.isLoading = false;
            }
        });
    }

    registerIngress(guest: Guest) {
        if (!guest.id) return;
        this.isLoading = true;
        this.weddingService.updateGuest(guest.id, { checkedIn: true }).then(() => {
            guest.checkedIn = true;
            this.setValid();
            this.isLoading = false;
        }).catch(err => {
            console.error('Error al registrar ingreso:', err);
            this.setInvalid('Error al registrar el ingreso.');
            this.isLoading = false;
        });
    }

    setValidGuestView(guest: Guest) {
        this.isValid = true;
        this.statusMessage = 'BOLETO DE ENTRADA VÁLIDO';
        this.statusIcon = 'confirmation_number';
        this.statusColor = '#DAA520';
    }

    registerManualIngress(guest: Guest) {
        if (!guest.id || guest.checkedIn) return;
        this.weddingService.updateGuest(guest.id, { checkedIn: true }).then(() => {
            guest.checkedIn = true;
            console.log(`Ingreso manual registrado para ${guest.name}`);
        }).catch(err => {
            console.error('Error al registrar ingreso manual:', err);
        });
    }

    get filteredListGuests(): Guest[] {
        return this.allGuests.filter(guest => {
            const matchesSearch = guest.name.toLowerCase().includes(this.listSearchTerm.toLowerCase()) ||
                (guest.familyId && this.familiesMap[guest.familyId] && this.familiesMap[guest.familyId].toLowerCase().includes(this.listSearchTerm.toLowerCase()));

            let matchesStatus = true;
            if (this.filterStatus === 'inside') {
                matchesStatus = !!guest.checkedIn;
            } else if (this.filterStatus === 'pending') {
                matchesStatus = !guest.checkedIn;
            }

            return matchesSearch && matchesStatus;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }

    get insideCount(): number {
        return this.allGuests.filter(g => g.checkedIn).length;
    }

    get percentageInside(): number {
        if (this.allGuests.length === 0) return 0;
        const totalWithConfirm = this.allGuests.filter(g => g.confirmed && g.attending).length;
        if (totalWithConfirm === 0) return 0;
        return Math.round((this.insideCount / totalWithConfirm) * 100);
    }

    get totalConfirmedAttending(): number {
        return this.allGuests.filter(g => g.confirmed && g.attending).length;
    }

    setValid() {
        this.isValid = true;
        this.statusMessage = 'ACCESO AUTORIZADO';
        this.statusIcon = 'check_circle';
        this.statusColor = '#4CAF50';
    }

    setInvalid(msg: string) {
        this.isValid = false;
        this.statusMessage = msg;
        this.statusIcon = 'error';
        this.statusColor = '#f44336';
    }
}
