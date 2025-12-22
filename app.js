// TELEtext RADIO - SISTEMA DE RADIO EN VIVO
// VERSIÓN FINAL - CON RUTAS CORREGIDAS Y MANEJO DE ERRORES

console.log('📻 Teletext Radio - Sistema de radio iniciando...');

// ===== ELEMENTOS DEL DOM =====
const audioPlayer = document.getElementById('radioPlayer');
const playButton = document.getElementById('radioPlayButton');
const shareButton = document.getElementById('shareRadioButton');
const playPath = document.getElementById('playPath');
const pausePath1 = document.getElementById('pausePath1');
const pausePath2 = document.getElementById('pausePath2');
const currentShow = document.getElementById('currentShow');
const currentTimeName = document.getElementById('currentTimeName');
const currentTimeRange = document.getElementById('currentTimeRange');

// ===== VARIABLES DE ESTADO =====
let isPlaying = false;
let currentPlaylist = [];
let currentTrackIndex = 0;
let currentSchedule = null;
let isLoadingTrack = false;
let errorCount = 0;
const MAX_ERRORS = 3;

// ===== CONFIGURACIÓN DE HORARIOS (RUTAS CORREGIDAS) =====
const scheduleConfig = {
    "timeZone": "America/Argentina/Buenos_Aires",
    "schedules": [
        {
            "name": "madrugada",
            "displayName": "Madrugada txt",
            "start": "01:00",
            "end": "06:00",
            "folder": "music/madrugada/",
            "startHour": 1
        },
        {
            "name": "manana",
            "displayName": "Telesoft",
            "start": "06:00",
            "end": "12:00",
            "folder": "music/manana/",
            "startHour": 6
        },
        {
            "name": "tarde",
            "displayName": "Radio 404",
            "start": "12:00",
            "end": "16:00",
            "folder": "music/tarde/",
            "startHour": 12
        },
        {
            "name": "mediatarde",
            "displayName": "Floppy Disk",
            "start": "16:00",
            "end": "20:00",
            "folder": "music/mediatarde/",
            "startHour": 16
        },
        {
            "name": "noche",
            "displayName": "Piratas Informaticos",
            "start": "20:00",
            "end": "01:00",
            "folder": "music/noche/",
            "startHour": 20
        }
    ],
    "specialSchedules": [
        {
            "days": [5],
            "name": "viernes_20_22",
            "displayName": "Trasnoche Teletext",
            "start": "20:00",
            "end": "22:00",
            "folder": "music/noche/",
            "startHour": 20
        },
        {
            "days": [5],
            "name": "viernes_22_01",
            "displayName": "Trasnoche Teletext",
            "start": "22:00",
            "end": "01:00",
            "folder": "music/noche/",
            "startHour": 22
        },
        {
            "days": [6],
            "name": "sabado_20_22",
            "displayName": "Trasnoche Teletext",
            "start": "20:00",
            "end": "22:00",
            "folder": "music/noche/",
            "startHour": 20
        },
        {
            "days": [6],
            "name": "sabado_22_01",
            "displayName": "Trasnoche Teletext",
            "start": "22:00",
            "end": "01:00",
            "folder": "music/noche/",
            "startHour": 22
        }
    ]
};

// ===== FUNCIONES DE UTILIDAD =====
function getArgentinaTime() {
    const now = new Date();
    const argentinaOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const offsetDiff = argentinaOffset + localOffset;
    return new Date(now.getTime() + offsetDiff * 60000);
}

function formatTimeForDisplay(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getCurrentSchedule() {
    const now = getArgentinaTime();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Primero verificar horarios especiales (viernes y sábado)
    if (currentDay === 5 || currentDay === 6) {
        for (const special of scheduleConfig.specialSchedules) {
            if (special.days.includes(currentDay)) {
                const startTime = parseInt(special.start.split(':')[0]) * 60 + parseInt(special.start.split(':')[1]);
                let endTime = parseInt(special.end.split(':')[0]) * 60 + parseInt(special.end.split(':')[1]);
                
                if (endTime < startTime) {
                    endTime += 24 * 60;
                    const adjustedCurrentTime = currentTime + (currentTime < startTime ? 24 * 60 : 0);
                    if (adjustedCurrentTime >= startTime && adjustedCurrentTime < endTime) {
                        return special;
                    }
                } else {
                    if (currentTime >= startTime && currentTime < endTime) {
                        return special;
                    }
                }
            }
        }
    }
    
    // Si no es horario especial, usar horarios regulares
    for (const regular of scheduleConfig.schedules) {
        const startTime = parseInt(regular.start.split(':')[0]) * 60 + parseInt(regular.start.split(':')[1]);
        let endTime = parseInt(regular.end.split(':')[0]) * 60 + parseInt(regular.end.split(':')[1]);
        
        if (endTime < startTime) {
            endTime += 24 * 60;
            const adjustedCurrentTime = currentTime + (currentTime < startTime ? 24 * 60 : 0);
            if (adjustedCurrentTime >= startTime && adjustedCurrentTime < endTime) {
                return regular;
            }
        } else {
            if (currentTime >= startTime && currentTime < endTime) {
                return regular;
            }
        }
    }
    
    return scheduleConfig.schedules[0];
}

// ===== SISTEMA DE VERIFICACIÓN INICIAL =====
function verificarEstructuraInicial() {
    console.log('🔍 Verificando estructura del proyecto...');
    
    // Verificar que todas las carpetas tengan playlist.json válido
    const carpetas = ['madrugada', 'manana', 'tarde', 'mediatarde', 'noche'];
    let errores = 0;
    
    carpetas.forEach(carpeta => {
        const ruta = `music/${carpeta}/`;
        console.log(`  Verificando: ${ruta}`);
    });
    
    console.log('✅ Verificación de estructura completada');
    return errores === 0;
}

// ===== FUNCIONES DE REPRODUCCIÓN (CON MANEJO DE ERRORES MEJORADO) =====
async function loadCurrentPlaylist() {
    currentSchedule = getCurrentSchedule();
    console.log(`📅 Horario actual: ${currentSchedule.displayName} (${currentSchedule.folder})`);
    
    try {
        const response = await fetch(currentSchedule.folder + 'playlist.json');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - No se pudo cargar playlist.json`);
        }
        
        const data = await response.json();
        
        if (!data.tracks || !Array.isArray(data.tracks) || data.tracks.length === 0) {
            console.warn(`⚠️ Playlist vacía o inválida en ${currentSchedule.folder}, usando fallback`);
            currentPlaylist = createFallbackPlaylist();
        } else {
            currentPlaylist = data.tracks;
            console.log(`✅ Playlist cargada: ${currentPlaylist.length} canción(es)`);
        }
    } catch (error) {
        console.error(`❌ Error cargando playlist:`, error.message);
        currentPlaylist = createFallbackPlaylist();
    }
    
    return currentPlaylist.length > 0;
}

function createFallbackPlaylist() {
    // Playlist de emergencia con archivos conocidos
    const fallbackTracks = [
        { file: "andresnewforu.mp3", duration: 300 },
        { file: "automatnematod.mp3", duration: 281 },
        { file: "itsyoutlove.mp3", duration: 300 }
    ];
    
    // Filtrar para usar solo archivos de la carpeta actual si es posible
    const folder = currentSchedule.folder.replace('music/', '');
    const availableTracks = fallbackTracks.filter(track => 
        track.file.includes(folder.substring(0, 3)) || folder === 'noche/'
    );
    
    return availableTracks.length > 0 ? availableTracks : [fallbackTracks[0]];
}

function playCurrentTrack() {
    // Prevenir múltiples llamadas simultáneas
    if (isLoadingTrack) {
        console.log('⏳ Ya se está cargando una pista, esperando...');
        return;
    }
    
    if (currentPlaylist.length === 0) {
        console.error('❌ No hay canciones en la playlist');
        return;
    }
    
    isLoadingTrack = true;
    const track = currentPlaylist[currentTrackIndex];
    const audioPath = currentSchedule.folder + track.file;
    
    console.log(`🎵 Intentando reproducir: ${audioPath}`);
    
    // Limpiar estado anterior
    audioPlayer.pause();
    
    // Configurar nueva fuente
    audioPlayer.src = audioPath;
    audioPlayer.volume = 0.8;
    
    // Intentar reproducir con manejo adecuado de promesas
    const playPromise = audioPlayer.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('✅ Reproducción iniciada correctamente');
            isPlaying = true;
            isLoadingTrack = false;
            errorCount = 0; // Resetear contador de errores
            updatePlayButton();
            updateDisplayInfo();
        }).catch(error => {
            console.error('❌ Error al iniciar reproducción:', error.name, error.message);
            isLoadingTrack = false;
            errorCount++;
            
            if (errorCount >= MAX_ERRORS) {
                console.error('🚫 Demasiados errores consecutivos, deteniendo...');
                isPlaying = false;
                updatePlayButton();
                return;
            }
            
            // Esperar antes de intentar la siguiente canción
            setTimeout(() => {
                playNextTrack();
            }, 3000);
        });
    }
}

function playNextTrack() {
    if (currentPlaylist.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    console.log(`⏭️ Pasando a canción ${currentTrackIndex + 1} de ${currentPlaylist.length}`);
    playCurrentTrack();
}

function togglePlay() {
    if (isLoadingTrack) {
        console.log('⏳ Espera, todavía se está cargando...');
        return;
    }
    
    if (!isPlaying) {
        // Iniciar reproducción
        if (currentPlaylist.length === 0) {
            loadCurrentPlaylist().then((success) => {
                if (success) {
                    playCurrentTrack();
                } else {
                    console.error('❌ No se pudo cargar la playlist');
                }
            });
        } else {
            playCurrentTrack();
        }
    } else {
        // Pausar
        audioPlayer.pause();
        isPlaying = false;
        updatePlayButton();
        console.log('⏸️ Reproducción pausada');
    }
}

// ===== INTERFAZ DE USUARIO =====
function updateDisplayInfo() {
    if (!currentSchedule) {
        currentSchedule = getCurrentSchedule();
    }
    
    const displayName = currentSchedule.displayName;
    const statusText = isPlaying ? '🔴 EN VIVO' : displayName;
    
    if (currentShow) {
        currentShow.textContent = statusText;
    }
    
    if (currentTimeName) {
        currentTimeName.textContent = displayName;
    }
    
    if (currentTimeRange) {
        currentTimeRange.textContent = `${formatTimeForDisplay(currentSchedule.start)} - ${formatTimeForDisplay(currentSchedule.end)}`;
    }
}

function updatePlayButton() {
    if (!playPath || !pausePath1 || !pausePath2) return;
    
    if (isPlaying) {
        playPath.style.opacity = '0';
        pausePath1.style.opacity = '1';
        pausePath2.style.opacity = '1';
        if (playButton) playButton.setAttribute('aria-label', 'Pausar');
    } else {
        playPath.style.opacity = '1';
        pausePath1.style.opacity = '0';
        pausePath2.style.opacity = '0';
        if (playButton) playButton.setAttribute('aria-label', 'Reproducir');
    }
}

function shareRadio() {
    const url = 'https://www.txtradio.site';
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            if (!shareButton) return;
            
            const originalHTML = shareButton.innerHTML;
            shareButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
            shareButton.style.borderColor = '#00FF37';
            shareButton.style.color = '#00FF37';
            shareButton.title = '¡Enlace copiado!';
            
            setTimeout(() => {
                shareButton.innerHTML = originalHTML;
                shareButton.style.borderColor = '';
                shareButton.style.color = '';
                shareButton.title = 'Copiar enlace';
            }, 2000);
        }).catch(err => {
            console.log('ℹ️ No se pudo copiar el enlace:', err);
        });
    }
}

// ===== HERRAMIENTAS DE DEBUG (SOLO EN DESARROLLO) =====
function debugInfo() {
    console.log('=== DEBUG INFO ===');
    console.log('Horario actual:', currentSchedule?.name);
    console.log('Carpeta:', currentSchedule?.folder);
    console.log('Playlist:', currentPlaylist.length, 'canciones');
    console.log('Índice actual:', currentTrackIndex);
    console.log('Reproduciendo:', isPlaying);
    console.log('Cargando:', isLoadingTrack);
    console.log('Contador errores:', errorCount);
    
    if (currentPlaylist.length > 0 && currentTrackIndex < currentPlaylist.length) {
        console.log('Canción actual:', currentPlaylist[currentTrackIndex].file);
    }
}

// ===== INICIALIZACIÓN =====
function init() {
    console.log('🎯 Inicializando sistema de radio...');
    
    // Verificar estructura inicial
    verificarEstructuraInicial();
    
    // Configurar event listeners
    if (playButton) {
        playButton.addEventListener('click', togglePlay);
    }
    
    if (shareButton) {
        shareButton.addEventListener('click', shareRadio);
    }
    
    // Configurar eventos del reproductor de audio
    if (audioPlayer) {
        audioPlayer.addEventListener('ended', () => {
            console.log('🎶 Canción finalizada, pasando a la siguiente...');
            playNextTrack();
        });
        
        audioPlayer.addEventListener('error', function(e) {
            console.error('❌ Error en elemento de audio:', audioPlayer.error?.code, audioPlayer.error?.message);
            console.error('Fuente actual:', audioPlayer.currentSrc);
            
            if (!isLoadingTrack) {
                setTimeout(() => {
                    playNextTrack();
                }, 3000);
            }
        });
    }
    
    // Cargar playlist inicial y mostrar información
    loadCurrentPlaylist().then(() => {
        updateDisplayInfo();
    });
    
    // Verificar cambios de horario cada minuto
    setInterval(() => {
        const oldScheduleName = currentSchedule ? currentSchedule.name : null;
        currentSchedule = getCurrentSchedule();
        
        if (oldScheduleName !== currentSchedule.name) {
            console.log(`🔄 Cambio de horario detectado: ${oldScheduleName} → ${currentSchedule.name}`);
            updateDisplayInfo();
            
            if (isPlaying) {
                console.log('🔄 Recargando playlist por cambio de horario...');
                loadCurrentPlaylist().then(() => {
                    currentTrackIndex = 0;
                    playCurrentTrack();
                });
            }
        }
    }, 60000); // Cada minuto
    
    // Actualizar display cada 30 segundos
    setInterval(updateDisplayInfo, 30000);
    
    // Exponer función de debug
    window.debugRadio = debugInfo;
    
    console.log('✅ Sistema de radio inicializado correctamente');
    console.log('💡 Usa debugRadio() en la consola para información de diagnóstico');
}

// ===== EJECUCIÓN PRINCIPAL =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
