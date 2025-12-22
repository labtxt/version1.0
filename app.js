// TELEtext RADIO - Sistema de SIMULACIÓN EN VIVO (Modo Demostración)
// Archivo: app.js
// Modo: Simulación sin reproducción de audio real

console.log('📻 Teletext Radio - Modo SIMULACIÓN inicializando...');

// ===== ELEMENTOS DEL DOM =====
const audio = document.getElementById('radioPlayer');
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
let currentSchedule = null;
let nextTrackTimeout = null;
let isAudioLoading = false;

// ===== DATOS DE HORARIOS =====
const programNames = {
    "madrugada": "Madrugada txt",
    "mañana": "Telesoft", 
    "tarde": "Radio 404",
    "mediatarde": "Floppy Disk",
    "noche": "Piratas Informaticos",
    "viernes_20_22": "Trasnoche Teletext",
    "viernes_22_01": "Trasnoche Teletext",
    "sabado_20_22": "Trasnoche Teletext",
    "sabado_22_01": "Trasnoche Teletext"
};

const scheduleConfig = {
    "timeZone": "America/Argentina/Buenos_Aires",
    "schedules": [
        {
            "name": "madrugada",
            "displayName": "Madrugada txt",
            "start": "01:00",
            "end": "06:00",
            "folder": "madrugada/",
            "startHour": 1
        },
        {
            "name": "mañana",
            "displayName": "Telesoft",
            "start": "06:00",
            "end": "12:00",
            "folder": "mañana/",
            "startHour": 6
        },
        {
            "name": "tarde",
            "displayName": "Radio 404",
            "start": "12:00",
            "end": "16:00",
            "folder": "tarde/",
            "startHour": 12
        },
        {
            "name": "mediatarde",
            "displayName": "Floppy Disk",
            "start": "16:00",
            "end": "20:00",
            "folder": "mediatarde/",
            "startHour": 16
        },
        {
            "name": "noche",
            "displayName": "Piratas Informaticos",
            "start": "20:00",
            "end": "01:00",
            "folder": "noche/",
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
            "folder": "especiales/viernes_20_22/",
            "startHour": 20
        },
        {
            "days": [5],
            "name": "viernes_22_01",
            "displayName": "Trasnoche Teletext",
            "start": "22:00",
            "end": "01:00",
            "folder": "especiales/viernes_22_01/",
            "startHour": 22
        },
        {
            "days": [6],
            "name": "sabado_20_22",
            "displayName": "Trasnoche Teletext",
            "start": "20:00",
            "end": "22:00",
            "folder": "especiales/sabado_20_22/",
            "startHour": 20
        },
        {
            "days": [6],
            "name": "sabado_22_01",
            "displayName": "Trasnoche Teletext",
            "start": "22:00",
            "end": "01:00",
            "folder": "especiales/sabado_22_01/",
            "startHour": 22
        }
    ]
};

// ===== FUNCIONES BÁSICAS =====
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

function getSecondsIntoCurrentBlock(schedule) {
    const now = getArgentinaTime();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    const currentTotalSeconds = (currentHour * 3600) + (currentMinute * 60) + currentSecond;
    const startTotalSeconds = schedule.startHour * 3600;
    
    let secondsIntoBlock;
    if (schedule.startHour > currentHour && schedule.startHour >= 20) {
        secondsIntoBlock = currentTotalSeconds + (24 * 3600) - startTotalSeconds;
    } else {
        secondsIntoBlock = currentTotalSeconds - startTotalSeconds;
    }
    
    return Math.max(0, secondsIntoBlock);
}

function calculateLiveStartPosition() {
    if (currentPlaylist.length === 0) {
        return { trackIndex: 0, startSeconds: 0 };
    }
    
    const secondsIntoBlock = getSecondsIntoCurrentBlock(currentSchedule);
    console.log(`⏱️ Segundos en bloque: ${secondsIntoBlock}s`);
    
    let totalDuration = 0;
    for (const track of currentPlaylist) {
        totalDuration += track.duration || 300;
    }
    
    if (totalDuration === 0) {
        return { trackIndex: 0, startSeconds: 0 };
    }
    
    const cyclicPosition = secondsIntoBlock % totalDuration;
    console.log(`🎯 Posición en lista: ${cyclicPosition}s/${totalDuration}s`);
    
    let accumulatedTime = 0;
    for (let i = 0; i < currentPlaylist.length; i++) {
        const trackDuration = currentPlaylist[i].duration || 300;
        
        if (cyclicPosition < accumulatedTime + trackDuration) {
            const startSeconds = cyclicPosition - accumulatedTime;
            console.log(`🎵 Canción ${i+1}: inicio en segundo ${Math.round(startSeconds)}`);
            return { trackIndex: i, startSeconds: startSeconds };
        }
        accumulatedTime += trackDuration;
    }
    
    return { trackIndex: 0, startSeconds: 0 };
}

// ===== CARGA DE PLAYLIST (MODIFICADA) =====
async function loadCurrentPlaylist() {
    currentSchedule = getCurrentSchedule();
    
    try {
        const response = await fetch(`${currentSchedule.folder}playlist.json`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
                currentPlaylist = data.tracks;
                console.log(`✅ Playlist cargada: ${currentPlaylist.length} canciones`);
                return true;
            }
        }
        
        // FALLBACK DE SIMULACIÓN (usa el primer archivo disponible)
        currentPlaylist = [{file: "automatnematod.mp3", duration: 300}];
        console.log('⚠️ Usando playlist de simulación');
        return false;
        
    } catch (error) {
        console.log('ℹ️ Error cargando playlist (simulación activada):', error.message);
        currentPlaylist = [{file: "automatnematod.mp3", duration: 300}];
        return false;
    }
}

// ===== CONTROL DE SIMULACIÓN (SIN AUDIO REAL) =====
function playLiveSimulation() {
    if (currentPlaylist.length === 0 || isAudioLoading) {
        console.log('⏸️ Simulación: No hay canciones o ya está cargando');
        return;
    }
    
    isAudioLoading = true;
    
    const { trackIndex, startSeconds } = calculateLiveStartPosition();
    const track = currentPlaylist[trackIndex];
    
    console.log(`🎧 SIMULACIÓN EN VIVO: "${track.file}" (seg. ${Math.round(startSeconds)})`);
    
    // SIMULACIÓN DE CARGA Y REPRODUCCIÓN
    setTimeout(() => {
        isPlaying = true;
        isAudioLoading = false;
        updatePlayButton();
        updateDisplayInfo();
        console.log("✅ Simulación EN VIVO activada");
        scheduleNextTrack(track.duration || 300, startSeconds);
    }, 800);
}

function scheduleNextTrack(trackDuration, startSeconds) {
    if (nextTrackTimeout) {
        clearTimeout(nextTrackTimeout);
    }
    
    const timeUntilNextTrack = (trackDuration - startSeconds) * 1000;
    console.log(`⏳ Siguiente canción en: ${Math.round(timeUntilNextTrack/1000)}s`);
    
    nextTrackTimeout = setTimeout(() => {
        if (isPlaying) {
            playNextTrack();
        }
    }, timeUntilNextTrack);
}

function playNextTrack() {
    if (currentPlaylist.length === 0 || isAudioLoading) {
        console.log('⏸️ Simulación: No hay canciones para continuar');
        return;
    }
    
    isAudioLoading = true;
    
    // Encontrar índice actual (simulado)
    let currentTrackIndex = 0;
    if (currentPlaylist.length > 1) {
        currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    }
    
    const nextIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    const track = currentPlaylist[nextIndex];
    
    console.log(`⏭️ SIMULACIÓN: Siguiente canción -> "${track.file}"`);
    
    // SIMULACIÓN DE CARGA DE SIGUIENTE CANCIÓN
    setTimeout(() => {
        isAudioLoading = false;
        console.log(`✅ Simulación siguiente activada`);
        scheduleNextTrack(track.duration || 300, 0);
    }, 800);
}

function togglePlay() {
    if (isPlaying) {
        // Pausar simulación
        isPlaying = false;
        updatePlayButton();
        updateDisplayInfo();
        
        if (nextTrackTimeout) {
            clearTimeout(nextTrackTimeout);
            nextTrackTimeout = null;
        }
        
        console.log('⏸️ Simulación pausada por usuario');
    } else {
        // Iniciar simulación
        if (currentPlaylist.length === 0) {
            loadCurrentPlaylist().then(() => {
                if (currentPlaylist.length > 0) {
                    playLiveSimulation();
                }
            });
        } else {
            playLiveSimulation();
        }
    }
}

// ===== INTERFAZ DE USUARIO =====
function updateDisplayInfo() {
    if (!currentSchedule) {
        currentSchedule = getCurrentSchedule();
    }
    
    const displayName = currentSchedule.displayName || programNames[currentSchedule.name] || currentSchedule.name;
    
    if (currentShow) {
        currentShow.textContent = isPlaying ? '🔴 EN VIVO' : displayName;
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
        playPath.setAttribute('opacity', '0');
        pausePath1.setAttribute('opacity', '1');
        pausePath2.setAttribute('opacity', '1');
        if (playButton) playButton.setAttribute('aria-label', 'Pausar');
    } else {
        playPath.setAttribute('opacity', '1');
        pausePath1.setAttribute('opacity', '0');
        pausePath2.setAttribute('opacity', '0');
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

// ===== INICIALIZACIÓN (SIN EVENTOS DE ERROR) =====
function init() {
    console.log('🎯 Iniciando sistema de SIMULACIÓN...');
    
    // Configurar controles
    if (playButton) {
        playButton.addEventListener('click', togglePlay);
    }
    
    if (shareButton) {
        shareButton.addEventListener('click', shareRadio);
    }
    
    // Configurar audio solo para simulación
    if (audio) {
        audio.volume = 0;
        // SOLO estos event listeners para simulación visual
        audio.addEventListener('play', () => {
            console.log('▶️ Evento de simulación: play');
        });
        
        audio.addEventListener('pause', () => {
            console.log('⏸️ Evento de simulación: pause');
        });
    }
    
    // Cargar playlist inicial y configurar actualizaciones
    loadCurrentPlaylist().then(() => {
        updateDisplayInfo();
        
        // Verificar cambios de horario cada minuto
        setInterval(() => {
            const oldScheduleName = currentSchedule ? currentSchedule.name : null;
            currentSchedule = getCurrentSchedule();
            
            if (oldScheduleName !== currentSchedule.name) {
                console.log(`🔄 Cambio de horario simulado: ${oldScheduleName} → ${currentSchedule.name}`);
                updateDisplayInfo();
                
                if (isPlaying) {
                    console.log('🔄 Recargando playlist por cambio de horario...');
                    loadCurrentPlaylist().then(() => {
                        if (!isAudioLoading) {
                            playLiveSimulation();
                        }
                    });
                }
            }
        }, 60000);
        
        // Actualizar display cada minuto
        setInterval(updateDisplayInfo, 60000);
    });
    
    console.log('✅ Sistema de SIMULACIÓN listo');
}

// ===== HERRAMIENTAS DE DEBUG (OPCIONAL) =====
window.debugRadio = {
    forceSchedule: async function(scheduleName) {
        console.log(`🧪 SIMULACIÓN DEBUG: Forzando horario ${scheduleName}`);
        
        const folders = {
            'madrugada': 'madrugada/',
            'mañana': 'mañana/',
            'tarde': 'tarde/',
            'mediatarde': 'mediatarde/',
            'noche': 'noche/',
            'viernes_20_22': 'especiales/viernes_20_22/',
            'viernes_22_01': 'especiales/viernes_22_01/',
            'sabado_20_22': 'especiales/sabado_20_22/',
            'sabado_22_01': 'especiales/sabado_22_01/'
        };
        
        const folder = folders[scheduleName] || 'tarde/';
        currentSchedule = {
            name: scheduleName,
            folder: folder,
            displayName: scheduleName,
            startHour: scheduleName.includes('madrugada') ? 1 : 
                      scheduleName.includes('mañana') ? 6 :
                      scheduleName.includes('tarde') ? 12 :
                      scheduleName.includes('mediatarde') ? 16 : 20
        };
        
        await loadCurrentPlaylist();
        
        if (currentShow && !isPlaying) {
            currentShow.textContent = scheduleName;
        }
        
        console.log(`✅ Horario forzado en simulación: ${scheduleName}`);
    },
    
    playNow: function() {
        if (playButton) {
            playButton.click();
        }
    },
    
    showInfo: function() {
        console.log('=== SIMULACIÓN DEBUG INFO ===');
        console.log('Reproduciendo:', isPlaying);
        console.log('Playlist:', currentPlaylist.length, 'canciones simuladas');
        console.log('Horario actual:', currentSchedule ? currentSchedule.name : 'N/A');
    }
};

// ===== EJECUCIÓN =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('📻 Teletext Radio - Sistema de SIMULACIÓN cargado');
