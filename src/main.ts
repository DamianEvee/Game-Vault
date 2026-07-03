// src/main.ts
import './styles.css';
import { invoke } from '@tauri-apps/api/core';

interface Videojuego {
  id?: number | null;
  titulo: string;
  plataforma: string;
  precioOriginal: number;
  precioPagado: number;
  resena: string;
  estrellas: number;
  caratulaUrl: string;
}

interface VideojuegoRust {
  id?: number | null;
  titulo: string;
  plataforma: string;
  precio_original: number;
  precio_pagado: number;
  resena: string;
  estrellas: number;
  caratula_url: string;
}

let miColeccionJuegos: Videojuego[] = [];
let juegoPendienteEliminarId: number | null = null;

function fillPlatformGrid(gridElement: HTMLElement, totalGames: number, colorHex: string) {
  gridElement.innerHTML = '';
  const totalSquares = 160;

  for (let i = 0; i < totalSquares; i++) {
    const square = document.createElement('div');
    square.classList.add('grid-square');

    if (i < totalGames) {
      square.style.backgroundColor = colorHex;
    } else {
      square.style.backgroundColor = '#22232b';
    }
    gridElement.appendChild(square);
  }
}

function actualizarDashboardDinamico() {
  const container = document.getElementById('dashboard-platforms-container');
  if (!container) return;

  container.innerHTML = '';

  const plataformasConfig = [
    { nombre: 'Steam', color: '#00bfff' },
    { nombre: 'XBOX', color: '#107c10' },
    { nombre: 'PlayStation', color: '#00439c' },
    { nombre: 'Nintendo', color: '#e60012' },
    { nombre: 'Epic Games', color: '#9b51e0' }
  ];

  let plataformasDibujadas = 0;

  plataformasConfig.forEach(plat => {
    const cantidadJuegos = miColeccionJuegos.filter(juego => juego.plataforma === plat.nombre).length;

    if (cantidadJuegos > 0) {
      plataformasDibujadas++;

      const cardBlock = document.createElement('div');
      cardBlock.classList.add('dashboard-card');
      cardBlock.innerHTML = `
        <div class="dashboard-card-header">
          <span class="platform-dot" style="background-color: ${plat.color}; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px;"></span>
          <h3 style="display: inline; margin: 0; font-size: 16px; color: #fff;">${plat.nombre}</h3>
          <span style="color: #8a8d98; font-size: 13px; margin-left: 10px;">(${cantidadJuegos} ${cantidadJuegos === 1 ? 'juego' : 'juegos'})</span>
        </div>
        <div id="grid-${plat.nombre.replace(/\s+/g, '')}" class="platform-grid" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 12px;"></div>
      `;

      container.appendChild(cardBlock);

      const gridId = `grid-${plat.nombre.replace(/\s+/g, '')}`;
      const gridElement = document.getElementById(gridId);
      if (gridElement) {
        fillPlatformGrid(gridElement, cantidadJuegos, plat.color);
      }
    }
  });

  if (plataformasDibujadas === 0) {
    container.innerHTML = `
      <p style="color: #656874; text-align: center; width: 100%; padding-top: 40px; font-size: 14px;">
        Tu historial está en blanco. Ve a la pestaña Biblioteca y añade un juego para ver tus estadísticas.
      </p>
    `;
  }
}

//Eliminar 
async function eliminarJuegoCompleto(id: number) {
  try {
    await invoke('eliminar_videojuego', { id: Number(id) });
    await cargarBibliotecaDesdeBackend();
  } catch (error) { }
}

function renderLibraryGames() {
  const grid = document.getElementById('library-games-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (miColeccionJuegos.length === 0) {
    grid.innerHTML = `
      <p style="color: #656874; grid-column: 1/-1; text-align: center; padding-top: 40px; font-size: 14px;">
        No hay juegos en tu biblioteca. ¡Pulsa "+ Añadir Juego" para empezar!
      </p>
    `;
    return;
  }

  miColeccionJuegos.forEach(juego => {
    const card = document.createElement('div');
    card.classList.add('game-card');
    card.style.position = 'relative';

    let platColor = '#00bfff';
    if (juego.plataforma === 'Epic Games') platColor = '#9b51e0';
    if (juego.plataforma === 'XBOX') platColor = '#107c10';
    if (juego.plataforma === 'PlayStation') platColor = '#00439c';
    if (juego.plataforma === 'Nintendo') platColor = '#e60012';

    // Inyectamos el HTML de la tarjeta
    card.innerHTML = `
      <button class="delete-btn">✕</button>
      <img src="${juego.caratulaUrl}" class="game-card-cover" alt="Carátula" />
      <div class="game-card-info">
        <span class="game-card-platform" style="background-color: ${platColor}; color: #fff;">${juego.plataforma}</span>
        <div class="game-card-title" style="color: #fff; margin-top: 4px;">${juego.titulo}</div>
        <div class="game-card-stars" style="color: #ffcc00; margin: 2px 0;">${'★'.repeat(juego.estrellas)}${'☆'.repeat(5 - juego.estrellas)}</div>
        <div class="game-card-prices" style="font-size: 13px; color: #8a8d98;">
          <span style="text-decoration: line-through; font-size: 11px; margin-right: 4px;">${juego.precioOriginal.toFixed(2)}€</span>
          <span style="color: #fff; font-weight: bold;">${juego.precioPagado.toFixed(2)}€</span>
        </div>
      </div>
    `;

    // Asignamos el evento CLICK de manera nativa y directa al botón
    const btnDelete = card.querySelector('.delete-btn') as HTMLButtonElement;
    btnDelete.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (juego.id !== undefined && juego.id !== null) {
        //Abrir modal al hacer click eliminar
        mostrarModalEliminacion(juego.id, juego.titulo);
      } else {
        console.error("Este juego no tiene un ID válido de SQLite");
      }
    });

    grid.appendChild(card);
  });
}

// Configura las validaciones nativas de los inputs de los precios en el HTML
function configurarValidacionPrecios() {
  const pOriginal = document.getElementById('game-price-original') as HTMLInputElement;
  const pPagado = document.getElementById('game-price-paid') as HTMLInputElement;

  if (pOriginal && pPagado) {
    [pOriginal, pPagado].forEach(input => {
      input.type = 'number';
      input.min = '0';
      input.step = '0.01';

      input.addEventListener('keydown', (e) => {
        if (['e', 'E', '+', '-'].includes(e.key)) {
          e.preventDefault();
        }
      });
    });
  }
}

async function cargarBibliotecaDesdeBackend() {
  try {
    const juegosDesdeRust = await invoke<VideojuegoRust[]>('obtener_biblioteca');

    miColeccionJuegos = juegosDesdeRust.map(j => ({
      id: j.id,
      titulo: j.titulo,
      plataforma: j.plataforma,
      precioOriginal: j.precio_original,
      precioPagado: j.precio_pagado,
      resena: j.resena,
      estrellas: j.estrellas,
      caratulaUrl: j.caratula_url
    }));

    renderLibraryGames();
    actualizarDashboardDinamico();
  } catch (error) {
    console.error("Error al obtener la biblioteca desde Rust/SQLite:", error);
  }
}

function setupNavigation() {
  const btnDashboard = document.getElementById('menu-dashboard');
  const btnBiblioteca = document.getElementById('menu-biblioteca');
  const viewDashboard = document.getElementById('view-dashboard');
  const viewBiblioteca = document.getElementById('view-biblioteca');

  btnDashboard?.addEventListener('click', (e) => {
    e.preventDefault();
    btnDashboard.classList.add('active');
    btnBiblioteca?.classList.remove('active');
    viewDashboard?.classList.remove('hidden');
    viewBiblioteca?.classList.add('hidden');
  });

  btnBiblioteca?.addEventListener('click', (e) => {
    e.preventDefault();
    btnBiblioteca.classList.add('active');
    btnDashboard?.classList.remove('active');
    viewBiblioteca?.classList.remove('hidden');
    viewDashboard?.classList.add('hidden');
  });
}

function setupFormToggle() {
  const btnOpen = document.getElementById('btn-open-add-game');
  const btnCancel = document.getElementById('btn-cancel-game');
  const form = document.getElementById('add-game-form');

  if (!btnOpen || !btnCancel || !form) return;

  btnOpen.addEventListener('click', () => {
    form.classList.remove('hidden');
  });

  btnCancel.addEventListener('click', () => {
    form.classList.add('hidden');
  });
}

function setupStarsSelector() {
  const container = document.getElementById('stars-selector');
  if (!container) return;

  const stars = container.querySelectorAll('span');

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.getAttribute('data-value') || '0');
      container.setAttribute('data-rating', val.toString());

      stars.forEach(s => {
        const sVal = parseInt(s.getAttribute('data-value') || '0');
        if (sVal <= val) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });
  });
}

function setupFormSubmit() {
  const form = document.getElementById('add-game-form') as HTMLFormElement;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = (document.getElementById('game-title') as HTMLInputElement).value;
    const plataforma = (document.getElementById('game-platform') as HTMLSelectElement).value;
    const precioOriginal = parseFloat((document.getElementById('game-price-original') as HTMLInputElement).value) || 0;
    const precioPagado = parseFloat((document.getElementById('game-price-paid') as HTMLInputElement).value) || 0;
    const resena = (document.getElementById('game-review') as HTMLTextAreaElement).value;
    const estrellas = parseInt(document.getElementById('stars-selector')?.getAttribute('data-rating') || '0');
    const coverInput = document.getElementById('game-cover') as HTMLInputElement;

    let caratulaUrl = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop';

    if (coverInput && coverInput.files && coverInput.files[0]) {
      caratulaUrl = URL.createObjectURL(coverInput.files[0]);
    }

    const nuevoJuegoRust: VideojuegoRust = {
      titulo,
      plataforma,
      precio_original: precioOriginal,
      precio_pagado: precioPagado,
      resena,
      estrellas,
      caratula_url: caratulaUrl
    };

    try {
      await invoke<string>('guardar_videojuego', { juego: nuevoJuegoRust });
      await cargarBibliotecaDesdeBackend();

      form.reset();
      form.classList.add('hidden');
      document.getElementById('stars-selector')?.setAttribute('data-rating', '0');
      document.getElementById('stars-selector')?.querySelectorAll('span').forEach(s => s.classList.remove('active'));
    } catch (error) {
      console.error("Error al intentar guardar el juego a través de Rust:", error);
    }
  });
}
//Modal confirmacion de eliminacion de juego
function mostrarModalEliminacion(id: number, titulo: string) {
  juegoPendienteEliminarId = id;
  const modal = document.getElementById('delete-modal');
  const modalText = document.getElementById('delete-modal-text');

  if (modal && modalText) {
    modalText.innerHTML = `Acabas de solicitar la eliminación del juego <strong>"${titulo}"</strong> de tu colección de videojuegos, ¿procedemos con la extinción?`;
    modal.classList.remove('hidden');
  }
}

function cerrarModalEliminacion() {
  juegoPendienteEliminarId = null;
  const modal = document.getElementById('delete-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupFormToggle();
  setupStarsSelector();
  setupFormSubmit();
  configurarValidacionPrecios();

  // Listeners para el Modal de Extinción
  const btnConfirmarExtincion = document.getElementById('btn-confirm-delete');
  const btnCancelarExtincion = document.getElementById('btn-cancel-delete');

  if (btnConfirmarExtincion) {
    btnConfirmarExtincion.addEventListener('click', () => {
      if (juegoPendienteEliminarId !== null) {
        eliminarJuegoCompleto(juegoPendienteEliminarId);
        cerrarModalEliminacion();
      }
    });
  }

  if (btnCancelarExtincion) {
    btnCancelarExtincion.addEventListener('click', cerrarModalEliminacion);
  }

  // Establecemos el Listener fijo al iniciar la App una única vez

  cargarBibliotecaDesdeBackend();
});