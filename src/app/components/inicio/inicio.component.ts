import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { WeddingDataService } from 'src/app/services/wedding-data.service';
import { Rsvp } from 'src/app/models/wedding-data.model';
import { Timestamp } from '@angular/fire/firestore';
import { AuthService } from 'src/app/services/auth.service';
import Swal from 'sweetalert2';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css', './inicio-responsive.component.css', './rsvp-family.component.css'],
})
export class InicioComponent implements OnInit {
  anio!: number;
  fecha = new Date();
  isEnvelopeOpen = false;
  nombreFamilia: string = '';
  cantidadCupos: number = 0;
  familyId: string = '';
  familyGuests: any[] = [];
  isLoadingGuests = false;
  isLoadingFamily = false;
  isAlreadyConfirmed = false;
  hasScrolled = false;

  // Countdown properties
  countdown = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  };
  weddingDate = new Date('2026-08-15T18:00:00');

  // YouTube Player properties
  player: any;
  isAudioPlaying = false;
  youtubeVideoId = 'qBFtuUoSQ4Q'; // I See the Light - Tangled

  // RSVP Form Group
  rsvpForm: any;
  isSubmitting = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private weddingService: WeddingDataService
  ) {
    // Immediate and robust check to capture params from ANYWHERE in the URL
    this.extractParams();
  }

  private extractParams() {
    const searchParams = new URLSearchParams(window.location.search);
    let hashSearch = '';
    if (window.location.hash.includes('?')) {
      hashSearch = window.location.hash.split('?')[1];
    }
    const hashParams = new URLSearchParams(hashSearch);

    // Prioritize 'id' or 'familyId'
    this.familyId = searchParams.get('id') || hashParams.get('id') ||
      searchParams.get('familyId') || hashParams.get('familyId') || '';

    // Fallback for old links with names in URL
    this.nombreFamilia = searchParams.get('familia') || hashParams.get('familia') || '';
    const rawCupos = searchParams.get('cupos') || hashParams.get('cupos') || '0';
    this.cantidadCupos = Number(rawCupos);

    console.log('Extracted Family ID:', this.familyId);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      console.log('Router Params update:', params);

      this.familyId = params['id'] || params['familyId'] || this.familyId;

      // If we have an ID, load everything from database
      if (this.familyId) {
        this.loadFamilyDetails();
        this.loadFamilyGuests();
      } else if (this.nombreFamilia) {
        // Old link support: if no ID but we have names from extractParams
        console.log('Using fallback names from URL');
      }
    });

    if (!this.isEnvelopeOpen) {
      document.body.style.overflow = 'hidden';
    }

    this.anio = this.fecha.getUTCFullYear();
    this.loadYoutubeAPI();
    this.startCountdown();

    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        this.hasScrolled = true;
      } else {
        this.hasScrolled = false;
      }
    });
  }

  loadFamilyDetails() {
    if (!this.familyId) return;

    this.isLoadingFamily = true;
    this.weddingService.getFamilyById(this.familyId).subscribe({
      next: (family) => {
        if (family) {
          this.nombreFamilia = family.familyName;
          this.cantidadCupos = family.invitedCount;
          console.log('Family details loaded:', family);
        }
        // Small delay to make the animation feel "magical" and not jumpy
        setTimeout(() => {
          this.isLoadingFamily = false;
        }, 1500);
      },
      error: (error) => {
        console.error('Error loading family details:', error);
        this.isLoadingFamily = false;
      }
    });
  }

  loadFamilyGuests() {
    this.isLoadingGuests = true;
    this.weddingService.getGuestsByFamily(this.familyId).subscribe({
      next: (guests) => {
        console.log('Guests loaded from Firebase:', guests);
        this.familyGuests = guests.map((guest: any) => ({
          ...guest,
          confirmed: guest.confirmed || false,
          attending: guest.attending !== undefined ? guest.attending : undefined, // Force choice
          favoriteSong: guest.favoriteSong || '',
          email: guest.email || '',
          phone: guest.phone || '',
          allergies: guest.allergies || [],
          otherAllergies: guest.otherAllergies || '',
          message: guest.message || ''
        }));
        console.log('Processed familyGuests:', this.familyGuests);
        // Only consider "Already Confirmed" if EVERYONE has confirmed.
        this.isAlreadyConfirmed = guests.length > 0 && guests.every((guest: any) => guest.confirmed);
        console.log('isAlreadyConfirmed:', this.isAlreadyConfirmed);
        this.isLoadingGuests = false;
      },
      error: (error) => {
        console.error('Error loading guests:', error);
        this.isLoadingGuests = false;
      }
    });
  }

  startCountdown() {
    setInterval(() => {
      const now = new Date().getTime();
      const distance = this.weddingDate.getTime() - now;

      this.countdown.days = Math.floor(distance / (1000 * 60 * 60 * 24));
      this.countdown.hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.countdown.minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      this.countdown.seconds = Math.floor((distance % (1000 * 60)) / 1000);
    }, 1000);
  }

  loadYoutubeAPI() {
    if (!(window as any)['YT']) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }

    (window as any)['onYouTubeIframeAPIReady'] = () => {
      this.player = new (window as any)['YT'].Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: this.youtubeVideoId,
        playerVars: {
          'autoplay': 0,
          'controls': 0,
          'loop': 1,
          'playlist': this.youtubeVideoId
        },
        events: {
          'onReady': this.onPlayerReady.bind(this)
        }
      });
    };
  }

  onPlayerReady(event: any) {
    // Player ready
  }

  toggleMusic() {
    if (this.player && typeof this.player.getPlayerState === 'function') {
      if (this.isAudioPlaying) {
        this.player.pauseVideo();
        this.isAudioPlaying = false;
      } else {
        this.player.playVideo();
        this.isAudioPlaying = true;
      }
    }
  }

  openEnvelope() {
    this.isEnvelopeOpen = true;
    document.body.style.overflow = 'auto'; // Restore scroll
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
      this.isAudioPlaying = true;
    }
    // Scroll to top when opening
    window.scrollTo(0, 0);
  }

  async onSubmitRSVP() {
    this.isSubmitting = true;

    // Filter guests that have a selection but are NOT yet confirmed
    const guestsToConfirm = this.familyGuests.filter((g: any) => g.attending !== undefined && !g.confirmed);

    if (guestsToConfirm.length === 0) {
      // If there are guests who still haven't selected anything (and aren't confirmed)
      const pendingGuests = this.familyGuests.filter((g: any) => !g.confirmed);

      if (pendingGuests.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Ninguna selección nueva',
          text: 'Por favor selecciona "Asistiré" o "No podré asistir" para al menos un invitado pendiente.',
          confirmButtonColor: '#A865C9'
        });
      } else {
        // Everyone is already confirmed, maybe just show success
        this.mensajeSuccses();
      }
      this.isSubmitting = false;
      return;
    }

    try {
      // Update only the guests that are being confirmed in this batch
      const updatePromises = guestsToConfirm.map((guest: any) => {
        if (guest.id) {
          // Validation for required email if attending
          if (guest.attending && !guest.email) {
            throw new Error(`Por favor ingresa un correo para ${guest.name}`);
          }

          return this.weddingService.updateGuest(guest.id, {
            confirmed: true,
            attending: guest.attending,
            favoriteSong: guest.favoriteSong || '',
            email: guest.email || '',
            phone: guest.phone || ''
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      // --- SEND EMAILS WITH QR CODES ---
      const emailPromises = guestsToConfirm.map(async (guest: any) => {
        if (guest.attending && guest.email) {
          try {
            // Generate QR Code
            // URL points to the validation page of this app
            const validationUrl = `${window.location.origin}/validate/${guest.id}`;

            const qrDataUrl = await QRCode.toDataURL(validationUrl, {
              errorCorrectionLevel: 'M',
              color: {
                dark: '#5D4037',  // Brown color for elegance
                light: '#FFFFFF'
              },
              width: 300,
              margin: 2
            });

            // Send Email via Service (which uses EmailJS)
            await this.weddingService.sendEmailWithEmailJS(guest.email, guest.name, qrDataUrl, guest.id);
            console.log(`Email request sent for ${guest.name} via EmailJS`);
          } catch (err) {
            console.error(`Failed to generate QR or send email for ${guest.name}`, err);
            // Don't block the UI success message if email fails, but log it.
          }
        }
      });

      await Promise.all(emailPromises);
      // ---------------------------------

      // Reload guests from Firebase to get the updated state
      console.log('Reloading guests from Firebase after confirmation...');
      this.loadFamilyGuests();

      // Update family confirmed count based on ALL guests (including newly confirmed)
      // We need to wait a bit for Firebase to update
      setTimeout(async () => {
        const attendingCount = this.familyGuests.filter((g: any) => g.confirmed && g.attending).length;
        if (this.familyId) {
          await this.weddingService.updateFamily(this.familyId, {
            confirmedAttending: attendingCount
          });
        }
      }, 1000);

      this.mensajeSuccses();
    } catch (error: any) {
      console.error('Error submitting RSVP:', error);
      // Handle the specific validation error text if present
      Swal.fire({
        icon: 'error',
        title: 'Atención',
        text: error.message || 'Ocurrió un error al enviar tu confirmación. Por favor intenta de nuevo.',
        confirmButtonColor: '#A865C9'
      });
    } finally {
      this.isSubmitting = false;
    }
  }




  mensajeError() {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Ocurrió un error al enviar tu confirmación. Por favor intenta de nuevo.',
      confirmButtonColor: '#A865C9'
    });
  }

  mensajeSuccses() {
    Swal.fire({
      icon: 'success',
      title: '¡Confirmación Enviada!',
      text: 'Gracias por ser parte de nuestro gran día.',
      showConfirmButton: true,
      confirmButtonColor: '#A865C9'
    });
  }
}

