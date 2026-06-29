import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  user,
} from '@angular/fire/auth';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  authState$: Observable<User | null>;

  constructor(private auth: Auth) {
    this.authState$ = user(this.auth);
  }

  // Registro
  register(email: string, password: string): Observable<User> {
    return from(
      createUserWithEmailAndPassword(this.auth, email, password).then(
        (res) => res.user
      )
    );
  }

  // Login
  login(email: string, password: string): Observable<User> {
    return from(
      signInWithEmailAndPassword(this.auth, email, password).then(
        (res) => res.user
      )
    );
  }

  // Logout
  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  // Usuario actual
  get currentUser(): User | null {
    return this.auth.currentUser;
  }
}
