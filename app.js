// === TELEtext Radio - Sistema Automático (Sin playlist.json manual) ===

// ---- Estado del reproductor ----
let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let audio = document.getElementById('radioPlayer');
let isLoading = false;

// ---- Estado para horarios ----
let currentSchedule = null;
let lastCheckedHour = -1;

// ---- Elementos de la nueva interfaz ----
const playButton = document.getElementById('radioPlayButton');
const playPath = document.getElementById('playPath');
const pausePath1 = document.getElementById('pausePath1');
const pausePath2 = document.getElementById('pausePath2');
const currentShow = document.getElementById('currentShow');
const currentTimeName = document.getElementById('currentTimeName');
const currentTimeRange = document.getElementById('currentTimeRange');

// === FUNCIÓN: Determinar carpeta según hora ===
function getCurrentSchedule() {
    const now = new Date();
    const argentinaOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const offsetDiff = argentinaOffset + localOffset;
    const argentinaTime = new Date(now.getTime() + offsetDiff * 60000);
    
    const currentHour = argentinaTime.getHours();
    
    // Si ya verificamos esta hora, no recalcular
    if (currentHour === lastCheckedHour && currentSchedule) {
        return currentSchedule;
    }
    
    lastCheckedHour = currentHour;
    
    // Horarios fijos
    const schedules = [
        { name: "madrugada", start: 1, end: 6, folder: "music/madrugada/", displayName: "Madrugada txt" },
        { name: "manana", start: 6, end: 12, folder: "music/manana/", displayName: "Telesoft" },
        { name: "tarde", start: 12, end: 16, folder: "music/tarde/", displayName: "Radio 404" },
        { name: "mediatarde", start: 16, end: 20, folder: "music/mediatarde/", displayName: "Floppy Disk" },
        { name: "noche", start: 20, end: 1, folder: "music/noche/", displayName: "Piratas Informaticos" }
    ];
    
    const currentTime = argentinaTime.getHours() * 60 + argentinaTime.getMinutes();
    
    for (let schedule of schedules) {
        let startTime = schedule.start * 60;
        let endTime = schedule.end * 60;
        
        if (endTime < startTime) {
            endTime += 24 * 60;
            const adjustedCurrentTime = currentTime + (currentTime < startTime ? 24 * 60 : 0);
            if (adjustedCurrentTime >= startTime && adjustedCurrentTime < endTime) {
                return schedule;
            }
        } else {
            if (currentTime >= startTime && currentTime < endTime) {
                return schedule;
            }
        }
    }
    
    return schedules[2];
}

// === FUNCIÓN PRINCIPAL: Buscar MP3 en carpeta automáticamente ===
async function scanFolderForMP3s(folder) {
    try {
        // Intentar cargar playlist.json primero (si existe)
        const playlistResponse = await fetch(folder + "playlist.json");
        if (playlistResponse.ok) {
            const data = await playlistResponse.json();
            if (data.tracks && data.tracks.length > 0) {
                return data.tracks.map(track => ({
                    file: folder + track.file,
                    name: track.file
                }));
            }
        }
        
        // Si no hay playlist.json, intentar métodos alternativos
        console.log(`🔍 Escaneando ${folder} para MP3...`);
        
        // Método 1: Intentar cargar un índice (puede no funcionar en GitHub Pages)
        // Método 2: Lista de archivos conocidos
        const knownFiles = [
            "jazzcartel.mp3", "andresnewforu.mp3", "automatnematod.mp3", 
            "itsyoutlove.mp3", "toclimbthecliff.mp3", "doomsday.mp3"
        ];
        
        const availableFiles = [];
        
        // Verificar cuáles archivos existen
        for (const filename of knownFiles) {
            try {
                const response = await fetch(folder + filename, { method: 'HEAD' });
                if (response.ok) {
                    availableFiles.push({
                        file: folder + filename,
                        name: filename
                    });
                }
            } catch (e) {
                // Ignorar errores de verificación
            }
        }
        
        if (availableFiles.length > 0) {
            console.log(`✅ Encontrados ${availableFiles.length} archivos en ${folder}`);
            return availableFiles;
        }
        
        // Método 3: Si todo falla, usar archivos por defecto
        console.log(`⚠️ Usando archivos por defecto para ${folder}`);
        return [
            { file: "music/tarde/andresnewforu.mp3", name: "andresnewforu.mp3" },
            { file: "music/mediatarde/jazzcartel.mp3", name: "jazzcartel.mp3" }
        ];
        
    } catch (error) {
        console.error(`❌ Error escaneando ${folder}:`, error);
        // Archivos de emergencia
        return [
            { file: "music/tarde/andresnewforu.mp3", name: "andresnewforu.mp3" },
            { file: "music/mediatarde/jazzcartel.mp3", name: "jazzcartel.mp3" }
        ];
    }
}

// === Cargar playlist automáticamente ===
async function loadAutoPlaylist() {
    currentSchedule = getCurrentSchedule();
    console.log(`📻 Carpeta activa: ${currentSchedule.displayName} (${currentSchedule.folder})`);
    
    // Actualizar interfaz
    updateDisplayInfo();
    
    // Escanear carpeta para MP3
    const tracks = await scanFolderForMP3s(currentSchedule.folder);
    
    // Crear playlist
    playlist = tracks.map(track => track.file);
    
    if (playlist.length === 0) {
        console.error("❌ No se encontraron archivos MP3");
        return false;
    }
    
    console.log(`✅ ${playlist.length} archivos cargados automáticamente`);
    
    // Mezclar aleatoriamente
    shufflePlaylist();
    
    return true;
}

// === Funciones de reproducción (Simplificadas y Robustas) ===
function shufflePlaylist() {
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
}

// Sistema de cola para evitar conflictos
let playQueue = Promise.resolve();

function safePlay() {
    playQueue = playQueue
        .then(() => {
            return audio.play();
        })
        .then(() => {
            isPlaying = true;
            isLoading = false;
            updatePlayButton();
            if (currentShow) currentShow.textContent = '🔴 EN VIVO';
        })
        .catch(error => {
            console.error("Error en safePlay:", error);
            isLoading = false;
            // No reintentar automáticamente
        });
    
    return playQueue;
}

function loadTrack(index) {
    if (isLoading || index >= playlist.length) return;
    
    isLoading = true;
    currentIndex = index;
    const track = playlist[index];
    
    console.log(`🎵 Cargando: ${track}`);
    
    // Pausar y limpiar eventos anteriores
    audio.pause();
    
    // Configurar nueva fuente
    audio.src = track;
    audio.volume = 0.8;
    
    // Configurar eventos
    audio.onloadedmetadata = () => {
        console.log(`✅ Duración: ${Math.round(audio.duration)}s`);
    };
    
    audio.onended = () => {
        console.log("✅ Canción finalizada");
        setTimeout(() => playNextTrack(), 1000);
    };
    
    audio.onerror = () => {
        console.error(`❌ Error cargando: ${track}`);
        isLoading = false;
        setTimeout(() => playNextTrack(), 3000);
    };
    
    // Marcar como cargado
    isLoading = false;
}

function playNextTrack() {
    if (playlist.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % playlist.length;
    loadTrack(nextIndex);
    
    // Reproducir automáticamente si ya estaba reproduciendo
    if (isPlaying) {
        safePlay();
    }
}

// === Control principal ===
async function togglePlay() {
    if (playlist.length === 0) {
        // Primera vez: cargar playlist
        const loaded = await loadAutoPlaylist();
        if (!loaded) return;
        loadTrack(0);
    }
    
    if (!isPlaying || audio.paused) {
        // Si no hay fuente, cargar primera canción
        if (!audio.src) {
            loadTrack(0);
        }
        
        // Reproducir con sistema seguro
        safePlay();
    } else {
        // Pausar
        audio.pause();
        isPlaying = false;
        updatePlayButton();
        if (currentShow) currentShow.textContent = currentSchedule.displayName;
    }
}

// === Interfaz ===
function updateDisplayInfo() {
    if (!currentSchedule) return;
    
    if (currentShow) {
        currentShow.textContent = isPlaying ? '🔴 EN VIVO' : currentSchedule.displayName;
    }
    
    if (currentTimeName) {
        currentTimeName.textContent = currentSchedule.displayName;
    }
    
    if (currentTimeRange) {
        const format = (h) => {
            const period = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            return `${displayH} ${period}`;
        };
        
        let endHour = currentSchedule.end;
        if (endHour === 1) endHour = 25; // Para mostrar 1 AM como 1
        
        currentTimeRange.textContent = `${format(currentSchedule.start)} - ${format(endHour)}`;
    }
}

function updatePlayButton() {
    if (!playPath || !pausePath1 || !pausePath2) return;
    
    if (isPlaying && !audio.paused) {
        playPath.style.opacity = '0';
        pausePath1.style.opacity = '1';
        pausePath2.style.opacity = '1';
    } else {
        playPath.style.opacity = '1';
        pausePath1.style.opacity = '0';
        pausePath2.style.opacity = '0';
    }
}

// === Inicialización ===
document.addEventListener('DOMContentLoaded', () => {
    // Configurar botón
    if (playButton) {
        playButton.addEventListener('click', () => {
            togglePlay().catch(console.error);
        });
    }
    
    // Cargar y mostrar info inicial
    currentSchedule = getCurrentSchedule();
    updateDisplayInfo();
    
    // Verificar cambio de horario
    setInterval(() => {
        const oldSchedule = currentSchedule ? currentSchedule.name : null;
        currentSchedule = getCurrentSchedule();
        
        if (oldSchedule !== currentSchedule.name) {
            console.log(`🔄 Cambio de horario: ${oldSchedule} → ${currentSchedule.name}`);
            updateDisplayInfo();
            
            // Recargar playlist si estaba reproduciendo
            if (isPlaying) {
                loadAutoPlaylist().then(() => {
                    loadTrack(0);
                    safePlay();
                });
            }
        }
    }, 60000);
});

// === Botón de compartir ===
if (document.getElementById('shareRadioButton')) {
    document.getElementById('shareRadioButton').addEventListener('click', () => {
        navigator.clipboard.writeText('https://www.txtradio.site');
    });
}
