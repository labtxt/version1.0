#!/usr/bin/env python3
"""
GENERADOR AUTOMÁTICO de playlists para Teletext Radio
- Escanea cada carpeta y lista TODOS los archivos .mp3
- Genera playlist.json automáticamente
"""

import os
import json
from pathlib import Path

# Configuración
BASE_DIR = Path(".")
MUSIC_DIR = BASE_DIR / "music"
CARPETAS = ["madrugada", "manana", "tarde", "mediatarde", "noche"]
DURACION_POR_DEFECTO = 300  # segundos (5 minutos)

def generar_playlist_automatico(carpeta_path):
    """Genera playlist.json con TODOS los MP3 de la carpeta"""
    
    # Buscar TODOS los archivos .mp3 (insensible a mayúsculas)
    archivos_mp3 = []
    for ext in ['.mp3', '.MP3', '.Mp3', '.mP3']:
        archivos_mp3.extend(carpeta_path.glob(f"*{ext}"))
    
    # Eliminar duplicados (por si hay .mp3 y .MP3 del mismo archivo)
    archivos_mp3 = list(set(archivos_mp3))
    
    if not archivos_mp3:
        print(f"   ⚠️  No hay archivos MP3 en {carpeta_path.name}/")
        return None
    
    # Crear lista de tracks
    tracks = []
    for mp3 in sorted(archivos_mp3):
        tracks.append({
            "file": mp3.name,  # Solo el nombre del archivo
            "duration": DURACION_POR_DEFECTO
        })
    
    # Crear estructura del playlist
    playlist_data = {
        "tracks": tracks,
        "total_duration": len(tracks) * DURACION_POR_DEFECTO,
        "total_tracks": len(tracks)
    }
    
    # Guardar playlist.json
    playlist_path = carpeta_path / "playlist.json"
    with open(playlist_path, 'w', encoding='utf-8') as f:
        json.dump(playlist_data, f, indent=2, ensure_ascii=False)
    
    return playlist_path

def main():
    print("=" * 60)
    print("GENERADOR AUTOMÁTICO DE PLAYLISTS - Teletext Radio")
    print("=" * 60)
    
    resultados = {}
    
    for carpeta in CARPETAS:
        carpeta_path = MUSIC_DIR / carpeta
        print(f"\n📁 Procesando: {carpeta}/")
        
        # Crear carpeta si no existe
        carpeta_path.mkdir(parents=True, exist_ok=True)
        
        # Generar playlist automático
        playlist_path = generar_playlist_automatico(carpeta_path)
        
        if playlist_path:
            # Mostrar qué archivos encontró
            with open(playlist_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print(f"   ✅ {len(data['tracks'])} archivos MP3 encontrados:")
            for track in data['tracks']:
                print(f"      • {track['file']}")
            
            resultados[carpeta] = len(data['tracks'])
        else:
            resultados[carpeta] = 0
    
    print("\n" + "=" * 60)
    print("RESUMEN:")
    print("=" * 60)
    
    for carpeta, cantidad in resultados.items():
        if cantidad > 0:
            print(f"✅ {carpeta}/: {cantidad} archivos MP3")
        else:
            print(f"⚠️  {carpeta}/: SIN archivos MP3 (agrega algunos)")
    
    print("\n📋 INSTRUCCIONES:")
    print("1. Ejecuta este script cada vez que agregues nuevos MP3")
    print("2. Sube los cambios a GitHub")
    print("3. La radio usará AUTOMÁTICAMENTE todos los MP3")
    print("=" * 60)

if __name__ == "__main__":
    main()
