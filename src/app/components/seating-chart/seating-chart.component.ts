import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, HostListener } from '@angular/core';
import { WeddingDataService } from 'src/app/services/wedding-data.service';
import { Family, Guest, SeatingTable } from 'src/app/models/wedding-data.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-seating-chart',
  templateUrl: './seating-chart.component.html',
  styleUrls: ['./seating-chart.component.css']
})
export class SeatingChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() guests: Guest[] = [];
  @Input() families: Family[] = [];

  private destroy$ = new Subject<void>();

  // Seating tables loaded from Firestore
  tables: SeatingTable[] = [];

  // Filtered lists for the sidebar
  unassignedGuests: Guest[] = [];
  filteredUnassignedGuests: Guest[] = [];

  // Filter values
  searchTerm = '';
  filterFamilyId = 'all';
  filterGender = 'all';

  // State management and output json
  seatingJsonString = '';
  showJsonViewer = false;
  isSaving = false;

  // Selected table for configuration modal/panel
  selectedTable: SeatingTable | null = null;

  // Table dragging state
  draggingTable: SeatingTable | null = null;
  dragOffset = { x: 0, y: 0 };

  // Gender profile statistics
  statsUnassigned = { men: 0, women: 0, children: 0 };
  statsAssigned = { men: 0, women: 0, children: 0 };
  statsTotal = { men: 0, women: 0, children: 0 };

  // Menu statistics
  statsMenuUnassigned = { adult: 0, child: 0 };
  statsMenuAssigned = { adult: 0, child: 0 };
  statsMenuTotal = { adult: 0, child: 0 };

  constructor(private weddingService: WeddingDataService) {}

  ngOnInit(): void {
    this.loadTables();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['guests'] || changes['families']) {
      this.updateUnassignedGuests();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load seating tables from database
  loadTables(): void {
    this.weddingService.getTables()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tables) => {
          this.tables = tables || [];
          this.updateUnassignedGuests();
          this.generateStateJson();
        },
        error: (err) => {
          console.error('Error loading seating tables:', err);
        }
      });
  }

  // Update lists of unassigned guests
  updateUnassignedGuests(): void {
    if (!this.guests) {
      return;
    }

    // A guest is assigned if their ID is in any table's seats array
    const assignedIds = new Set<string>();
    this.tables.forEach(table => {
      table.seats.forEach(guestId => {
        if (guestId) {
          assignedIds.add(guestId);
        }
      });
    });

    // Only confirmed/attending guests need seats
    this.unassignedGuests = this.guests.filter(
      guest => (guest.confirmed && guest.attending) && !assignedIds.has(guest.id || '')
    );

    // Calculate seating stats (gender & menu)
    this.calculateSeatingStats();

    // Apply active sidebar filters
    this.applySidebarFilters();
  }

  // Calculate statistics for gender and food menus (assigned and unassigned)
  calculateSeatingStats(): void {
    this.statsUnassigned = { men: 0, women: 0, children: 0 };
    this.statsAssigned = { men: 0, women: 0, children: 0 };
    this.statsMenuUnassigned = { adult: 0, child: 0 };
    this.statsMenuAssigned = { adult: 0, child: 0 };

    const assignedIds = new Set<string>();
    this.tables.forEach(table => {
      table.seats.forEach(guestId => {
        if (guestId) {
          assignedIds.add(guestId);
        }
      });
    });

    if (!this.guests) {
      return;
    }

    const activeGuests = this.guests.filter(g => g.confirmed && g.attending);

    activeGuests.forEach(guest => {
      const isAssigned = assignedIds.has(guest.id || '');
      const gender = guest.gender || 'H';
      
      // Auto-infer menu based on gender if not explicitly defined
      const menu = guest.menuType || (gender === 'N' ? 'nino' : 'adulto');

      if (isAssigned) {
        // Gender breakdown
        if (gender === 'H') {
          this.statsAssigned.men++;
        } else if (gender === 'M') {
          this.statsAssigned.women++;
        } else if (gender === 'N') {
          this.statsAssigned.children++;
        }
        
        // Menu breakdown
        if (menu === 'nino') {
          this.statsMenuAssigned.child++;
        } else {
          this.statsMenuAssigned.adult++;
        }
      } else {
        // Gender breakdown
        if (gender === 'H') {
          this.statsUnassigned.men++;
        } else if (gender === 'M') {
          this.statsUnassigned.women++;
        } else if (gender === 'N') {
          this.statsUnassigned.children++;
        }
        
        // Menu breakdown
        if (menu === 'nino') {
          this.statsMenuUnassigned.child++;
        } else {
          this.statsMenuUnassigned.adult++;
        }
      }
    });

    this.statsTotal.men = this.statsAssigned.men + this.statsUnassigned.men;
    this.statsTotal.women = this.statsAssigned.women + this.statsUnassigned.women;
    this.statsTotal.children = this.statsAssigned.children + this.statsUnassigned.children;

    this.statsMenuTotal.adult = this.statsMenuAssigned.adult + this.statsMenuUnassigned.adult;
    this.statsMenuTotal.child = this.statsMenuAssigned.child + this.statsMenuUnassigned.child;
  }

  // Change guest food menu in local state and Firestore
  changeGuestMenu(guest: Guest, menuType: 'adulto' | 'nino'): void {
    if (!guest.id) {
      return;
    }
    guest.menuType = menuType;
    this.weddingService.updateGuest(guest.id, { menuType }).then(() => {
      this.updateUnassignedGuests();
    }).catch(err => {
      console.error('Error updating guest menu:', err);
    });
  }

  // Filter unassigned guests list
  applySidebarFilters(): void {
    let result = [...this.unassignedGuests];

    // Text search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(g => g.name.toLowerCase().includes(term));
    }

    // Family filter
    if (this.filterFamilyId !== 'all') {
      result = result.filter(g => g.familyId === this.filterFamilyId);
    }

    // Gender filter
    if (this.filterGender !== 'all') {
      result = result.filter(g => g.gender === this.filterGender);
    }

    this.filteredUnassignedGuests = result;
  }

  // Change guest gender in local state and Firestore
  changeGuestGender(guest: Guest, gender: 'H' | 'M' | 'N'): void {
    if (!guest.id) {
      return;
    }
    guest.gender = gender;
    this.weddingService.updateGuest(guest.id, { gender }).then(() => {
      this.updateUnassignedGuests();
    }).catch(err => {
      console.error('Error updating guest gender:', err);
    });
  }

  // Add a new empty table
  addTable(): void {
    // Stagger positions to prevent tables from overlapping initially
    const count = this.tables.length;
    const defaultTable: SeatingTable = {
      name: `Mesa ${count + 1}`,
      shape: 'circular',
      capacity: 8,
      seats: Array(8).fill(null),
      positionX: 50 + (count * 40) % 300,
      positionY: 50 + (count * 40) % 200
    };

    this.weddingService.addTable(defaultTable)
      .then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Mesa creada',
          text: 'La mesa se ha añadido al organizador.',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      })
      .catch(err => {
        console.error('Error adding table:', err);
      });
  }

  // Open edit modal for table configuration
  editTable(table: SeatingTable): void {
    // Clone to prevent direct template mutation before save
    this.selectedTable = JSON.parse(JSON.stringify(table));
  }

  // Save changes from table editor
  saveTableConfig(): void {
    if (!this.selectedTable || !this.selectedTable.id) {
      return;
    }

    const originalTable = this.tables.find(t => t.id === this.selectedTable?.id);
    if (!originalTable) {
      return;
    }

    // If capacity changed, adapt seats array
    const newCapacity = this.selectedTable.capacity;
    const oldCapacity = originalTable.capacity;

    if (newCapacity !== oldCapacity) {
      const newSeats = Array(newCapacity).fill(null);
      
      // Copy existing occupants up to the new capacity limits
      const limit = Math.min(newCapacity, oldCapacity);
      for (let i = 0; i < limit; i++) {
        newSeats[i] = originalTable.seats[i] || null;
      }

      // Any excess occupants that get cut off are automatically unassigned
      if (oldCapacity > newCapacity) {
        for (let i = newCapacity; i < oldCapacity; i++) {
          const guestId = originalTable.seats[i];
          if (guestId) {
            // Handled reactively when database updates seats array
          }
        }
      }
      this.selectedTable.seats = newSeats;
    }

    this.isSaving = true;
    this.weddingService.updateTable(this.selectedTable.id, this.selectedTable)
      .then(() => {
        this.selectedTable = null;
        this.isSaving = false;
        Swal.fire({
          icon: 'success',
          title: 'Mesa actualizada',
          text: 'Configuración guardada correctamente.',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      })
      .catch(err => {
        console.error('Error updating table configuration:', err);
        this.isSaving = false;
      });
  }

  // Delete an existing table
  deleteTable(tableId: string): void {
    Swal.fire({
      title: '¿Eliminar mesa?',
      text: 'Todos los invitados asignados volverán a la lista de pendientes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#A865C9',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.weddingService.deleteTable(tableId)
          .then(() => {
            Swal.fire('Mesa eliminada', 'La mesa ha sido removida del organizador.', 'success');
          })
          .catch(err => {
            console.error('Error deleting table:', err);
          });
      }
    });
  }

  // Clear all guest assignments
  clearAllAssignments(): void {
    if (this.tables.length === 0) {
      return;
    }

    Swal.fire({
      title: '¿Vaciar todas las mesas?',
      text: 'Todos los invitados regresarán a la lista de pendientes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#A865C9',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, vaciar todo',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const promises = this.tables.map(table => {
          const emptySeats = Array(table.capacity).fill(null);
          return this.weddingService.updateTable(table.id || '', { seats: emptySeats });
        });

        Promise.all(promises)
          .then(() => {
            Swal.fire('Tablero vaciado', 'Todos los puestos han sido liberados.', 'success');
          })
          .catch(err => {
            console.error('Error clearing table assignments:', err);
          });
      }
    });
  }

  // Get family name by ID
  getFamilyName(familyId: string): string {
    const fam = this.families.find(f => f.id === familyId);
    return fam ? fam.familyName : 'Sin Familia';
  }

  // Get guest name by ID
  getGuestName(guestId: string | null): string {
    if (!guestId) {
      return '';
    }
    const guest = this.guests.find(g => g.id === guestId);
    return guest ? guest.name : 'Desconocido';
  }

  // Get guest by ID
  getGuest(guestId: string | null): Guest | null {
    if (!guestId) {
      return null;
    }
    return this.guests.find(g => g.id === guestId) || null;
  }

  // Native HTML5 Drag and Drop Event Handlers
  onDragStart(event: DragEvent, guest: Guest): void {
    if (event.dataTransfer && guest.id) {
      event.dataTransfer.setData('text/plain', guest.id);
      event.dataTransfer.setData('source', 'sidebar');
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragStartFromSeat(event: DragEvent, guestId: string, sourceTableId: string, seatIndex: number): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', guestId);
      event.dataTransfer.setData('source', 'table');
      event.dataTransfer.setData('sourceTableId', sourceTableId);
      event.dataTransfer.setData('sourceSeatIndex', seatIndex.toString());
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    // Prevent default browser behavior to enable drop action
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDropOnSeat(event: DragEvent, targetTableId: string, targetSeatIndex: number): void {
    event.preventDefault();
    if (!event.dataTransfer) {
      return;
    }

    const guestId = event.dataTransfer.getData('text/plain');
    const source = event.dataTransfer.getData('source');

    if (!guestId) {
      return;
    }

    const targetTable = this.tables.find(t => t.id === targetTableId);
    if (!targetTable) {
      return;
    }

    // Check if seat is already occupied
    const currentOccupantId = targetTable.seats[targetSeatIndex];

    if (source === 'sidebar') {
      // Placing a guest from the sidebar to an empty seat
      const updatedSeats = [...targetTable.seats];
      updatedSeats[targetSeatIndex] = guestId;

      this.weddingService.updateTable(targetTableId, { seats: updatedSeats })
        .then(() => {
          this.updateUnassignedGuests();
        });
    } else if (source === 'table') {
      const sourceTableId = event.dataTransfer.getData('sourceTableId');
      const sourceSeatIndex = parseInt(event.dataTransfer.getData('sourceSeatIndex'), 10);

      if (sourceTableId === targetTableId && sourceSeatIndex === targetSeatIndex) {
        return;
      }

      const sourceTable = this.tables.find(t => t.id === sourceTableId);
      if (!sourceTable) {
        return;
      }

      // Reordering or swapping guests
      const updatedTargetSeats = [...targetTable.seats];
      const updatedSourceSeats = [...sourceTable.seats];

      if (sourceTableId === targetTableId) {
        // Rearranging seats within the same table
        updatedTargetSeats[sourceSeatIndex] = currentOccupantId;
        updatedTargetSeats[targetSeatIndex] = guestId;

        this.weddingService.updateTable(targetTableId, { seats: updatedTargetSeats });
      } else {
        // Swapping/moving guests between different tables
        updatedSourceSeats[sourceSeatIndex] = currentOccupantId;
        updatedTargetSeats[targetSeatIndex] = guestId;

        Promise.all([
          this.weddingService.updateTable(sourceTableId, { seats: updatedSourceSeats }),
          this.weddingService.updateTable(targetTableId, { seats: updatedTargetSeats })
        ]).then(() => {
          this.updateUnassignedGuests();
        });
      }
    }
  }

  onDropOnSidebar(event: DragEvent): void {
    event.preventDefault();
    if (!event.dataTransfer) {
      return;
    }

    const guestId = event.dataTransfer.getData('text/plain');
    const source = event.dataTransfer.getData('source');

    if (source === 'table' && guestId) {
      const sourceTableId = event.dataTransfer.getData('sourceTableId');
      const sourceSeatIndex = parseInt(event.dataTransfer.getData('sourceSeatIndex'), 10);

      const sourceTable = this.tables.find(t => t.id === sourceTableId);
      if (sourceTable) {
        const updatedSeats = [...sourceTable.seats];
        updatedSeats[sourceSeatIndex] = null;

        this.weddingService.updateTable(sourceTableId, { seats: updatedSeats })
          .then(() => {
            this.updateUnassignedGuests();
          });
      }
    }
  }

  // Remove guest from seat via simple button click
  removeGuestFromSeat(tableId: string, seatIndex: number): void {
    const table = this.tables.find(t => t.id === tableId);
    if (table) {
      const updatedSeats = [...table.seats];
      updatedSeats[seatIndex] = null;
      this.weddingService.updateTable(tableId, { seats: updatedSeats })
        .then(() => {
          this.updateUnassignedGuests();
        });
    }
  }

  // Return style layout configurations for seats surrounding the geometric table shapes
  getSeatStyle(index: number, capacity: number, shape: 'circular' | 'square' | 'rectangular'): { [key: string]: string } {
    if (shape === 'circular') {
      const angle = (2 * Math.PI / capacity) * index - Math.PI / 2;
      const radius = 53; // Closer to circular table edge
      const left = 50 + radius * Math.cos(angle);
      const top = 50 + radius * Math.sin(angle);
      return {
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)'
      };
    }

    if (shape === 'square') {
      // Symmetrical distribution on 4 sides
      const side = index % 4;
      const pos = Math.floor(index / 4);
      const totalInSide = Math.floor((capacity - 1 - side) / 4) + 1;

      // Vertical/Horizontal limits aligned with table border
      const start = 30;
      const end = 70;
      const span = totalInSide > 1 ? (end - start) / (totalInSide - 1) : 0;
      const position = totalInSide > 1 ? start + pos * span : 50;

      if (side === 0) {
        // Top side closer to edge
        return { left: `${position}%`, top: '15%', transform: 'translate(-50%, -50%)' };
      } else if (side === 1) {
        // Right side closer to edge
        return { left: '85%', top: `${position}%`, transform: 'translate(-50%, -50%)' };
      } else if (side === 2) {
        // Bottom side closer to edge
        return { left: `${100 - position}%`, top: '85%', transform: 'translate(-50%, -50%)' };
      } else {
        // Left side closer to edge
        return { left: '15%', top: `${100 - position}%`, transform: 'translate(-50%, -50%)' };
      }
    }

    // Rectangular Distribution
    const shortSideChairs = Math.max(1, Math.floor(capacity * 0.22));
    const longSideChairs = Math.max(1, Math.round((capacity - 2 * shortSideChairs) / 2));

    // Determine target side and relative index
    let side = 0;
    let relIndex = 0;

    if (index < longSideChairs) {
      side = 0; // Top
      relIndex = index;
    } else if (index < longSideChairs + shortSideChairs) {
      side = 1; // Right
      relIndex = index - longSideChairs;
    } else if (index < 2 * longSideChairs + shortSideChairs) {
      side = 2; // Bottom
      relIndex = index - (longSideChairs + shortSideChairs);
    } else {
      side = 3; // Left
      relIndex = index - (2 * longSideChairs + shortSideChairs);
    }

    if (side === 0) {
      // Top side
      const start = 22;
      const end = 78;
      const span = longSideChairs > 1 ? (end - start) / (longSideChairs - 1) : 0;
      const left = longSideChairs > 1 ? start + relIndex * span : 50;
      return { left: `${left}%`, top: '18%', transform: 'translate(-50%, -50%)' };
    } else if (side === 1) {
      // Right side
      const start = 33;
      const end = 67;
      const span = shortSideChairs > 1 ? (end - start) / (shortSideChairs - 1) : 0;
      const top = shortSideChairs > 1 ? start + relIndex * span : 50;
      return { left: '93%', top: `${top}%`, transform: 'translate(-50%, -50%)' };
    } else if (side === 2) {
      // Bottom side
      const start = 22;
      const end = 78;
      const span = longSideChairs > 1 ? (end - start) / (longSideChairs - 1) : 0;
      const left = longSideChairs > 1 ? end - relIndex * span : 50;
      return { left: `${left}%`, top: '82%', transform: 'translate(-50%, -50%)' };
    } else {
      // Left side
      const start = 33;
      const end = 67;
      const span = shortSideChairs > 1 ? (end - start) / (shortSideChairs - 1) : 0;
      const top = shortSideChairs > 1 ? end - relIndex * span : 50;
      return { left: '7%', top: `${top}%`, transform: 'translate(-50%, -50%)' };
    }
  }

  // Get count of occupied seats in a table
  getOccupiedCount(seats: (string | null)[]): number {
    return seats.filter(s => s !== null).length;
  }

  // Get original capacity of a table by ID to display warnings
  getOriginalCapacity(tableId: string | undefined): number {
    if (!tableId) {
      return 0;
    }
    const original = this.tables.find(t => t.id === tableId);
    return original ? original.capacity : 0;
  }

  // Start dragging the table with mouse coordinates
  onTableMouseDown(event: MouseEvent, table: SeatingTable): void {
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('.btn-table-action') || targetElement.closest('.chair-spot')) {
      return;
    }

    event.preventDefault();
    this.draggingTable = table;
    
    // Calculate difference between click position and current table coordinate
    this.dragOffset.x = event.clientX - (table.positionX || 0);
    this.dragOffset.y = event.clientY - (table.positionY || 0);
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.draggingTable) {
      return;
    }

    // Set new mouse position inside canvas limits
    let x = event.clientX - this.dragOffset.x;
    let y = event.clientY - this.dragOffset.y;

    // Bounds check to avoid dragging way out of layout view
    x = Math.max(10, Math.min(x, 1500));
    y = Math.max(10, Math.min(y, 1000));

    this.draggingTable.positionX = x;
    this.draggingTable.positionY = y;
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (!this.draggingTable || !this.draggingTable.id) {
      return;
    }

    // Save final table coordinates to Firebase Firestore
    this.weddingService.updateTable(this.draggingTable.id, {
      positionX: this.draggingTable.positionX,
      positionY: this.draggingTable.positionY
    }).then(() => {
      this.generateStateJson();
    });

    this.draggingTable = null;
  }

  // Generate structured state JSON
  generateStateJson(): void {
    const formattedTables = this.tables.map(table => {
      const assignedGuests = table.seats
        .map((guestId, index) => {
          if (!guestId) {
            return null;
          }
          const guest = this.getGuest(guestId);
          return {
            seatIndex: index,
            guestId: guestId,
            name: guest ? guest.name : 'Desconocido',
            gender: guest ? (guest.gender || 'H') : 'H'
          };
        })
        .filter(item => item !== null);

      return {
        id: table.id,
        name: table.name,
        shape: table.shape,
        capacity: table.capacity,
        assignedGuests: assignedGuests
      };
    });

    this.seatingJsonString = JSON.stringify(formattedTables, null, 2);
  }
}
