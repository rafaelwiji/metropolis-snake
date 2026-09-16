const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 25;
const GRID_WIDTH = 32;
const GRID_HEIGHT = 24;
const WIDTH = 800;
const HEIGHT = 600;

const COLOR_SKY_TOP = [10, 15, 30];
const COLOR_SKY_BOTTOM = [25, 35, 65];
const COLOR_BUILDING = "#0f1423";
const COLOR_WINDOW = "#ffdc78";

const COLOR_SUIT_BLUE = "#0096ff";
const COLOR_SUIT_DARK = "#0050b4";
const COLOR_CAPE_NEON = "#ff234b";
const COLOR_GOLD_SHIELD = "#ffc800";
const COLOR_MASK_DARK = "#0f141e";
const COLOR_EYE_GLOW = "#00fff0";

const COLOR_APPLE_RED = "#e91d32";
const COLOR_APPLE_BLUE = "#168cff";

const TEXT_COLOR = "#f0f6fc";

const MOVE_DELAY = 250;

let score = 0;
let gameOver = false;
let gameStarted = false;
let lastMove = 0;
let flashAlpha = 0;

let snake;
let foods = [];
let buildings = [];
let particles = [];
let floatingTexts = [];

const scoreElement =
    document.getElementById("score");

const finalScoreElement =
    document.getElementById("finalScore");

const menuOverlay =
    document.getElementById("menuOverlay");

const gameOverOverlay =
    document.getElementById("gameOverOverlay");

const exitButton =
    document.getElementById("exitButton");


class BurstParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;

        const angle =
            Math.random() * Math.PI * 2;

        const speed =
            2 + Math.random() * 4;

        this.vx =
            Math.cos(angle) * speed;

        this.vy =
            Math.sin(angle) * speed;

        this.radius =
            3 + Math.random() * 3;

        this.alpha = 255;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 12;
        this.radius =
            Math.max(0, this.radius - 0.1);
    }

    draw() {
        if (
            this.alpha <= 0 ||
            this.radius <= 0
        ) {
            return;
        }

        ctx.save();

        ctx.globalAlpha =
            this.alpha / 255;

        ctx.fillStyle =
            this.color;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}


class FloatingText {
    constructor(
        x,
        y,
        text,
        color
    ) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.alpha = 255;
    }

    update() {
        this.y -= 1.2;
        this.alpha -= 8;
    }

    draw() {
        if (this.alpha <= 0) {
            return;
        }

        ctx.save();

        ctx.globalAlpha =
            this.alpha / 255;

        ctx.fillStyle =
            this.color;

        ctx.font =
            "bold 18px Consolas";

        ctx.textAlign =
            "center";

        ctx.fillText(
            this.text,
            this.x,
            this.y
        );

        ctx.restore();
    }
}


class Building {
    constructor(
        x,
        width,
        height
    ) {
        this.x = x;
        this.width = width;
        this.height = height;

        this.y =
            HEIGHT - height;

        this.windows = [];

        for (
            let wx = x + 4;
            wx < x + width - 8;
            wx += 10
        ) {
            for (
                let wy = this.y + 8;
                wy < HEIGHT - 10;
                wy += 14
            ) {
                if (
                    Math.random() < 0.6
                ) {
                    this.windows.push(
                        [wx, wy]
                    );
                }
            }
        }
    }

    draw() {
        ctx.fillStyle =
            COLOR_BUILDING;

        ctx.fillRect(
            this.x,
            this.y,
            this.width,
            this.height
        );

        ctx.fillStyle =
            COLOR_WINDOW;

        for (
            const window of this.windows
        ) {
            ctx.fillRect(
                window[0],
                window[1],
                5,
                7
            );
        }
    }
}


function generateCitySkyline() {
    const result = [];
    let currentX = 0;

    while (
        currentX < WIDTH
    ) {
        const width =
            randomInt(35, 65);

        const height =
            randomInt(120, 320);

        result.push(
            new Building(
                currentX,
                width,
                height
            )
        );

        currentX +=
            width - 2;
    }

    return result;
}


function drawBackground() {
    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            HEIGHT
        );

    gradient.addColorStop(
        0,
        `rgb(${COLOR_SKY_TOP.join(",")})`
    );

    gradient.addColorStop(
        1,
        `rgb(${COLOR_SKY_BOTTOM.join(",")})`
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    for (
        const building of buildings
    ) {
        building.draw();
    }

    ctx.save();

    ctx.strokeStyle =
        "rgba(255,255,255,0.05)";

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x < WIDTH;
        x += GRID_SIZE
    ) {
        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);

        ctx.stroke();
    }

    for (
        let y = 0;
        y < HEIGHT;
        y += GRID_SIZE
    ) {
        ctx.beginPath();

        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);

        ctx.stroke();
    }

    ctx.restore();
}


class Snake {
    constructor() {
        this.reset();
    }

    reset() {
        const centerX =
            Math.floor(
                GRID_WIDTH / 2
            );

        const centerY =
            Math.floor(
                GRID_HEIGHT / 2
            );

        this.body = [
            [centerX, centerY],
            [centerX - 1, centerY],
            [centerX - 2, centerY]
        ];

        this.direction = [1, 0];
        this.nextDirection = [1, 0];
        this.growPending = 0;
    }

    changeDirection(dx, dy) {
        if (
            dx !== -this.direction[0] ||
            dy !== -this.direction[1]
        ) {
            this.nextDirection =
                [dx, dy];
        }
    }

    update() {
        this.direction =
            this.nextDirection;

        const head =
            this.body[0];

        const newHead = [
            head[0] +
                this.direction[0],

            head[1] +
                this.direction[1]
        ];

        this.body.unshift(
            newHead
        );

        if (
            this.growPending > 0
        ) {
            this.growPending--;
        } else {
            this.body.pop();
        }
    }

    checkCollision() {
        const head =
            this.body[0];

        if (
            head[0] < 0 ||
            head[0] >= GRID_WIDTH ||
            head[1] < 0 ||
            head[1] >= GRID_HEIGHT
        ) {
            return true;
        }

        for (
            let i = 1;
            i < this.body.length;
            i++
        ) {
            if (
                head[0] ===
                    this.body[i][0] &&
                head[1] ===
                    this.body[i][1]
            ) {
                return true;
            }
        }

        return false;
    }

    draw() {
        for (
            let i = 1;
            i < this.body.length;
            i++
        ) {
            const px =
                this.body[i][0] *
                GRID_SIZE;

            const py =
                this.body[i][1] *
                GRID_SIZE;

            ctx.fillStyle =
                "rgba(255,35,75,0.25)";

            roundRect(
                px - 3,
                py - 3,
                GRID_SIZE + 6,
                GRID_SIZE + 6,
                8
            );

            ctx.fillStyle =
                "rgba(255,35,75,0.86)";

            roundRect(
                px + 1,
                py + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2,
                4
            );
        }

        for (
            let i = 0;
            i < this.body.length;
            i++
        ) {
            const px =
                this.body[i][0] *
                GRID_SIZE;

            const py =
                this.body[i][1] *
                GRID_SIZE;

            if (i === 0) {
                ctx.fillStyle =
                    COLOR_MASK_DARK;

                roundRect(
                    px + 2,
                    py + 2,
                    GRID_SIZE - 4,
                    GRID_SIZE - 4,
                    6
                );

                ctx.strokeStyle =
                    COLOR_GOLD_SHIELD;

                ctx.lineWidth = 1;

                roundRectStroke(
                    px + 2,
                    py + 2,
                    GRID_SIZE - 4,
                    GRID_SIZE - 4,
                    6
                );

                drawEyes(
                    px,
                    py,
                    this.direction
                );
            } else {
                ctx.fillStyle =
                    i % 2 === 0
                        ? COLOR_SUIT_BLUE
                        : COLOR_SUIT_DARK;

                roundRect(
                    px + 2,
                    py + 2,
                    GRID_SIZE - 4,
                    GRID_SIZE - 4,
                    4
                );
            }
        }
    }
}


function drawEyes(
    px,
    py,
    direction
) {
    const cx =
        px + GRID_SIZE / 2;

    const cy =
        py + GRID_SIZE / 2;

    ctx.fillStyle =
        COLOR_EYE_GLOW;

    if (direction[0] === 1) {
        ellipse(
            cx + 5,
            cy - 5,
            6,
            3
        );

        ellipse(
            cx + 5,
            cy + 3,
            6,
            3
        );
    } else if (direction[0] === -1) {
        ellipse(
            cx - 5,
            cy - 5,
            6,
            3
        );

        ellipse(
            cx - 5,
            cy + 3,
            6,
            3
        );
    } else if (direction[1] === -1) {
        ellipse(
            cx - 5,
            cy - 5,
            3,
            6
        );

        ellipse(
            cx + 4,
            cy - 5,
            3,
            6
        );
    } else {
        ellipse(
            cx - 5,
            cy + 4,
            3,
            6
        );

        ellipse(
            cx + 4,
            cy + 4,
            3,
            6
        );
    }
}


class Food {
    constructor(snakeBody) {
        this.pos = [0, 0];
        this.isBlue = false;
        this.angle = 0;

        this.respawn(
            snakeBody
        );
    }

    respawn(snakeBody) {
        while (true) {
            const x =
                randomInt(
                    0,
                    GRID_WIDTH - 1
                );

            const y =
                randomInt(
                    0,
                    GRID_HEIGHT - 1
                );

            const occupied =
                snakeBody.some(
                    part =>
                        part[0] === x &&
                        part[1] === y
                );

            const foodOccupied =
                foods.some(
                    item =>
                        item.pos[0] === x &&
                        item.pos[1] === y
                );

            if (
                !occupied &&
                !foodOccupied
            ) {
                this.pos = [x, y];

                this.isBlue =
                    Math.random() < 0.5;

                this.angle = 0;

                break;
            }
        }
    }

    draw() {
        this.angle += 0.05;

        const cx =
            this.pos[0] *
                GRID_SIZE +
            GRID_SIZE / 2;

        const cy =
            this.pos[1] *
                GRID_SIZE +
            GRID_SIZE / 2;

        const mainColor =
            this.isBlue
                ? COLOR_APPLE_BLUE
                : COLOR_APPLE_RED;

        ctx.save();

        const glow =
            ctx.createRadialGradient(
                cx,
                cy,
                2,
                cx,
                cy,
                21
            );

        if (this.isBlue) {
            glow.addColorStop(
                0,
                "rgba(30,150,255,0.7)"
            );

            glow.addColorStop(
                1,
                "rgba(0,100,255,0)"
            );
        } else {
            glow.addColorStop(
                0,
                "rgba(255,30,50,0.7)"
            );

            glow.addColorStop(
                1,
                "rgba(255,0,0,0)"
            );
        }

        ctx.fillStyle = glow;

        ctx.beginPath();

        ctx.arc(
            cx,
            cy,
            21,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.translate(
            cx,
            cy
        );

        ctx.rotate(
            Math.sin(this.angle) *
                0.08
        );

        const appleGradient =
            ctx.createRadialGradient(
                -4,
                -6,
                1,
                0,
                2,
                13
            );

        if (this.isBlue) {
            appleGradient.addColorStop(
                0,
                "#c8ecff"
            );

            appleGradient.addColorStop(
                0.25,
                "#4db7ff"
            );

            appleGradient.addColorStop(
                0.65,
                "#087ce0"
            );

            appleGradient.addColorStop(
                1,
                "#03428a"
            );
        } else {
            appleGradient.addColorStop(
                0,
                "#ff9696"
            );

            appleGradient.addColorStop(
                0.25,
                "#ff3348"
            );

            appleGradient.addColorStop(
                0.7,
                "#d20f28"
            );

            appleGradient.addColorStop(
                1,
                "#650514"
            );
        }

        ctx.fillStyle =
            appleGradient;

        ctx.beginPath();

        ctx.moveTo(0, -5);

        ctx.bezierCurveTo(
            -2,
            -11,
            -10,
            -11,
            -11,
            -3
        );

        ctx.bezierCurveTo(
            -13,
            6,
            -6,
            12,
            0,
            13
        );

        ctx.bezierCurveTo(
            6,
            12,
            13,
            6,
            11,
            -3
        );

        ctx.bezierCurveTo(
            10,
            -11,
            2,
            -11,
            0,
            -5
        );

        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle =
            this.isBlue
                ? "#91d8ff"
                : "#ff6978";

        ctx.lineWidth = 0.8;
        ctx.stroke();

        const highlight =
            ctx.createRadialGradient(
                -5,
                -6,
                1,
                -5,
                -6,
                5
            );

        highlight.addColorStop(
            0,
            "rgba(255,255,255,0.98)"
        );

        highlight.addColorStop(
            0.4,
            "rgba(255,255,255,0.55)"
        );

        highlight.addColorStop(
            1,
            "rgba(255,255,255,0)"
        );

        ctx.fillStyle =
            highlight;

        ctx.beginPath();

        ctx.ellipse(
            -5,
            -5,
            3.5,
            5,
            -0.5,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.strokeStyle =
            "#59320d";

        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";

        ctx.beginPath();

        ctx.moveTo(
            0,
            -7
        );

        ctx.quadraticCurveTo(
            1,
            -12,
            4,
            -14
        );

        ctx.stroke();

        ctx.fillStyle =
            "#42a93d";

        ctx.beginPath();

        ctx.moveTo(
            2,
            -12
        );

        ctx.bezierCurveTo(
            5,
            -16,
            11,
            -16,
            12,
            -13
        );

        ctx.bezierCurveTo(
            8,
            -10,
            5,
            -10,
            2,
            -12
        );

        ctx.closePath();

        ctx.fill();

        ctx.strokeStyle =
            "#277027";

        ctx.lineWidth = 0.7;
        ctx.stroke();

        ctx.restore();
    }
}


function createFiveFoods() {
    foods = [];

    for (
        let i = 0;
        i < 5;
        i++
    ) {
        const newFood =
            new Food(
                snake.body
            );

        foods.push(
            newFood
        );
    }
}


function handleMove() {
    if (
        !gameStarted ||
        gameOver
    ) {
        return;
    }

    snake.update();

    if (
        snake.checkCollision()
    ) {
        gameOver = true;

        finalScoreElement.textContent =
            score;

        gameOverOverlay.classList.remove(
            "hidden"
        );

        return;
    }

    const head =
        snake.body[0];

    let eatenIndex = -1;

    for (
        let i = 0;
        i < foods.length;
        i++
    ) {
        if (
            head[0] ===
                foods[i].pos[0] &&
            head[1] ===
                foods[i].pos[1]
        ) {
            eatenIndex = i;
            break;
        }
    }

    if (
        eatenIndex === -1
    ) {
        return;
    }

    const eatenFood =
        foods[eatenIndex];

    const foodX =
        eatenFood.pos[0] *
            GRID_SIZE +
        GRID_SIZE / 2;

    const foodY =
        eatenFood.pos[1] *
            GRID_SIZE +
        GRID_SIZE / 2;

    const foodColor =
        eatenFood.isBlue
            ? COLOR_APPLE_BLUE
            : COLOR_APPLE_RED;

    for (
        let i = 0;
        i < 18;
        i++
    ) {
        particles.push(
            new BurstParticle(
                foodX,
                foodY,
                foodColor
            )
        );
    }

    if (
        eatenFood.isBlue
    ) {
        score += 25;

        snake.growPending += 2;

        floatingTexts.push(
            new FloatingText(
                foodX,
                foodY,
                "+25 BLUE!",
                COLOR_APPLE_BLUE
            )
        );

        createFiveFoods();

        flashAlpha = 90;

    } else {
        score += 10;

        snake.growPending += 1;

        floatingTexts.push(
            new FloatingText(
                foodX,
                foodY,
                "+10",
                "#ff5266"
            )
        );

        foods.splice(
            eatenIndex,
            1
        );

        const newFood =
            new Food(
                snake.body
            );

        foods.push(
            newFood
        );

        flashAlpha = 60;
    }

    scoreElement.textContent =
        score;
}


function startGame() {
    if (gameOver) {
        snake.reset();

        createFiveFoods();

        score = 0;

        scoreElement.textContent =
            "0";

        particles = [];
        floatingTexts = [];

        gameOver = false;

        gameOverOverlay.classList.add(
            "hidden"
        );
    }

    if (
        foods.length === 0
    ) {
        createFiveFoods();
    }

    gameStarted = true;

    menuOverlay.classList.add(
        "hidden"
    );
}


function exitGame() {
    gameStarted = false;
    gameOver = false;

    score = 0;

    scoreElement.textContent =
        "0";

    snake.reset();

    createFiveFoods();

    particles = [];
    floatingTexts = [];
    flashAlpha = 0;

    gameOverOverlay.classList.add(
        "hidden"
    );

    menuOverlay.classList.remove(
        "hidden"
    );
}


function update() {
    const now =
        performance.now();

    if (
        now - lastMove >=
            MOVE_DELAY &&
        gameStarted &&
        !gameOver
    ) {
        handleMove();

        lastMove = now;
    }

    for (
        const particle of particles
    ) {
        particle.update();
    }

    particles =
        particles.filter(
            particle =>
                particle.alpha > 0
        );

    for (
        const text of floatingTexts
    ) {
        text.update();
    }

    floatingTexts =
        floatingTexts.filter(
            text =>
                text.alpha > 0
        );

    if (
        flashAlpha > 0
    ) {
        flashAlpha -= 8;
    }
}


function draw() {
    drawBackground();

    for (
        const food of foods
    ) {
        food.draw();
    }

    snake.draw();

    for (
        const particle of particles
    ) {
        particle.draw();
    }

    for (
        const text of floatingTexts
    ) {
        text.draw();
    }

    if (
        flashAlpha > 0
    ) {
        ctx.save();

        ctx.fillStyle =
            `rgba(255,255,255,${flashAlpha / 255})`;

        ctx.fillRect(
            0,
            0,
            WIDTH,
            HEIGHT
        );

        ctx.restore();
    }
}


function gameLoop() {
    update();
    draw();

    requestAnimationFrame(
        gameLoop
    );
}


function setupButton(
    id,
    dx,
    dy
) {
    const button =
        document.getElementById(id);

    button.addEventListener(
        "click",
        event => {
            event.preventDefault();

            if (
                !gameStarted ||
                gameOver
            ) {
                startGame();
            }

            if (!gameOver) {
                snake.changeDirection(
                    dx,
                    dy
                );
            }
        }
    );

    button.addEventListener(
        "touchstart",
        event => {
            event.preventDefault();

            if (
                !gameStarted ||
                gameOver
            ) {
                startGame();
            }

            if (!gameOver) {
                snake.changeDirection(
                    dx,
                    dy
                );
            }
        },
        {
            passive: false
        }
    );
}


setupButton(
    "up",
    0,
    -1
);

setupButton(
    "down",
    0,
    1
);

setupButton(
    "left",
    -1,
    0
);

setupButton(
    "right",
    1,
    0
);


exitButton.addEventListener(
    "click",
    exitGame
);

exitButton.addEventListener(
    "touchstart",
    event => {
        event.preventDefault();
        exitGame();
    },
    {
        passive: false
    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            startGame();
            return;
        }

        if (
            !gameStarted ||
            gameOver
        ) {
            return;
        }

        switch (
            event.key.toLowerCase()
        ) {
            case "arrowup":
            case "w":
                event.preventDefault();

                snake.changeDirection(
                    0,
                    -1
                );
                break;

            case "arrowdown":
            case "s":
                event.preventDefault();

                snake.changeDirection(
                    0,
                    1
                );
                break;

            case "arrowleft":
            case "a":
                event.preventDefault();

                snake.changeDirection(
                    -1,
                    0
                );
                break;

            case "arrowright":
            case "d":
                event.preventDefault();

                snake.changeDirection(
                    1,
                    0
                );
                break;
        }
    }
);


menuOverlay.addEventListener(
    "click",
    startGame
);

gameOverOverlay.addEventListener(
    "click",
    startGame
);


function randomInt(
    min,
    max
) {
    return Math.floor(
        Math.random() *
            (max - min + 1)
    ) + min;
}


function ellipse(
    x,
    y,
    width,
    height
) {
    ctx.beginPath();

    ctx.ellipse(
        x,
        y,
        width / 2,
        height / 2,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


function roundRect(
    x,
    y,
    width,
    height,
    radius
) {
    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        width,
        height,
        radius
    );

    ctx.fill();
}


function roundRectStroke(
    x,
    y,
    width,
    height,
    radius
) {
    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        width,
        height,
        radius
    );

    ctx.stroke();
}


buildings =
    generateCitySkyline();

snake =
    new Snake();

createFiveFoods();

gameLoop();