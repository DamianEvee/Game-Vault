// src-tauri/src/main.rs
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// ==========================================
// BLOQUE 1: El Modelo de Datos y el Estado
// ==========================================

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Videojuego {
    pub id: Option<i64>,
    pub titulo: String,
    pub plataforma: String,
    pub precio_original: f64,
    pub precio_pagado: f64,
    pub resena: String,
    pub estrellas: i32,
    pub caratula_url: String,
}

pub struct AppState {
    pub db: Mutex<Connection>,
}

fn inicializar_db() -> Connection {
    let conn = Connection::open("game_vault.db")
        .expect("No se pudo abrir o crear la base de datos SQLite");

    conn.execute(
        "CREATE TABLE IF NOT EXISTS videojuegos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            plataforma TEXT NOT NULL,
            precio_original REAL NOT NULL,
            precio_pagado REAL NOT NULL,
            resena TEXT,
            estrellas INTEGER NOT NULL,
            caratula_url TEXT
        )",
        [],
    )
    .expect("Error al inicializar la tabla de videojuegos");

    conn
}

// ==========================================
// BLOQUE 2: Los Comandos
// ==========================================

#[tauri::command]
fn guardar_videojuego(juego: Videojuego, state: tauri::State<AppState>) -> Result<String, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al bloquear la base de datos".to_string())?;

    conn.execute(
        "INSERT INTO videojuegos (titulo, plataforma, precio_original, precio_pagado, resena, estrellas, caratula_url) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (
            &juego.titulo,
            &juego.plataforma,
            &juego.precio_original,
            &juego.precio_pagado,
            &juego.resena,
            &juego.estrellas,
            &juego.caratula_url,
        ),
    ).map_err(|e| format!("Error al insertar el juego: {}", e))?;

    Ok(format!(
        "¡'{}' guardado correctamente en tu Mac!",
        juego.titulo
    ))
}

#[tauri::command]
fn obtener_biblioteca(state: tauri::State<AppState>) -> Result<Vec<Videojuego>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al bloquear la base de datos".to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, titulo, plataforma, precio_original, precio_pagado, resena, estrellas, caratula_url FROM videojuegos")
        .map_err(|e| e.to_string())?;

    let videojuegos_iter = stmt
        .query_map([], |row| {
            Ok(Videojuego {
                id: Some(row.get(0)?),
                titulo: row.get(1)?,
                plataforma: row.get(2)?,
                precio_original: row.get(3)?,
                precio_pagado: row.get(4)?,
                resena: row.get(5)?,
                estrellas: row.get(6)?,
                caratula_url: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut lista_juegos = Vec::new();
    for juego in videojuegos_iter {
        if let Ok(j) = juego {
            lista_juegos.push(j);
        }
    }

    Ok(lista_juegos)
}

// Elimina un videojuego usando su ID único de la base de datos de manera robusta
#[tauri::command]
fn eliminar_videojuego(id: i64, state: tauri::State<AppState>) -> Result<String, String> {
    println!("Eliminando de SQLite el juego con ID: {}", id);
    let conn = state
        .db
        .lock()
        .map_err(|_| "Error al bloquear la base de datos".to_string())?;

    // Usamos 'execute' y validamos cuántas filas se borraron para atrapar errores silenciosos
    let filas_afectadas = conn
        .execute("DELETE FROM videojuegos WHERE id = ?1", [&id])
        .map_err(|e| format!("Error al borrar de SQLite: {}", e))?;

    if filas_afectadas == 0 {
        return Err(format!(
            "No se encontró en SQLite ningún juego con el ID {}",
            id
        ));
    }

    Ok("Juego eliminado con éxito".to_string())
}

// ==========================================
// BLOQUE 3: Punto de Entrada de la App
// ==========================================

fn main() {
    let conexion_db = inicializar_db();

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(conexion_db),
        })
        .invoke_handler(tauri::generate_handler![
            guardar_videojuego,
            obtener_biblioteca,
            eliminar_videojuego
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
