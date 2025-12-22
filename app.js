// TELEtext RADIO - REPRODUCTOR REAL (RUTAS CORREGIDAS)
console.log('📻 Teletext Radio - Iniciando...');

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

// ===== ESTADO =====
let isPlaying = false;
let currentPlaylist = [];
let currentTrackIndex = 0;
let currentSchedule = null;

// ===== CONFIGURACIÓN (RUTAS CORREGIDAS - SIN 'Ñ') =====
const scheduleConfig = {
    "timeZone": "America/Argentina/Buenos_Aires",
    "schedules": [
        { "name": "madrugada", "displayName": "Madrugada txt", "start": "01:00", "end": "06:00", "folder": "music/madrugada/", "startHour": 1 },
        { "name": "manana",    "displayName": "Telesoft",      "start": "06:00", "end": "12:00", "folder": "music/manana/",    "startHour": 6 },
        { "name": "tarde",     "displayName": "Radio 404",     "start": "12:00", "end": "16:00", "folder": "music/tarde/",     "startHour": 12 },
        { "name": "mediatarde","displayName": "Floppy Disk",   "start": "16:00", "end": "20:00", "folder": "music/mediatarde/","startHour": 16 },
        { "name": "noche",     "displayName": "Piratas Informaticos", "start": "20:00", "end": "01:00", "folder": "music/noche/", "startHour": 20 }
    ],
    "specialSchedules": [
        { "days": [5], "name": "viernes_20_22", "displayName": "Trasnoche Teletext", "start": "20:00", "end": "22:00", "folder": "music/especiales/viernes_20_22/", "startHour": 20 },
        { "days": [5], "name": "viernes_22_01", "displayName": "Trasnoche Teletext", "start": "22:00", "end": "01:00", "folder": "music/especiales/viernes_22_01/", "startHour": 22 },
        { "days": [6], "name": "sabado_20_22",  "displayName": "Trasnoche Teletext", "start": "20:00", "end": "22:00", "folder": "music/especiales/sabado_20_22/",  "startHour": 20 },
        { "days": [6], "name": "sabado_22_01",  "displayName": "Trasnoche Teletext", "start": "22:00", "end": "01:00", "folder": "music/especiales/sabado_22_01/",  "startHour": 22 }
    ]
};

// ===== FUNCIONES PRINCIPALES =====
function getArgentinaTime() {
    const now = new Date();
    const argentinaOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    return new Date(now.getTime() + (argentinaOffset + localOffset) * 60000);
}

function getCurrentSchedule() {
    const now = getArgentinaTime();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Horarios especiales (viernes y sábado)
    if (currentDay === 5 || currentDay === 6) {
        for (const special of scheduleConfig.specialSchedules) {
            if (special.days.includes(currentDay)) {
                const start = parseInt(special.start.split(':')[0]) * 60 + parseInt(special.start.split(':')[1]);
                let end = parseInt(special.end.split(':')[0]) * 60 + parseInt(special.end.split(':')[1]);
                if (end < start) end += 24 * 60;
                const adjustedCurrentTime = currentTime + (currentTime < start ? 24 * 60 : 0);
                if (adjustedCurrentTime >= start && adjustedCurrentTime < end) return special;
            }
        }
    }

    // Horarios regulares
    for (const regular of scheduleConfig.schedules) {
        const start = parseInt(regular.start.split(':')[0]) * 60 + parseInt(regular.start.split(':')[1]);
        let end = parseInt(regular.end.split(':')[0]) * 60 + parseInt(regular.end.split(':')[1]);
        if (end < start) end += 24 * 60;
        const adjustedCurrentTime = currentTime + (currentTime < start ? 24 * 60 : 0);
        if (adjustedCurrentTime >= start && adjustedCurrentTime < end) return regular;
    }

    return scheduleConfig.schedules[0];
}

async function loadCurrentPlaylist() {
    currentSchedule = getCurrentSchedule();
    try {
        const response = await fetch(currentSchedule.folder + 'playlist.json');
        const data = await response.json();
        currentPlaylist = data.tracks || [];
        if (currentPlaylist.length === 0) throw new Error('Playlist vacía');
        console.log(`✅ Playlist cargada: ${currentPlaylist.length} canciones (${currentSchedule.folder})`);
    } catch (error) {
        console.error('❌ Error cargando playlist:', error);
        // FALLBACK CRÍTICO: Si no hay playlist, usa una canción por defecto
        currentPlaylist = [{ file: 'andresnewforu.mp3', duration: 300 }];
    }
}

function playCurrentTrack() {
    if (currentPlaylist.length === 0) {
        console.error('No hay canciones en la playlist');
        return;
    }

    const track = currentPlaylist[currentTrackIndex];
    const audioPath = currentSchedule.folder + track.file;
    console.log(`🎵 Reproduciendo: ${audioPath}`);

    // Detener y cargar nueva fuente
    audioPlayer.pause();
    audioPlayer.src = audioPath;
    audioPlayer.volume = 0.8;

    // Intentar reproducir
    audioPlayer.play().then(() => {
        isPlaying = true;
        updatePlayButton();
        console.log('✅ Reproducción iniciada');
    }).catch(error => {
        console.error('❌ Error al reproducir:', error);
        // Intenta la siguiente canción en 2 segundos
        setTimeout(() => {
            currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
            playCurrentTrack();
        }, 2000);
    });
}

function playNextTrack() {
    if (currentPlaylist.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    playCurrentTrack();
}

function togglePlay() {
    if (!isPlaying) {
        if (currentPlaylist.length === 0) {
            loadCurrentPlaylist().then(playCurrentTrack);
        } else {
            playCurrentTrack();
        }
    } else {
        audioPlayer.pause();
        isPlaying = false;
        updatePlayButton();
    }
}

// ===== INTERFAZ =====
function updateDisplayInfo() {
    if (!currentSchedule) currentSchedule = getCurrentSchedule();
    if (currentShow) currentShow.textContent = isPlaying ? '🔴 EN VIVO' : currentSchedule.displayName;
    if (currentTimeName) currentTimeName.textContent = currentSchedule.displayName;
    if (currentTimeRange) {
        const format = t => { const [h,m] = t.split(':'); const h12 = h % 12 || 12; return `${h12}:${m} ${h >= 12 ? 'PM' : 'AM'}`; };
        currentTimeRange.textContent = `${format(currentSchedule.start)} - ${format(currentSchedule.end)}`;
    }
}

function updatePlayButton() {
    if (!playPath || !pausePath1 || !pausePath2) return;
    if (isPlaying) {
        playPath.style.opacity = '0'; pausePath1.style.opacity = '1'; pausePath2.style.opacity = '1';
        playButton.setAttribute('aria-label', 'Pausar');
    } else {
        playPath.style.opacity = '1'; pausePath1.style.opacity = '0'; pausePath2.style.opacity = '0';
        playButton.setAttribute('aria-label', 'Reproducir');
    }
}

// ===== INICIALIZACIÓN =====
function init() {
    console.log('🎯 Inicializando reproductor...');
    playButton.addEventListener('click', togglePlay);
    audioPlayer.addEventListener('ended', playNextTrack);
    audioPlayer.addEventListener('error', (e) => {
        console.error('❌ Error de audio:', e);
        setTimeout(playNextTrack, 2000);
    });

    loadCurrentPlaylist().then(updateDisplayInfo);
    setInterval(() => {
        const oldName = currentSchedule?.name;
        currentSchedule = getCurrentSchedule();
        if (oldName !== currentSchedule.name) {
            console.log(`🔄 Cambio de horario: ${oldName} → ${currentSchedule.name}`);
            updateDisplayInfo();
            if (isPlaying) {
                loadCurrentPlaylist().then(() => {
                    currentTrackIndex = 0;
                    playCurrentTrack();
                });
            }
        }
    }, 60000);

    console.log('✅ Reproductor listo');
}

// ===== EJECUCIÓN =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
