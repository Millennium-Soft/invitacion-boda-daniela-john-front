import { NgModule } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTreeModule } from '@angular/material/tree';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  imports: [
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatBottomSheetModule,
    MatSidenavModule,
    MatListModule,
    MatTabsModule,
    MatAutocompleteModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatTreeModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatDialogModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatTableModule,
    MatTooltipModule,
  ],
  exports: [
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatBottomSheetModule,
    MatSidenavModule,
    MatListModule,
    MatTabsModule,
    MatAutocompleteModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatTreeModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatDialogModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatTableModule,
    MatTooltipModule,
  ],
  providers: [MatDatepickerModule, MatNativeDateModule],
})
export class MaterialModules {}
