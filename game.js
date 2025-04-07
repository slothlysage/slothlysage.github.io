import init, { Universe } from "./game-of-life/wasm_game_of_life.js?v=2";

const wasm = await init();
const memory = wasm.memory;

const CELL_SIZE = 5;
// (rest of your config...)

const universe = Universe.new(64);
const width = universe.width();
const height = universe.height();

const canvas = document.getElementById("game-of-life-canvas");
canvas.width = (CELL_SIZE + 1) * width + 1;
canvas.height = (CELL_SIZE + 1) * height + 1;

canvas.style.width = `${canvas.width}px`;
canvas.style.height = `${canvas.height}px`;

const ctx = canvas.getContext('2d');

let isPaused = true;
let lastFrameTime = 0;
let frameCount = 0;
let maxFps = 60;
let lastFpsUpdate = performance.now();
let sizePower = 6;
const toggleBtn = document.getElementById("toggle");
const resetBtn = document.getElementById("reset");
const maxFpsDisplay = document.getElementById("max-fps-display");
const fpsSlider = document.getElementById("fps-slider");
const fpsDisplay = document.getElementById("fps-display");

let accumulator = 0;
let timestep = 1000 / maxFps;

const gameLoop = (timestamp) => {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    accumulator += delta;

    while (accumulator >= timestep) {
        if (!isPaused) {
            universe.tick();
            frameCount++;
            drawCells();
            drawGrid();
        }
        accumulator -= timestep;
    }

    if (timestamp - lastFpsUpdate >= 1000) {
        fpsDisplay.textContent = `FPS: ${frameCount}`;
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }

    requestAnimationFrame(gameLoop)
}

// Button handlers
toggleBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    toggleBtn.textContent = isPaused ? "▶️ Resume" : "⏸️ Pause";
});

resetBtn.addEventListener("click", () => {
    universe.randomize();
    drawCells();
    drawGrid();
});

canvas.addEventListener("click", (event) => {
    // Ignore if canvas is hidden (like in collapsed <details>)
    if (canvas.offsetParent === null) return;
  
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
  
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
  
    const row = Math.min(Math.floor(canvasY / (CELL_SIZE + 1)), height - 1);
    const col = Math.min(Math.floor(canvasX / (CELL_SIZE + 1)), width - 1);
  
    universe.toggle_cell(row, col);
    drawCells();
    drawGrid();
  });

fpsSlider.addEventListener("input", () => {
    maxFps = parseInt(fpsSlider.value);
    maxFpsDisplay.textContent = `max FPS: ${maxFps}`;
    timestep = 1000 / maxFps;
});

// function randomColorBetween(startRGB, endRGB) {
//     const r = Math.floor(Math.random() * (endRGB[0] - startRGB[0]) + startRGB[0]);
//     const g = Math.floor(Math.random() * (endRGB[1] - startRGB[1]) + startRGB[1]);
//     const b = Math.floor(Math.random() * (endRGB[2] - startRGB[2]) + startRGB[2]);
//     return `rgb(${r}, ${g}, ${b})`;
// }

function jitterColor(baseRGB, amount = 5) {
    const clamp = (val) => Math.max(0, Math.min(255, val));
    const r = clamp(baseRGB[0] + Math.floor((Math.random() * 2 - 1) * amount));
    const g = clamp(baseRGB[1] + Math.floor((Math.random() * 2 - 1) * amount));
    const b = clamp(baseRGB[2] + Math.floor((Math.random() * 2 - 1) * amount));
    return `rgb(${r}, ${g}, ${b})`;
}

const drawGrid = () => {
    ctx.beginPath();
    ctx.strokeStyle = "#CCCCCC";

    for (let i = 0; i <= width; i++) {
        ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
        ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
    }

    for (let j = 0; j <= height; j++) {
        ctx.moveTo(0, j * (CELL_SIZE + 1) + 1);
        ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
    }

    ctx.stroke();
};

const getIndex = (row, column) => {
    return row * width + column;
};

const bitIsSet = (n, arr) => {
    const byte = Math.floor(n / 8);
    const mask = 1 << (n % 8);
    return (arr[byte] & mask) === mask;
};

const drawCells = () => {
    const cellsPtr = universe.cells();

    const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

    ctx.beginPath();

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const idx = getIndex(row, col);
            const isAlive = bitIsSet(idx, cells);

            // const aliveColor = randomColorBetween([200, 130, 240], [160, 120, 230]);
            // const deadColor = randomColorBetween([255, 190, 200], [255, 180, 190]);
            const aliveColor = jitterColor([200, 130, 240]);
            const deadColor = jitterColor([255, 190, 200]);
      
            ctx.fillStyle = isAlive ? aliveColor : deadColor;
            ctx.fillRect(
                col * (CELL_SIZE + 1) + 1,
                row * (CELL_SIZE + 1) + 1,
                CELL_SIZE,
                CELL_SIZE
            );
        }
    }

    ctx.stroke();
}

drawCells();
drawGrid();
// Only run the animation if <details> is opened
document.getElementById("gol-container").addEventListener("toggle", (e) => {
  if (e.target.open) {
    requestAnimationFrame(gameLoop);
  }
});
