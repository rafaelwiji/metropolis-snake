const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 25;
const GRID_WIDTH = canvas.width / GRID_SIZE;  
const GRID_HEIGHT = canvas.height / GRID_SIZE; 

const COLOR_SKY_TOP = [10, 15, 30];
const COLOR_SKY_BOTTOM = [25, 35, 65];
const COLOR_BUILDING = '#0f1423';
const COLOR_WINDOW = '#ffdc78';
const COLOR_SUIT_BLUE = '#0096ff';
const COLOR_SUIT_DARK = '#0050b4';
const COLOR_CAPE_NEON = [255, 35, 75];
const COLOR_GOLD_SHIELD = '#ffc800';
const COLOR_MASK_DARK = '#0f141e';
const COLOR_EYE_GLOW = '#00fff0';
const COLOR_KRYPTONITE = [0, 255, 128];
const COLOR_SPECIAL_FOOD = [255, 215, 0];

let snake = [];
let direction = [1, 0];
let nextDirection = [1, 0];
let growPending = 0;
let score = 0;
let gameStarted = false;
let gameOver = false;

let lastMoveTime = 0;
let moveInterval = 110; 

let food = { x: 0, y: 0, isSpecial: false, angle: 0 };
let burstParticles = [];
let floatingTexts = [];
let flashAlpha = 0;
let buildings = [];

class BurstParticle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 4 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = Math.random() * 3 + 3;
        this.alpha = 255;
        this.color = color;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.alpha -= 12;
        this.radius = Math.max(0, this.radius - 0.1);
    }
    draw() {
        if (this.alpha > 0 && this.radius > 0) {
            ctx.save();
            ctx.globalAlpha = this.alpha / 255;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y;
        this.text = text; this.color = color;
        this.alpha = 255;
    }
    update() {
        this.y -= 1.2;
        this.alpha -= 8;
    }
    draw() {
        if (this.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.alpha / 255;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x, this.y);
            ctx.restore();
        }
    }
}

class Building {
    constructor(x, width, height) {
        this.x = x; this.width = width; this.height = height;
        this.windows = [];
        for (let wx = x + 4; wx < x + width - 8; wx += 10) {
            for (let wy = canvas.height - height + 8; wy < canvas.height - 10; wy += 14) {
                if (Math.random() < 0.6) this.windows.push({ x: wx, y: wy });
            }
        }
    }
    draw() {
        ctx.fillStyle = COLOR_BUILDING;
        ctx.fillRect(this.x, canvas.height - this.height, this.width, this.height);
        ctx.fillStyle = COLOR_WINDOW;
        this.windows.forEach(w => ctx.fillRect(w.x, w.y, 5, 7));
    }
}

function generateCitySkyline() {
    buildings = [];
    let currX = 0;
    while (currX < canvas.width) {
        let w = Math.floor(Math.random() * 30) + 35;
        let h = Math.floor(Math.random() * 200) + 120;
        buildings.push(new Building(currX, w, h));
        currX += w - 2;
    }
}

function drawBackground() {
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, `rgb(${COLOR_SKY_TOP.join(',')})`);
    grad.addColorStop(1, `rgb(${COLOR_SKY_BOTTOM.join(',')})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    buildings.forEach(b => b.draw());

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function resetGame() {
    snake = [
        [Math.floor(GRID_WIDTH / 2), Math.floor(GRID_HEIGHT / 2)],
        [Math.floor(GRID_WIDTH / 2) - 1, Math.floor(GRID_HEIGHT / 2)],
        [Math.floor(GRID_WIDTH / 2) - 2, Math.floor(GRID_HEIGHT / 2)]
    ];
    direction = [1, 0];
    nextDirection = [1, 0];
    growPending = 0;
    score = 0;
    moveInterval = 110;
    gameOver = false;
    document.getElementById('score-val').textContent = score;
    spawnFood();
}

function spawnFood() {
    while (true) {
        let x = Math.floor(Math.random() * GRID_WIDTH);
        let y = Math.floor(Math.random() * GRID_HEIGHT);
        let inBody = snake.some(s => s[0] === x && s[1] === y);
        if (!inBody) {
            food.x = x; food.y = y;
            food.isSpecial = Math.random() < 0.25;
            break;
        }
    }
}

function updateDirection(dx, dy) {
    if (dx !== -direction[0] || dy !== -direction[1]) {
        nextDirection = [dx, dy];
    }
}

function moveSnake() {
    direction = nextDirection;
    let head = snake[0];
    let newHead = [head[0] + direction[0], head[1] + direction[1]];

    if (newHead[0] < 0 || newHead[0] >= GRID_WIDTH || newHead[1] < 0 || newHead[1] >= GRID_HEIGHT || 
        snake.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
        gameOver = true;
        triggerGameOver();
        return;
    }

    snake.unshift(newHead);

    if (newHead[0] === food.x && newHead[1] === food.y) {
        let fx = food.x * GRID_SIZE + GRID_SIZE / 2;
        let fy = food.y * GRID_SIZE + GRID_SIZE / 2;
        let color = food.isSpecial ? COLOR_SPECIAL_FOOD : COLOR_KRYPTONITE;

        for (let i = 0; i < 12; i++) burstParticles.push(new BurstParticle(fx, fy, color));

        let pts = food.isSpecial ? 25 : 10;
        score += pts;
        growPending += food.isSpecial ? 2 : 1;
        document.getElementById('score-val').textContent = score;

        floatingTexts.push(new FloatingText(fx, fy, `+${pts}${food.isSpecial ? ' PTS!' : ''}`, color));
        flashAlpha = 0.25;

        spawnFood();
    } else {
        if (growPending > 0) {
            growPending--;
        } else {
            snake.pop();
        }
    }
}

function drawFood() {
    food.angle += 0.08;
    let cx = food.x * GRID_SIZE + GRID_SIZE / 2;
    let cy = food.y * GRID_SIZE + GRID_SIZE / 2;
    let color = food.isSpecial ? `rgb(${COLOR_SPECIAL_FOOD.join(',')})` : `rgb(${COLOR_KRYPTONITE.join(',')})`;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.translate(cx, cy);
    ctx.rotate(food.angle);
    
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawSnake() {
    ctx.fillStyle = `rgba(${COLOR_CAPE_NEON.join(',')}, 0.85)`;
    for (let i = 1; i < snake.length; i++) {
        let px = snake[i][0] * GRID_SIZE;
        let py = snake[i][1] * GRID_SIZE;
        ctx.fillRect(px - 1, py - 1, GRID_SIZE + 2, GRID_SIZE + 2);
    }

    snake.forEach((seg, i) => {
        let px = seg[0] * GRID_SIZE;
        let py = seg[1] * GRID_SIZE;

        if (i === 0) {
            ctx.fillStyle = COLOR_MASK_DARK;
            ctx.fillRect(px + 2, py + 2, GRID_SIZE - 4, GRID_SIZE - 4);
            ctx.strokeStyle = COLOR_GOLD_SHIELD;
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 2, py + 2, GRID_SIZE - 4, GRID_SIZE - 4);

            ctx.fillStyle = COLOR_EYE_GLOW;
            let cx = px + GRID_SIZE / 2, cy = py + GRID_SIZE / 2;
            let ew = 6, eh = 3;

            if (direction[0] === 1) { 
                ctx.fillRect(cx + 1, cy - 5, ew, eh); ctx.fillRect(cx + 1, cy + 2, ew, eh);
            } else if (direction[0] === -1) { 
                ctx.fillRect(cx - 7, cy - 5, ew, eh); ctx.fillRect(cx - 7, cy + 2, ew, eh);
            } else if (direction[1] === -1) { 
                ctx.fillRect(cx - 5, cy - 6, eh, ew); ctx.fillRect(cx + 2, cy - 6, eh, ew);
            } else { 
                ctx.fillRect(cx - 5, cy + 3, eh, ew); ctx.fillRect(cx + 2, cy + 3, eh, ew);
            }
        } else {
            ctx.fillStyle = (i % 2 === 0) ? COLOR_SUIT_BLUE : COLOR_SUIT_DARK;
            ctx.fillRect(px + 2, py + 2, GRID_SIZE - 4, GRID_SIZE - 4);
        }
    });
}

function mainLoop() {
    let now = Date.now();

    if (gameStarted && !gameOver) {
        if (now - lastMoveTime > moveInterval) {
            moveSnake();
            lastMoveTime = now;
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawFood();
    drawSnake();

    burstParticles.forEach(p => { p.update(); p.draw(); });
    burstParticles = burstParticles.filter(p => p.alpha > 0);

    floatingTexts.forEach(ft => { ft.update(); ft.draw(); });
    floatingTexts = floatingTexts.filter(ft => ft.alpha > 0);

    if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashAlpha -= 0.04;
    }

    requestAnimationFrame(mainLoop);
}

const menuStart = document.getElementById('menu-start');
const menuOver = document.getElementById('menu-over');

// PANGILAN GLOBAL GAMESTART
window.startGame = function() {
    menuStart.classList.remove('active');
    menuOver.classList.remove('active');
    resetGame();
    gameStarted = true;
};

function triggerGameOver() {
    document.getElementById('final-score').textContent = `TOTAL SKOR AKHIR: ${score} PTS`;
    menuOver.classList.add('active');
}

// KEYBOARD KONTROL
window.addEventListener('keydown', e => {
    let key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') updateDirection(0, -1);
    if (key === 'arrowdown' || key === 's') updateDirection(0, 1);
    if (key === 'arrowleft' || key === 'a') updateDirection(-1, 0);
    if (key === 'arrowright' || key === 'd') updateDirection(1, 0);

    if (key === 'enter' || e.key === ' ') {
        if (!gameStarted || gameOver) {
            window.startGame();
        }
    }
});

// DPAD KONTROL (Menggunakan standard click & touch)
function addDpadEvent(id, dx, dy) {
    const btn = document.getElementById(id);

    const handler = (e) => {
        if (e.cancelable) e.preventDefault();
        if (!gameStarted || gameOver) {
            window.startGame();
        } else {
            updateDirection(dx, dy);
        }
    };

    btn.addEventListener('click', handler);
    btn.addEventListener('touchstart', handler);
}

addDpadEvent('dpad-up', 0, -1);
addDpadEvent('dpad-down', 0, 1);
addDpadEvent('dpad-left', -1, 0);
addDpadEvent('dpad-right', 1, 0);

generateCitySkyline();
resetGame();
mainLoop();