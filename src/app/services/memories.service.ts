import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  query,
  orderBy,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { Memory, DriveUploadResponse } from '../models/wedding-data.model';
import { environment } from 'src/environments/environment';

// Max width for compressed images before uploading
const MAX_IMAGE_WIDTH_PX = 1280;
// JPEG quality (0-1) for canvas compression
const IMAGE_QUALITY = 0.75;

// In dev, the Angular proxy (proxy.conf.json) forwards /drive-upload → Apps Script,
// bypassing the CORS preflight that localhost triggers.
// In production the browser talks directly to Apps Script (deployed domain has no CORS issues).
const APPS_SCRIPT_DIRECT =
  'https://script.google.com/macros/s/AKfycbx4hZAkeBlcKk5YViTppzXfm9Hpr7LwlTmzxSV-dcRj4f5A6j4W5Nt1dUU4ymtdKa-B/exec';
const APPS_SCRIPT_URL = environment.production ? APPS_SCRIPT_DIRECT : '/drive-upload';

@Injectable({
  providedIn: 'root',
})
export class MemoriesService {
  constructor(private http: HttpClient, private firestore: Firestore) { }

  // Compresses a File using HTML5 Canvas; returns a Blob of the result
  private compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;
        if (width > MAX_IMAGE_WIDTH_PX) {
          height = Math.round((height * MAX_IMAGE_WIDTH_PX) / width);
          width = MAX_IMAGE_WIDTH_PX;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob returned null'));
            }
          },
          'image/jpeg',
          IMAGE_QUALITY
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image failed to load for compression'));
      };

      img.src = objectUrl;
    });
  }

  // Reads a Blob and returns its raw Base64 string (without data-URI prefix)
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip "data:<mime>;base64," prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  // Compresses, converts to Base64, uploads to Drive, then saves metadata to Firestore
  uploadPhoto(file: File, guestName: string): Observable<Memory> {
    const uploadFlow = async (): Promise<Memory> => {
      // Step 1: Compress
      const compressedBlob = await this.compressImage(file);

      // Step 2: Base64 encode
      const base64 = await this.blobToBase64(compressedBlob);

      // Step 3: POST to Apps Script
      const payload = {
        base64,
        mimeType: 'image/jpeg',
        fileName: `memory_${guestName.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
      };

      // text/plain avoids the CORS preflight OPTIONS that Apps Script doesn't handle.
      // Apps Script reads the JSON string from e.postData.contents.
      const headers = new HttpHeaders({ 'Content-Type': 'text/plain' });

      const driveResponse = await this.http
        .post<DriveUploadResponse>(APPS_SCRIPT_URL, JSON.stringify(payload), { headers })
        .toPromise();

      if (!driveResponse || driveResponse.status !== 'ok' || !driveResponse.driveId) {
        throw new Error(driveResponse?.message ?? 'Drive upload failed');
      }

      // Step 4: Persist reference in Firestore
      const memoriesRef = collection(this.firestore, 'memories');
      const docRef = await addDoc(memoriesRef, {
        driveId: driveResponse.driveId,
        guest: guestName,
        createdAt: serverTimestamp(),
        likes: 0,
      });

      return {
        id: docRef.id,
        driveId: driveResponse.driveId,
        guest: guestName,
        createdAt: null as any, // serverTimestamp resolves server-side
        likes: 0,
      };
    };

    return from(uploadFlow());
  }

  // Returns a real-time observable stream of memories ordered by newest first
  getMemories(): Observable<Memory[]> {
    const memoriesRef = collection(this.firestore, 'memories');
    const q = query(memoriesRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Memory[]>;
  }
}
