const BOARD_ID = "board";
const MESSAGE_ID = "message";
const HEALTH_ID = "health";
const DEFAULT_HEALTH = 100;

const MOVES = Object.freeze({
    left: [-1, 0],
    up: [0, -1],
    right: [1, 0],
    down: [0, 1]
});

const KEYS = Object.freeze({
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
});

class Snake {
    constructor(x, y, style='', health=null) {
        this.id = `${Date.now()}.${Math.random(1000000)}`;
        this.body = [];
        this.style = style;
        this.health = health || DEFAULT_HEALTH;
        this.add(x, y);
    }

    get head() {
        return this.body[this.body.length - 1];
    }

    get tail() {
        return this.body[0];
    }

    get length() {
        return this.body.length;
    }

    add(x, y) {
        this.body.push([ x, y ]);
    }

    shorten() {
        this.body.shift();
    }

    hasPoint(x, y) {
        return this.body.find(pt => pt[0] === x && pt[1] === y);
    }

    getMove(info) {
        // define for sub snakes
        return null;
    }

    destroy() {
    }

    get info() {
        return {
            id: this.id,
            name: this.style,
            health: this.health,
            body: this.body
        };
    }
}

class UserSnake extends Snake {
    constructor(x, y, style='', health=null) {
        super(x, y, style, health);
        this.moves = [];  // actions queue
        this.lastMove = null;
        document.addEventListener("keydown", this.handleKey.bind(this));
    }

    handleKey(event) {
        const move = KEYS[event.keyCode];
        if (move) {
            this.moves.push(move);
        }
    }

    getMove(info) {
        if (this.moves.length) {
            this.lastMove = this.moves.shift();
        }
        return this.lastMove;
    }

    destroy() {
        document.removeEventListener("keydown", this.handleKey.bind(this));
    }
}

class RandomSnake extends Snake {
    constructor(x, y, style='', health=null) {
        super(x, y, style, health);
        this.lastMove = null;
    } 

    getMove(info) {
        let head = info.you.body[info.you.body.length - 1];
        let moves = ['up','down','left','right'].filter(m => !(
            (this.lastMove === 'up' && m === 'down') ||
            (this.lastMove === 'down' && m === 'up') ||
            (this.lastMove === 'left' && m === 'right') ||
            (this.lastMove === 'right' && m === 'left') ||
            (head[0] === info.board.width -1 && (m === 'right')) ||
            (head[1] === info.board.height - 1 && (m === 'down')) ||
            (head[0] === 0 && (m === 'left')) ||
            (head[1] === 0 && (m === 'up'))
        ));

        if (moves.length > 0) {
            this.lastMove = moves[Math.floor(Math.random() * moves.length)];
        }
        
        return this.lastMove;
    }
}


class Game {
    constructor(width, height,
                snakeCt=5, foodCt=3, foodScore=100, moveCost=1, delay=110)
    {
        this.boardEl = document.getElementById(BOARD_ID);
        this.id = `${Date.now()}.${Math.random(1000000)}`;
        this.turn = 0;
        this.width = width;
        this.height = height;
        this.foodScore = foodScore;
        this.moveCost = moveCost;
        this.delay = delay;
        this.snakeCt = snakeCt;
        this.foodCt = foodCt;

        document.documentElement.style.setProperty("--cols", width);
        document.documentElement.style.setProperty("--rows", height);
    }

    start() {
        this.status = null;
        this.snakes = [];
        this.food = [];

        // initialize board
        this.boardEl.innerHTML = "";
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const el = document.createElement("div");
                el.setAttribute('data-point', `${x},${y}`);
                el.classList = 'square empty';
                this.boardEl.append(el);
            }
        }

        // initialize user snake
        this.userSnake = new UserSnake(
            Math.floor(this.width / 2),
            Math.floor(this.height / 2),
            'user1'
        );
        this.snakes.push(this.userSnake);

        // robot snakes
        let pts = this.rndEmpty(this.snakeCt - 1);
        for (let i = 0; i < pts.length; i++) {
            this.snakes.push(new RandomSnake(...pts[i], `robot${i+1}`));
        }

        this.placeFood();
        this.render();

        document.body.focus();

        // begin main loop - call move() on an interval to handle items pushed to
        // the 'moves' queue by the key event listener
        // this.interval = setInterval(this.round.bind(this), this.delay);
    }

    render() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const el = document.querySelector(`[data-point="${x},${y}"]`);
                let isSnake = false;
                for (let i = 0; i < this.snakes.length; i++) {
                    const snake = this.snakes[i];
                    if (snake.hasPoint(x, y)) {
                        el.classList = 'square snake ' + snake.style;
                        isSnake = true;
                        break;
                    }
                }

                if (!isSnake) {
                    if (this.food.find(pt => pt[0] === x && pt[1] === y)) {
                        el.classList = 'square food';
                    } else {
                        el.classList = 'square empty';
                    }
                }
            }
        }

        document.getElementById(MESSAGE_ID).innerHTML = this.status || '';
        if (this.userSnake) {
            document.getElementById(HEALTH_ID).innerHTML = this.userSnake.health || 0;
        }
    }

    round() {
        this.turn++;
        for (let i = 0; i < this.snakes.length; i++) {
            const snake = this.snakes[i];
            let info = this.getInfo();
            info.you = snake.info;
            let move = snake.getMove(info);
            if (move) {
                this.move(snake, move);
            }
        }
        this.render();
    }

    move(snake, move) {
        const [deltaX, deltaY] = MOVES[move];
        const [headX, headY] = snake.head;
        const [nextX, nextY] = [headX + deltaX, headY + deltaY];

        snake.health -= this.moveCost;

        // check next square for wall, snake body, or full board
        if (nextX >= this.width || nextX < 0 ||
            nextY >= this.height || nextY < 0 ||
            snake.length >= this.width * this.height ||
            snake.health <= 0
        ) {
            this.kill(snake);
            return;
        }
        
        for (let i = 0; i < this.snakes.length; i++) {
            const s2 = this.snakes[i];
            if (s2.hasPoint(nextX, nextY)) {
                this.kill(snake);
                return;
            }
        }

        // check if we're eating
        let foodIdx = this.food.findIndex(pt => pt[0] === headX && pt[1] === headY);
        if (foodIdx > -1) {
            snake.health += this.foodScore;
            this.food.splice(foodIdx, 1);
        } else {
            // shorten tail if didn't eat
            const [ tailX, tailY ] = snake.tail;
            snake.shorten();
        }

        // add next unit to the snake to move it forward
        snake.add(nextX, nextY);

        // place a new apple now that the snake position has been updated
        this.placeFood();
    }

    kill(snake) {
        if (snake.id !== this.userSnake.id) {
            let i = this.snakes.findIndex(s => s.id === snake.id);
            this.snakes.splice(i, 1);
        } else {
            this.stop();
        }
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
        this.snakes.forEach(s => { s.destroy(); });
        this.status = "Game Over!";
        this.render();
    }

    rndEmpty(n) {
        let squares = [].slice
            .call(this.boardEl.querySelectorAll('.square.empty'))
            .sort(() => .5 - Math.random())
            .slice(0, n);
        return squares.map(sq => sq.getAttribute('data-point').split(',').map(s => parseInt(s)));
    }

    placeFood() {
        let n = this.foodCt - this.food.length;
        if (n > 0) {
            const pts = this.rndEmpty(n);
            for (let i = 0; i < pts.length; i++) {
                const pt = pts[i];
                this.food.push(pt);
            }
        }
    }

    getInfo() {
        return {
            game: {
                id: this.id
            },
            turn: this.turn,
            board: {
                width: this.width,
                height: this.height,
                food: this.food,
                snakes: this.snakes.map(s => s.info)
            }
        };
    }
}
