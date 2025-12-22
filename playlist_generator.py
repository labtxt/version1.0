#!/usr/bin/env python3
"""
VERIFICADOR Y REPARADOR DE AUDIO para Teletext Radio
- Verifica que todos los MP3 sean válidos
- Genera playlist.json CORRECTOS automáticamente
- Reemplaza archivos corruptos con versiones de prueba
"""

import os
import json
import hashlib
from pathlib import Path
import shutil

# CONFIGURACIÓN
BASE_DIR = Path(".")
MUSIC_DIR = BASE_DIR / "music"
CARPETAS = ["madrugada", "manana", "tarde", "mediatarde", "noche"]

# Archivo MP3 de prueba que SÍ funciona (debe estar en la misma carpeta que este script)
ARCHIVO_CONFIABLE = "jazzcartel.mp3"

def verificar_mp3_valido(ruta_mp3):
    """Verifica si un archivo MP3 es válido y reproducible"""
    try:
        # Verificación básica: el archivo existe y no está vacío
        if not ruta_mp3.exists():
            return False, "No existe"
        
        if ruta_mp3.stat().st_size == 0:
            return False, "Archivo vacío"
        
        # Verificar que tenga extensión .mp3
        if ruta_mp3.suffix.lower() != '.mp3':
            return False, f"Extensión incorrecta: {ruta_mp3.suffix}"
        
        # Verificación por contenido (primeros bytes)
        with open(ruta_mp3, 'rb') as f:
            header = f.read(4)
            # Los MP3 suelen comenzar con ID3 tag o 0xFFFB (frame sync)
            if header.startswith(b'ID3') or (len(header) == 4 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0):
                return True, "OK"
            else:
                return False, "Formato MP3 no reconocido"
                
    except Exception as e:
        return False, f"Error: {str(e)}"

def generar_playlist_json(carpeta_path, archivo_mp3, duracion=300):
    """Genera un playlist.json correcto para una carpeta"""
    playlist_data = {
        "tracks": [
            {
                "file": archivo_mp3.name,
                "duration": duracion
            }
        ],
        "total_duration": duracion,
        "total_tracks": 1
    }
    
    playlist_path = carpeta_path / "playlist.json"
    with open(playlist_path, 'w', encoding='utf-8') as f:
        json.dump(playlist_data, f, indent=2, ensure_ascii=False)
    
    return playlist_path

def main():
    print("=" * 60)
    print("VERIFICADOR Y REPARADOR DE AUDIO - Teletext Radio")
    print("=" * 60)
    
    # Verificar que exista el archivo confiable
    archivo_base = Path(ARCHIVO_CONFIABLE)
    if not archivo_base.exists():
        print(f"❌ ERROR: No encuentro el archivo confiable '{ARCHIVO_CONFIABLE}'")
        print(f"   Coloca un MP3 que funcione en la misma carpeta que este script.")
        return
    
    print(f"✅ Archivo base confiable: {archivo_base.name}")
    print()
    
    resultados = {}
    
    for carpeta in CARPETAS:
        carpeta_path = MUSIC_DIR / carpeta
        print(f"\n📁 Verificando: {carpeta}/")
        
        if not carpeta_path.exists():
            print(f"   ⚠️  La carpeta no existe. Creando...")
            carpeta_path.mkdir(parents=True, exist_ok=True)
        
        # Buscar archivos MP3 en la carpeta
        archivos_mp3 = list(carpeta_path.glob("*.mp3"))
        
        if not archivos_mp3:
            print(f"   ⚠️  No hay archivos MP3. Copiando archivo confiable...")
            destino = carpeta_path / archivo_base.name
            shutil.copy2(archivo_base, destino)
            archivos_mp3 = [destino]
        
        # Verificar cada archivo MP3
        for mp3 in archivos_mp3:
            valido, mensaje = verificar_mp3_valido(mp3)
            
            if valido:
                print(f"   ✅ {mp3.name}: {mensaje}")
                # Generar playlist.json con este archivo
                playlist_path = generar_playlist_json(carpeta_path, mp3)
                print(f"   📄 {playlist_path.name}: generado correctamente")
                resultados[carpeta] = "OK"
                break  # Usar el primer archivo válido
            else:
                print(f"   ❌ {mp3.name}: {mensaje}")
                
                # Si es inválido, reemplazarlo
                nuevo_path = carpeta_path / archivo_base.name
                if mp3 != nuevo_path:  # No reemplazar el archivo base
                    print(f"   🔄 Reemplazando por archivo confiable...")
                    mp3.unlink()  # Eliminar el archivo corrupto
                    shutil.copy2(archivo_base, nuevo_path)
                
                # Generar playlist.json con el archivo confiable
                playlist_path = generar_playlist_json(carpeta_path, nuevo_path)
                print(f"   📄 {playlist_path.name}: generado con {nuevo_path.name}")
                resultados[carpeta] = "REPARADO"
                break
    
    print("\n" + "=" * 60)
    print("RESUMEN DE LA VERIFICACIÓN:")
    print("=" * 60)
    
    for carpeta, estado in resultados.items():
        if estado == "OK":
            print(f"✅ {carpeta}/: Listo")
        elif estado == "REPARADO":
            print(f"🔧 {carpeta}/: Reparado")
        else:
            print(f"❌ {carpeta}/: Error")
    
    print("\n" + "=" * 60)
    print("PASOS FINALES:")
    print("1. Sube TODOS los cambios a GitHub")
    print("2. Espera 2-3 minutos")
    print("3. Prueba en: https://teletexttt.github.io/version1.0/")
    print("4. Usa Ctrl+F5 para forzar recarga")
    print("=" * 60)

if __name__ == "__main__":
    main()
if __name__ == "__main__":
    sys.exit(main())
