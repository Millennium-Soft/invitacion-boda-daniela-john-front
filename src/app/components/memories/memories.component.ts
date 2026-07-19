import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { MemoriesService } from 'src/app/services/memories.service';
import { WeddingDataService } from 'src/app/services/wedding-data.service';
import { Guest, Memory } from 'src/app/models/wedding-data.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-memories',
  templateUrl: './memories.component.html',
  styleUrls: ['./memories.component.css'],
})
export class MemoriesComponent implements OnInit, OnDestroy {
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();

  memories$!: Observable<Memory[]>;
  private _isUploading = false;

  // Using a getter/setter avoids the Angular [disabled] warning with reactive FormControl
  get isUploading(): boolean { return this._isUploading; }
  private setUploading(val: boolean): void {
    this._isUploading = val;
    if (val) {
      this.guestSearchCtrl.disable();
    } else {
      this.guestSearchCtrl.enable();
    }
  }

  // Autocomplete state
  guestSearchCtrl = new FormControl<string>('');
  selectedGuest: Guest | null = null;
  allGuests: Guest[] = [];
  filteredGuests$!: Observable<Guest[]>;

  // Lightbox state
  lightboxMemory: Memory | null = null;

  constructor(
    private memoriesService: MemoriesService,
    private weddingService: WeddingDataService
  ) {}

  ngOnInit(): void {
    this.memories$ = this.memoriesService.getMemories();
    this.loadGuests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadGuests(): void {
    this.weddingService.getGuests()
      .pipe(takeUntil(this.destroy$))
      .subscribe((guests) => {
        // Sort alphabetically for a better UX in the dropdown
        this.allGuests = guests.sort((a, b) => a.name.localeCompare(b.name));
        this.setupFilter();
      });
  }

  private setupFilter(): void {
    this.filteredGuests$ = this.guestSearchCtrl.valueChanges.pipe(
      startWith(''),
      // valueChanges emits a Guest object when an option is selected;
      // extracting the name string before filtering prevents the TypeError
      map((value) => this.filterGuests(value))
    );
  }

  private filterGuests(value: string | Guest | null): Guest[] {
    // Normalize: could be a string (typing) or a Guest object (option selected)
    const term = typeof value === 'string'
      ? value.toLowerCase().trim()
      : (value as Guest)?.name?.toLowerCase().trim() ?? '';

    if (!term) return this.allGuests;
    return this.allGuests.filter((g) =>
      g.name.toLowerCase().includes(term)
    );
  }

  // Called when user selects an option from the dropdown
  onGuestSelected(guest: Guest): void {
    this.selectedGuest = guest;
    this.guestSearchCtrl.setValue(guest.name, { emitEvent: false });
  }

  // Clears the selection if the user clears the field manually
  onInputChange(): void {
    if (!this.guestSearchCtrl.value) {
      this.selectedGuest = null;
    }
  }

  clearSelection(): void {
    this.selectedGuest = null;
    this.guestSearchCtrl.setValue('');
  }

  get isGuestSelected(): boolean {
    return this.selectedGuest !== null &&
      this.guestSearchCtrl.value === this.selectedGuest.name;
  }

  triggerFileInput(): void {
    if (!this.isGuestSelected) {
      Swal.fire({
        icon: 'warning',
        title: '¡Selecciona tu nombre!',
        text: 'Elige tu nombre de la lista antes de subir una foto.',
        confirmButtonColor: '#6A1B9A',
      });
      return;
    }
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    if (!this.selectedGuest) return;

    const file = input.files[0];
    input.value = '';

    this.setUploading(true);

    this.memoriesService
      .uploadPhoto(file, this.selectedGuest.name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.setUploading(false);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: '¡Momento compartido! 📸',
            showConfirmButton: false,
            timer: 3500,
          });
        },
        error: (err) => {
          this.setUploading(false);
          console.error('Error uploading memory:', err);
          Swal.fire({
            icon: 'error',
            title: 'No se pudo subir la foto',
            text: 'Verifica tu conexión e inténtalo de nuevo.',
            confirmButtonColor: '#6A1B9A',
          });
        },
      });
  }

  openLightbox(memory: Memory): void {
    this.lightboxMemory = memory;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxMemory = null;
    document.body.style.overflow = 'auto';
  }
}

