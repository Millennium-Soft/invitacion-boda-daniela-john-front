import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WeddingDataService } from '../../services/wedding-data.service';
import { Guest } from '../../models/wedding-data.model';
import { Html5Qrcode } from 'html5-qrcode';

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

    statusMessage = '';
    statusIcon = '';
    statusColor = '';

    private html5QrCode: Html5Qrcode | null = null;

    constructor(
        private route: ActivatedRoute,
        private weddingService: WeddingDataService
    ) { }

    ngOnInit(): void {
        this.guestId = this.route.snapshot.paramMap.get('id');
        if (this.guestId) {
            this.validateGuest(this.guestId);
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
        this.statusMessage = 'Validar invitado';
        this.statusIcon = 'qr_code_scanner';
        this.statusColor = '#DAA520';
    }

    async startScanner() {
        this.isScanning = true;
        this.isManualMode = false;
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

        this.weddingService.getGuestById(id).subscribe({
            next: (guest) => {
                if (guest) {
                    this.guest = guest;

                    this.weddingService.getFamilyById(guest.familyId).subscribe({
                        next: (family) => {
                            if (family) {
                                this.familyName = family.familyName;
                            }
                        }
                    });

                    if (guest.confirmed && guest.attending) {
                        this.setValid();
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
