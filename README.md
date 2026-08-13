# Buscaminas de Seba

Buscaminas clásico, totalmente estático y listo para GitHub Pages.

## Incluye

- Marca propia: **Buscaminas de Seba / Seba's Arcade**.
- Tres dificultades:
  - Principiante: 9 × 9, 10 minas.
  - Intermedio: 16 × 16, 40 minas.
  - Experto: 16 × 30, 99 minas.
- Primera jugada segura.
- Cronómetro.
- Contador de minas/banderas.
- Click derecho para banderas.
- Pulsación larga en celular para banderas.
- Doble click sobre una casilla numérica para abrir alrededor si las banderas coinciden.
- Apertura automática de zonas vacías.
- Detección de victoria y derrota.
- Récord de tiempo por dificultad con `localStorage`.
- Modo claro y oscuro.
- Diseño responsive.

## Cómo abrir

No necesita Node.js ni npm.

1. Descomprime la carpeta.
2. Abre `index.html`.

## Publicar con GitHub Pages

1. Crea un repositorio.
2. Sube:
   - `index.html`
   - `style.css`
   - `game.js`
   - `README.md`
3. Ve a **Settings → Pages**.
4. Usa **Deploy from a branch**.
5. Rama `main`, carpeta `/ (root)`.
6. Guarda.

## Nota técnica

Las minas se colocan solo después de la primera jugada.
La primera casilla y las ocho casillas alrededor se excluyen de la selección de minas, evitando perder en el primer click.
