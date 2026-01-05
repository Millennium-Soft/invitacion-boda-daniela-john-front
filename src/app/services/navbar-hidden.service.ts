import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavbarHiddenService {
  visibleSideBar: boolean;

  constructor() {
    this.visibleSideBar = true;
  }

  toggleSideBar() {
    this.visibleSideBar = !this.visibleSideBar;
  }
}
