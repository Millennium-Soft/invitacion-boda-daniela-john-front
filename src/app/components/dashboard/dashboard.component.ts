import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { WeddingDataService } from 'src/app/services/wedding-data.service';
import { AuthService } from 'src/app/services/auth.service';
import { MemoriesService } from 'src/app/services/memories.service';
import { Family, Guest, Memory, Rsvp, SeatingTable } from 'src/app/models/wedding-data.model';
import { combineLatest, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Guests who have a special beef menu
const BEEF_MENU_GUESTS: string[] = [
  'ANDRÉS ANAYA ISAZA',
  'DANIELA ALARCÓN SEPULVEDA',
  'DIEGO ANDRÉS CARVAJAL RUIZ'
];

interface DashboardStats {
  totalFamiliesInvited: number;
  totalFamiliesConfirmed: number;
  totalGuestsInvited: number;
  totalGuestsConfirmed: number;
  totalGuestsAttending: number;
  totalGuestsDeclined: number;
  totalGuestsPending: number;
  attendingCeremony: number;
  attendingReception: number;
  songsCount: number;
  allergiesCount: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
  private destroy$ = new Subject<void>();

  // Data lists
  families: Family[] = [];
  guests: Guest[] = [];
  rsvps: Rsvp[] = [];
  tables: SeatingTable[] = [];

  // Filtered lists
  filteredGuests: Guest[] = [];
  filteredFamilies: Family[] = [];

  // UI state
  activeTab: 'resumen' | 'invitados' | 'familias' | 'musica' | 'alergias-mensajes' | 'mesas' | 'momentos' = 'resumen';

  // Memories (Dots Memories)
  memories$!: Observable<Memory[]>;
  isUploadingPhoto = false;
  guestNameForUpload = '';
  isLoading = true;

  // Search & Filter values
  guestSearchTerm = '';
  guestFilterStatus = 'all'; // all, confirmed, pending, attending, declined, ceremony, reception
  familySearchTerm = '';

  // Calculated Stats
  stats: DashboardStats = {
    totalFamiliesInvited: 0,
    totalFamiliesConfirmed: 0,
    totalGuestsInvited: 0,
    totalGuestsConfirmed: 0,
    totalGuestsAttending: 0,
    totalGuestsDeclined: 0,
    totalGuestsPending: 0,
    attendingCeremony: 0,
    attendingReception: 0,
    songsCount: 0,
    allergiesCount: 0
  };

  constructor(
    private weddingService: WeddingDataService,
    private authService: AuthService,
    private memoriesService: MemoriesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadData();
    this.memories$ = this.memoriesService.getMemories();
    this.weddingService.getTables()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => { this.tables = tables || []; });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;

    combineLatest([
      this.weddingService.getFamilies(),
      this.weddingService.getGuests(),
      this.weddingService.getRsvps()
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([families, guests, rsvps]) => {
          this.families = families || [];
          this.guests = guests || [];
          this.rsvps = rsvps || [];

          this.calculateStats();
          this.applyGuestFilters();
          this.applyFamilyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando datos del dashboard:', error);
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error de carga',
            text: 'No se pudo sincronizar la información con la base de datos.',
            confirmButtonColor: '#A865C9'
          });
        }
      });
  }

  calculateStats(): void {
    const totalFamilies = this.families.length;
    
    // Families with at least one confirmed guest
    const confirmedFamilies = this.families.filter(f => {
      const familyGuests = this.guests.filter(g => g.familyId === f.id);
      return familyGuests.length > 0 && familyGuests.every(g => g.confirmed);
    }).length;

    const totalGuests = this.guests.length;
    const confirmedGuests = this.guests.filter(g => g.confirmed);
    const attendingGuests = this.guests.filter(g => g.confirmed && g.attending);
    const declinedGuests = this.guests.filter(g => g.confirmed && !g.attending);
    const pendingGuests = this.guests.filter(g => !g.confirmed);

    const ceremonyCount = this.guests.filter(g => g.confirmed && g.attending && g.attendsCeremony).length;
    const receptionCount = this.guests.filter(g => g.confirmed && g.attending && g.attendsReception).length;

    // Favorite songs registered (either in Guest model or RSVP model)
    const uniqueSongs = new Set<string>();
    this.guests.forEach(g => {
      if (g.favoriteSong && g.favoriteSong.trim()) {
        uniqueSongs.add(g.favoriteSong.trim().toLowerCase());
      }
    });
    this.rsvps.forEach(r => {
      if (r.song && r.song.trim()) {
        uniqueSongs.add(r.song.trim().toLowerCase());
      }
    });

    // Allergies/dietary restriction count
    let allergyCount = 0;
    this.rsvps.forEach(r => {
      if ((r.allergies && r.allergies.length > 0) || (r.otherAllergies && r.otherAllergies.trim()) || (r.dietaryRestrictions && r.dietaryRestrictions.trim())) {
        allergyCount++;
      }
    });

    this.stats = {
      totalFamiliesInvited: totalFamilies,
      totalFamiliesConfirmed: confirmedFamilies,
      totalGuestsInvited: totalGuests,
      totalGuestsConfirmed: confirmedGuests.length,
      totalGuestsAttending: attendingGuests.length,
      totalGuestsDeclined: declinedGuests.length,
      totalGuestsPending: pendingGuests.length,
      attendingCeremony: ceremonyCount,
      attendingReception: receptionCount,
      songsCount: uniqueSongs.size,
      allergiesCount: allergyCount
    };
  }

  // Filter Guests
  applyGuestFilters(): void {
    let result = [...this.guests];

    // Text search
    if (this.guestSearchTerm.trim()) {
      const term = this.guestSearchTerm.toLowerCase().trim();
      result = result.filter(g => {
        const familyName = this.getFamilyName(g.familyId).toLowerCase();
        return g.name.toLowerCase().includes(term) || familyName.includes(term);
      });
    }

    // Status filter
    switch (this.guestFilterStatus) {
      case 'confirmed':
        result = result.filter(g => g.confirmed);
        break;
      case 'pending':
        result = result.filter(g => !g.confirmed);
        break;
      case 'attending':
        result = result.filter(g => g.confirmed && g.attending);
        break;
      case 'declined':
        result = result.filter(g => g.confirmed && !g.attending);
        break;
      case 'ceremony':
        result = result.filter(g => g.confirmed && g.attending && g.attendsCeremony);
        break;
      case 'reception':
        result = result.filter(g => g.confirmed && g.attending && g.attendsReception);
        break;
    }

    this.filteredGuests = result;
  }

  setGuestFilter(status: string): void {
    this.guestFilterStatus = status;
    this.applyGuestFilters();
  }

  // Filter Families
  applyFamilyFilters(): void {
    let result = [...this.families];

    if (this.familySearchTerm.trim()) {
      const term = this.familySearchTerm.toLowerCase().trim();
      result = result.filter(f => f.familyName.toLowerCase().includes(term));
    }

    this.filteredFamilies = result;
  }

  // Helpers
  getFamilyName(familyId: string): string {
    const family = this.families.find(f => f.id === familyId);
    return family ? family.familyName : 'Sin Familia';
  }

  getFamilyNotes(familyId: string): string {
    const family = this.families.find(f => f.id === familyId);
    return family && family.notes ? family.notes : '';
  }

  getGuestsForFamily(familyId: string): Guest[] {
    return this.guests.filter(g => g.familyId === familyId);
  }

  getInvitationLink(familyId: string): string {
    return `${window.location.origin}/?id=${familyId}`;
  }

  copyLink(familyId: string, familyName: string): void {
    const link = this.getInvitationLink(familyId);
    navigator.clipboard.writeText(link).then(() => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Enlace de ${familyName} copiado`,
        showConfirmButton: false,
        timer: 2000
      });
    }).catch(err => {
      console.error('Error al copiar:', err);
      Swal.fire('Error', 'No se pudo copiar el enlace', 'error');
    });
  }

  // Reset confirmation state of a guest so they can confirm again
  async resetGuestConfirmation(guest: Guest): Promise<void> {
    if (!guest.id) return;

    const result = await Swal.fire({
      title: '¿Restablecer confirmación?',
      text: `Se borrará el estado de confirmación para ${guest.name}. Podrá volver a confirmar desde su invitación.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#A865C9',
      cancelButtonColor: '#888',
      confirmButtonText: 'Sí, restablecer',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        // Update guest in Firebase
        await this.weddingService.updateGuest(guest.id, {
          confirmed: false,
          attending: undefined,
          attendsCeremony: true,
          attendsReception: true,
          favoriteSong: '',
          email: '',
          phone: ''
        });

        // Also update family counts
        const familyGuests = this.guests.filter(g => g.familyId === guest.familyId && g.id !== guest.id);
        // Recalculate attending count of other members
        const attendingCount = familyGuests.filter(g => g.confirmed && g.attending).length;
        await this.weddingService.updateFamily(guest.familyId, {
          confirmedAttending: attendingCount
        });

        // Find and delete associated RSVP if it exists
        const rsvpToDelete = this.rsvps.find(r => r.guestId === guest.id);
        // Note: Currently we don't have a delete RSVP method in service, but we can update it or leave it,
        // it doesn't affect much. If we need to delete it, we'll handle it.

        Swal.fire('¡Restablecido!', 'El estado de confirmación ha sido reiniciado.', 'success');
      } catch (error) {
        console.error('Error al restablecer confirmación:', error);
        Swal.fire('Error', 'No se pudo completar la operación.', 'error');
      }
    }
  }

  async deleteGuest(guest: Guest): Promise<void> {
    if (!guest.id) return;

    const result = await Swal.fire({
      title: '¿Eliminar invitado?',
      text: `¿Estás seguro de eliminar a ${guest.name}? Esto no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#888',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await this.weddingService.deleteGuest(guest.id);
        Swal.fire('¡Eliminado!', 'El invitado ha sido removido.', 'success');
      } catch (error) {
        console.error('Error al eliminar invitado:', error);
        Swal.fire('Error', 'No se pudo eliminar el invitado.', 'error');
      }
    }
  }

  // Export to Excel using exceljs
  async exportToExcel(): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MillenniumSoft';
      workbook.lastModifiedBy = 'MillenniumSoft';
      workbook.created = new Date();
      workbook.modified = new Date();

      // 1. SHEET: INVITADOS
      const sheetGuests = workbook.addWorksheet('Invitados');
      sheetGuests.views = [{ state: 'frozen', ySplit: 1 }];

      sheetGuests.columns = [
        { header: 'Nombre Completo', key: 'name', width: 30 },
        { header: 'Familia', key: 'family', width: 25 },
        { header: '¿Confirmó?', key: 'confirmed', width: 15 },
        { header: '¿Asiste?', key: 'attending', width: 15 },
        { header: 'Ceremonia (Iglesia)', key: 'ceremony', width: 20 },
        { header: 'Recepción (Fiesta)', key: 'reception', width: 20 },
        { header: 'Celular', key: 'phone', width: 18 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Canción Sugerida', key: 'song', width: 30 }
      ];

      // Add guest data
      this.guests.forEach(g => {
        sheetGuests.addRow({
          name: g.name,
          family: this.getFamilyName(g.familyId),
          confirmed: g.confirmed ? 'SÍ' : 'NO',
          attending: g.confirmed ? (g.attending ? 'SÍ' : 'NO') : 'PENDIENTE',
          ceremony: g.confirmed && g.attending ? (g.attendsCeremony ? 'SÍ' : 'NO') : '-',
          reception: g.confirmed && g.attending ? (g.attendsReception ? 'SÍ' : 'NO') : '-',
          phone: g.phone || '-',
          email: g.email || '-',
          song: g.favoriteSong || '-'
        });
      });

      // Style header
      sheetGuests.getRow(1).eachCell(cell => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '6A1B9A' } // Plum color
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // 2. SHEET: PLAYLIST (MÚSICA)
      const sheetMusic = workbook.addWorksheet('Lista de Música');
      sheetMusic.views = [{ state: 'frozen', ySplit: 1 }];
      sheetMusic.columns = [
        { header: 'Canción / Artista', key: 'song', width: 40 },
        { header: 'Sugerido por', key: 'guest', width: 30 },
        { header: 'Familia', key: 'family', width: 25 }
      ];

      // Gather songs
      const songsList: { song: string; guest: string; family: string }[] = [];
      this.guests.forEach(g => {
        if (g.favoriteSong && g.favoriteSong.trim()) {
          songsList.push({
            song: g.favoriteSong.trim(),
            guest: g.name,
            family: this.getFamilyName(g.familyId)
          });
        }
      });

      songsList.forEach(item => {
        sheetMusic.addRow(item);
      });

      sheetMusic.getRow(1).eachCell(cell => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'DAA520' } // Gold
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // 3. SHEET: CATERING Y ALERGIAS
      const sheetCatering = workbook.addWorksheet('Catering y Mensajes');
      sheetCatering.views = [{ state: 'frozen', ySplit: 1 }];
      sheetCatering.columns = [
        { header: 'Invitado', key: 'guest', width: 30 },
        { header: 'Contacto', key: 'contact', width: 20 },
        { header: 'Alergias / Restricciones', key: 'allergies', width: 40 },
        { header: 'Mensaje de Felicitación', key: 'message', width: 50 }
      ];

      this.rsvps.forEach(r => {
        const contactInfo = [r.phone, r.email].filter(Boolean).join(' / ');
        const allergyText = [
          (r.allergies || []).join(', '),
          r.otherAllergies,
          r.dietaryRestrictions
        ].filter(Boolean).join(' | ');

        if (allergyText || r.message) {
          sheetCatering.addRow({
            guest: r.fullName,
            contact: contactInfo || '-',
            allergies: allergyText || 'Ninguna',
            message: r.message || '-'
          });
        }
      });

      sheetCatering.getRow(1).eachCell(cell => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '8D6E63' } // Brown
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Auto-fit rows and format all cells nicely
      [sheetGuests, sheetMusic, sheetCatering].forEach(ws => {
        ws.eachRow((row, rowNumber) => {
          row.height = rowNumber === 1 ? 28 : 22;
          row.eachCell((cell, colNumber) => {
            if (rowNumber > 1) {
              cell.font = { name: 'Arial', size: 10 };
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
              // Alternating light gray rows
              if (rowNumber % 2 === 0) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'F9F9F9' }
                };
              }
              // Add borders
              cell.border = {
                top: { style: 'thin', color: { argb: 'E0E0E0' } },
                bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
                left: { style: 'thin', color: { argb: 'E0E0E0' } },
                right: { style: 'thin', color: { argb: 'E0E0E0' } }
              };
            }
          });
        });
      });

      // Write and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([buffer], { type: fileType });
      saveAs(blob, `Reporte_Boda_Daniela_y_John_${new Date().toISOString().split('T')[0]}.xlsx`);

      Swal.fire({
        icon: 'success',
        title: '¡Descarga Exitosa!',
        text: 'El reporte de invitados se ha exportado correctamente en formato Excel.',
        confirmButtonColor: '#A865C9'
      });

    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      Swal.fire('Error', 'No se pudo generar el archivo Excel.', 'error');
    }
  }

  getInsideCount(): number {
    return this.guests.filter(g => g.checkedIn).length;
  }

  async resetAllCheckedIn(): Promise<void> {
    const checkedInGuests = this.guests.filter(g => g.checkedIn);

    if (checkedInGuests.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin registros',
        text: 'No hay invitados registrados en el salón actualmente.',
        confirmButtonColor: '#6A1B9A'
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Restablecer todos los ingresos?',
      text: `Se limpiará el registro de ingreso al salón para los ${checkedInGuests.length} invitados que están dentro. Esto restablecerá el estado para hacer nuevas pruebas.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DAA520',
      cancelButtonColor: '#888',
      confirmButtonText: 'Sí, limpiar todos',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Limpiando registros...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const promises = checkedInGuests.map(g => {
          if (g.id) {
            return this.weddingService.updateGuest(g.id, { checkedIn: false });
          }
          return Promise.resolve();
        });

        await Promise.all(promises);
        
        Swal.fire({
          icon: 'success',
          title: 'Registros limpios',
          text: 'Se han restablecido todos los registros de ingreso al salón con éxito.',
          confirmButtonColor: '#6A1B9A'
        });
      } catch (error) {
        console.error('Error al limpiar registros de ingreso:', error);
        Swal.fire('Error', 'No se pudo limpiar los registros de ingreso.', 'error');
      }
    }
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  // Deletes a memory photo with admin confirmation
  async deleteMemory(memory: Memory): Promise<void> {
    if (!memory.id) return;

    const result = await Swal.fire({
      title: '¿Eliminar foto?',
      html: `¿Deseas eliminar la foto de <strong>${memory.guest}</strong>? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#888',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      await this.memoriesService.deleteMemory(memory.id);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Foto eliminada',
        showConfirmButton: false,
        timer: 2500
      });
    } catch (err) {
      console.error('Error deleting memory:', err);
      Swal.fire('Error', 'No se pudo eliminar la foto.', 'error');
    }
  }

  // Checks if a guest name is in the beef menu special list
  private isBeefMenuGuest(name: string): boolean {
    const normalized = name.trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return BEEF_MENU_GUESTS.some(b => {
      const bNorm = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized === bNorm;
    });
  }

  // Generates and downloads a PDF with tables, guests and menu type
  exportTablesPdf(): void {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 14;

    // ── Header ──────────────────────────────────────────────────────────────────
    pdf.setFillColor(106, 27, 154); // plum
    pdf.rect(0, 0, pageW, 32, 'F');

    pdf.setTextColor(218, 165, 32); // gold
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Daniela & John David', pageW / 2, 12, { align: 'center' });

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text('Distribución de Mesas y Menú — 15 de Agosto de 2026', pageW / 2, 21, { align: 'center' });

    pdf.setFontSize(8);
    pdf.text(`Generado el ${new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}`, pageW / 2, 28, { align: 'center' });

    // ── Legend ──────────────────────────────────────────────────────────────────
    let cursorY = 40;
    pdf.setTextColor(60, 60, 60);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.setFillColor(255, 235, 238);
    pdf.roundedRect(margin, cursorY - 4, pageW - margin * 2, 9, 2, 2, 'F');
    pdf.setTextColor(180, 0, 0);
    pdf.text(
      '* Los invitados resaltados en rojo tienen menú especial con Carne de Res.',
      margin + 3, cursorY + 2
    );
    cursorY += 12;

    const sortedTables = [...this.tables].sort((a, b) => a.name.localeCompare(b.name));

    if (sortedTables.length === 0) {
      pdf.setTextColor(100, 100, 100);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text('No hay mesas configuradas aún.', pageW / 2, cursorY + 20, { align: 'center' });
    }

    for (const table of sortedTables) {
      // Collect guests seated at this table using the seat ID as the lookup key
      const seatedGuests: Guest[] = (table.seats || [])
        .filter((s): s is string => !!s && s.trim() !== '')
        .map(id => this.guests.find(g => g.id === id))
        .filter((g): g is Guest => g !== undefined);

      // Sort by familyId so companions from the same family appear together
      seatedGuests.sort((a, b) => {
        const famCmp = a.familyId.localeCompare(b.familyId);
        if (famCmp !== 0) return famCmp;
        return a.name.localeCompare(b.name);
      });

      // ── Table title ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(106, 27, 154);
      const occupiedSeats = (table.seats || []).filter((s): s is string => !!s && s.trim() !== '').length;
      const tableLabel = `Mesa: ${table.name}  (${occupiedSeats} / ${table.capacity} asientos)`;
      pdf.text(tableLabel, margin, cursorY);
      cursorY += 2;

      // ── Build rows ──
      const bodyRows: (string | { content: string; styles: object })[][] = [];

      if (seatedGuests.length === 0) {
        bodyRows.push([{
          content: 'Sin invitados asignados',
          styles: { textColor: [150, 150, 150], fontStyle: 'italic', halign: 'center', colSpan: 4 } as object
        }]);
      } else {
        seatedGuests.forEach(g => {
          const isBeef = this.isBeefMenuGuest(g.name);
          // Mirror the seating chart logic: infer menu from gender when menuType is not set
          const effectiveMenu = g.menuType || (g.gender === 'N' ? 'nino' : 'adulto');
          const menuLabel = effectiveMenu === 'nino' ? 'Niño' : 'Adulto';
          const observation = isBeef ? '* Carne de Res' : '';
          const familyName = this.getFamilyName(g.familyId);

          if (isBeef) {
            bodyRows.push([
              { content: g.name, styles: { textColor: [180, 0, 0], fontStyle: 'bold' } },
              { content: familyName, styles: { textColor: [180, 0, 0] } },
              { content: menuLabel, styles: { textColor: [180, 0, 0], fontStyle: 'bold', halign: 'center' } },
              { content: observation, styles: { textColor: [180, 0, 0], fontStyle: 'bold', fillColor: [255, 235, 238], halign: 'center' } }
            ]);
          } else {
            bodyRows.push([g.name, familyName, menuLabel, observation]);
          }
        });
      }

      autoTable(pdf, {
        startY: cursorY + 1,
        head: [['Nombre del Invitado', 'Familia', 'Tipo de Menú', 'Observación']],
        body: bodyRows as any,
        theme: 'grid',
        headStyles: {
          fillColor: [106, 27, 154],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        columnStyles: {
          0: { cellWidth: 65 },
          1: { cellWidth: 50 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 38, halign: 'center' }
        },
        margin: { left: margin, right: margin },
        alternateRowStyles: { fillColor: [245, 237, 248] },
        didDrawPage: (data: any) => {
          // Page footer
          const footerY = pdf.internal.pageSize.getHeight() - 8;
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(7);
          pdf.setTextColor(180, 180, 180);
          pdf.text('Boda Daniela & John David — 15 Agosto 2026', pageW / 2, footerY, { align: 'center' });
          pdf.text(`Pág. ${(pdf as any).internal.getCurrentPageInfo().pageNumber}`, pageW - margin, footerY, { align: 'right' });
        }
      });

      cursorY = (pdf as any).lastAutoTable.finalY + 10;

      // New page if near the bottom
      if (cursorY > pdf.internal.pageSize.getHeight() - 40) {
        pdf.addPage();
        cursorY = 20;
      }
    }

    pdf.save(`Mesas_Boda_Daniela_John_${new Date().toISOString().split('T')[0]}.pdf`);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: '¡PDF generado exitosamente!',
      showConfirmButton: false,
      timer: 3000
    });
  }

  // Opens the hidden file input for photo upload
  triggerFileInput(): void {
    this.photoInput?.nativeElement.click();
  }

  // Handles file selection: validates, compresses, uploads to Drive, saves to Firestore
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    input.value = ''; // Reset input so same file can be re-selected

    const guestName = this.guestNameForUpload.trim();
    if (!guestName) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'Por favor escribe tu nombre antes de subir una foto.',
        confirmButtonColor: '#6A1B9A',
      });
      return;
    }

    this.isUploadingPhoto = true;

    this.memoriesService.uploadPhoto(file, guestName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isUploadingPhoto = false;
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: '¡Foto subida con éxito! 📸',
            showConfirmButton: false,
            timer: 3000,
          });
        },
        error: (err) => {
          this.isUploadingPhoto = false;
          console.error('Error uploading memory photo:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error al subir la foto',
            text: 'No se pudo completar la subida. Por favor intenta de nuevo.',
            confirmButtonColor: '#6A1B9A',
          });
        },
      });
  }
}
