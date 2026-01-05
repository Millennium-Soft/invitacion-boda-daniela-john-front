import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css'],
})
export class InicioComponent {
  anio!: number;
  fecha = new Date();
  isEnvelopeOpen = false;
  nombreFamilia: string = '';
  cantidadCupos: number = 0;

  // YouTube Player properties
  player: any;
  isAudioPlaying = false;
  youtubeVideoId = 'qBFtuUoSQ4Q'; // Song ID

  profile = {
    name: 'Daniela Alarcón Sepúlveda',
    title: 'Ingeniera de Software | Magíster en Ciberseguridad',
    description:
      'Ingeniera de Software con más de 3 años de experiencia en desarrollo full-stack y ciberseguridad by design.',
    phone: '+57 322 431 1875',
    email: 'danielaalarconsepulveda30@gmail.com',
  };

  skills = [
    'Java',
    'Spring Boot',
    'Angular',
    'Node.js',
    'Python',
    'SQL / PostgreSQL / MySQL',
    'Docker',
    'ISO 27001',
    'OWASP',
    'Scrum',
  ];

  experience = [
    {
      role: 'Ingeniera de Software – Full Stack (Java / Angular)',
      org: 'Universidad Surcolombiana',
      period: '2022 – 2025',
      details:
        'Desarrollo y mantenimiento de sistemas críticos institucionales, control de versiones, seguridad de la información y capacitación.',
    },
    {
      role: 'Docente Universitaria Cátedra Visitante',
      org: 'Universidad Surcolombiana',
      period: '2025',
      details:
        'Diseño de ambientes de aprendizaje constructivistas y proyectos guiados.',
    },
  ];

  constructor(
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.nombreFamilia = params['familia'] || '';
      this.cantidadCupos = params['cupos'] || 0;
    });
    /* if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login']);
    } else {
    } */
    this.anio = this.fecha.getUTCFullYear();
    this.loadYoutubeAPI();
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
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
      this.isAudioPlaying = true;
    }
  }

  mensajeError() {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Ocurrio Un Error!',
    });
  }

  mensajeSuccses() {
    Swal.fire({
      icon: 'success',
      title: 'Proceso Realizado',
      showConfirmButton: false,
      timer: 1500,
    });
  }

  fError(er: any): void {
    let err = er.error.error_description;
    let arr: string[] = err.split(':');

    if (arr[0] == 'Access token expired') {
      this.auth.logout();
      this.router.navigate(['login']);
    } else {
      this.mensajeError();
    }
  }
}
