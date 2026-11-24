const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };

class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
        this.element = null;
    }

    get color() {
        return SUIT_COLORS[this.suit];
    }

    get symbol() {
        return SUIT_SYMBOLS[this.suit];
    }

    get value() {
        return RANKS.indexOf(this.rank) + 1;
    }

    createElement() {
        const el = document.createElement('div');
        el.className = `card ${this.color} ${this.faceUp ? 'face-up' : 'face-down'}`;
        el.draggable = this.faceUp;
        el.dataset.suit = this.suit;
        el.dataset.rank = this.rank;

        if (this.faceUp) {
            el.innerHTML = `
                <div class="corner top">
                    <span class="rank">${this.rank}</span>
                    <span class="suit">${this.symbol}</span>
                </div>
                <div class="center-suit">${this.symbol}</div>
                <div class="corner bottom">
                    <span class="rank">${this.rank}</span>
                    <span class="suit">${this.symbol}</span>
                </div>
            `;
        }
        this.element = el;
        return el;
    }

    flip() {
        this.faceUp = !this.faceUp;
        if (this.element) {
            this.element.classList.toggle('face-up');
            this.element.classList.toggle('face-down');
            this.element.draggable = this.faceUp;
            if (this.faceUp) {
                this.element.innerHTML = `
                    <div class="corner top">
                        <span class="rank">${this.rank}</span>
                        <span class="suit">${this.symbol}</span>
                    </div>
                    <div class="center-suit">${this.symbol}</div>
                    <div class="corner bottom">
                        <span class="rank">${this.rank}</span>
                        <span class="suit">${this.symbol}</span>
                    </div>
                `;
            } else {
                this.element.innerHTML = '';
            }
        }
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }

    drawMultiple(n) {
        return Array.from({ length: n }, () => this.draw()).filter(c => c);
    }
}

class GameState {
    constructor() {
        this.stock = [];
        this.waste = [];
        this.foundations = { hearts: [], diamonds: [], clubs: [], spades: [] };
        this.tableau = [[], [], [], [], [], [], []];
        this.moves = 0;
        this.score = 0;
        this.startTime = Date.now();
        this.timerInterval = null;
        this.history = [];
        this.draggedCards = null;
        this.dragSource = null;
    }

    saveState() {
        const state = {
            stock: this.stock.map(c => ({ suit: c.suit, rank: c.rank, faceUp: c.faceUp })),
            waste: this.waste.map(c => ({ suit: c.suit, rank: c.rank, faceUp: c.faceUp })),
            foundations: {},
            tableau: this.tableau.map(col => col.map(c => ({ suit: c.suit, rank: c.rank, faceUp: c.faceUp }))),
            moves: this.moves,
            score: this.score,
            startTime: this.startTime
        };
        for (const suit of SUITS) {
            state.foundations[suit] = this.foundations[suit].map(c => ({ suit: c.suit, rank: c.rank, faceUp: c.faceUp }));
        }
        this.history.push(state);
        if (this.history.length > 100) this.history.shift();
    }

    restoreState(state) {
        const restoreCards = (arr) => arr.map(c => {
            const card = new Card(c.suit, c.rank);
            card.faceUp = c.faceUp;
            return card;
        });

        this.stock = restoreCards(state.stock);
        this.waste = restoreCards(state.waste);
        for (const suit of SUITS) {
            this.foundations[suit] = restoreCards(state.foundations[suit]);
        }
        this.tableau = state.tableau.map(col => restoreCards(col));
        this.moves = state.moves;
        this.score = state.score;
        this.startTime = state.startTime;
    }

    undo() {
        if (this.history.length === 0) return false;
        const prevState = this.history.pop();
        this.restoreState(prevState);
        return true;
    }

    recordMove() {
        this.moves++;
        this.updateStats();
    }

    addScore(points) {
        this.score += points;
        this.updateStats();
    }

    updateStats() {
        document.getElementById('moves').textContent = `Moves: ${this.moves}`;
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }

    startTimer() {
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('time').textContent = `Time: ${mins}:${secs.toString().padStart(2, '0')}`;
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getTimeString() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    checkWin() {
        for (const suit of SUITS) {
            if (this.foundations[suit].length !== 13) return false;
        }
        return true;
    }
}

class SolitaireGame {
    constructor() {
        this.state = new GameState();
        this.deck = new Deck();
        this.initElements();
        this.bindEvents();
        this.newGame();
    }

    initElements() {
        this.stockEl = document.getElementById('stock');
        this.wasteEl = document.getElementById('waste');
        this.foundationEls = {
            hearts: document.querySelector('.foundation[data-suit="hearts"]'),
            diamonds: document.querySelector('.foundation[data-suit="diamonds"]'),
            clubs: document.querySelector('.foundation[data-suit="clubs"]'),
            spades: document.querySelector('.foundation[data-suit="spades"]')
        };
        this.tableauEls = Array.from(document.querySelectorAll('.tableau')).map(el => ({
            element: el,
            col: parseInt(el.dataset.col)
        }));
    }

    bindEvents() {
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('play-again').addEventListener('click', () => this.newGame());

        this.stockEl.addEventListener('click', () => this.drawFromStock());

        document.addEventListener('dragstart', (e) => this.handleDragStart(e));
        document.addEventListener('dragend', (e) => this.handleDragEnd(e));
        document.addEventListener('dragover', (e) => this.handleDragOver(e));
        document.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        document.addEventListener('drop', (e) => this.handleDrop(e));
        document.addEventListener('click', (e) => this.handleClick(e));
    }

    newGame() {
        this.state = new GameState();
        this.deck = new Deck();
        this.deal();
        this.render();
        this.state.startTimer();
        document.getElementById('win-message').classList.add('hidden');
    }

    deal() {
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = this.deck.draw();
                card.faceUp = (row === col);
                this.state.tableau[col].push(card);
            }
        }
        this.state.stock = this.deck.cards;
    }

    render() {
        this.renderStock();
        this.renderWaste();
        this.renderFoundations();
        this.renderTableau();
        this.state.updateStats();
    }

    renderStock() {
        this.stockEl.innerHTML = '';
        this.stockEl.classList.toggle('empty', this.state.stock.length === 0);
        if (this.state.stock.length > 0) {
            const card = this.state.stock[this.state.stock.length - 1];
            card.faceUp = false;
            this.stockEl.appendChild(card.createElement());
        }
    }

    renderWaste() {
        this.wasteEl.innerHTML = '';
        if (this.state.waste.length > 0) {
            const card = this.state.waste[this.state.waste.length - 1];
            card.faceUp = true;
            this.wasteEl.appendChild(card.createElement());
        }
    }

    renderFoundations() {
        for (const suit of SUITS) {
            const el = this.foundationEls[suit];
            el.innerHTML = '';
            if (this.state.foundations[suit].length > 0) {
                const card = this.state.foundations[suit][this.state.foundations[suit].length - 1];
                card.faceUp = true;
                el.appendChild(card.createElement());
            }
            if (!el.querySelector('.pile-label')) {
                const label = document.createElement('div');
                label.className = 'pile-label';
                el.appendChild(label);
            }
        }
    }

    renderTableau() {
        for (let col = 0; col < 7; col++) {
            const pileEl = this.tableauEls[col].element;
            pileEl.innerHTML = '';
            this.state.tableau[col].forEach((card, index) => {
                card.faceUp = (index >= this.state.tableau[col].length - (this.state.tableau[col].filter(c => c.faceUp).length));
                const cardEl = card.createElement();
                cardEl.style.top = `${index * 25}px`;
                cardEl.style.zIndex = index;
                pileEl.appendChild(cardEl);
            });
            if (!pileEl.querySelector('.pile-label')) {
                const label = document.createElement('div');
                label.className = 'pile-label';
                label.textContent = `Col ${col + 1}`;
                pileEl.appendChild(label);
            }
        }
    }

    drawFromStock() {
        if (this.state.stock.length > 0) {
            this.state.saveState();
            const card = this.state.stock.pop();
            card.faceUp = true;
            this.state.waste.push(card);
            this.state.recordMove();
            this.render();
        } else if (this.state.waste.length > 0) {
            this.state.saveState();
            while (this.state.waste.length > 0) {
                const card = this.state.waste.pop();
                card.faceUp = false;
                this.state.stock.push(card);
            }
            this.state.recordMove();
            this.render();
        }
    }

    handleClick(e) {
        const cardEl = e.target.closest('.card');
        if (!cardEl) return;

        const cardData = {
            suit: cardEl.dataset.suit,
            rank: cardEl.dataset.rank
        };

        if (this.tryAutoMove(cardData)) {
            this.state.saveState();
            this.state.recordMove();
            this.render();
            this.checkWinCondition();
        }
    }

    tryAutoMove(cardData) {
        const wasteTop = this.state.waste[this.state.waste.length - 1];
        if (wasteTop && wasteTop.suit === cardData.suit && wasteTop.rank === cardData.rank) {
            return this.moveToFoundation(wasteTop, 'waste');
        }

        for (let col = 0; col < 7; col++) {
            const faceUpCards = this.state.tableau[col].filter(c => c.faceUp);
            const topCard = faceUpCards[faceUpCards.length - 1];
            if (topCard && topCard.suit === cardData.suit && topCard.rank === cardData.rank) {
                return this.moveToFoundation(topCard, `tableau-${col}`);
            }
        }
        return false;
    }

    moveToFoundation(card, source) {
        const foundation = this.state.foundations[card.suit];
        const expectedRank = foundation.length === 0 ? 'A' : RANKS[RANKS.indexOf(foundation[foundation.length - 1].rank) + 1];

        if (card.rank === expectedRank) {
            if (source === 'waste') {
                this.state.waste.pop();
            } else if (source.startsWith('tableau-')) {
                const col = parseInt(source.split('-')[1]);
                this.state.tableau[col].pop();
                this.flipTableauTop(col);
            }
            foundation.push(card);
            this.state.addScore(10);
            return true;
        }
        return false;
    }

    flipTableauTop(col) {
        const faceDownCards = this.state.tableau[col].filter(c => !c.faceUp);
        if (faceDownCards.length > 0) {
            const lastFaceDown = faceDownCards[faceDownCards.length - 1];
            lastFaceDown.faceUp = true;
            this.state.addScore(5);
        }
    }

    handleDragStart(e) {
        const cardEl = e.target.closest('.card');
        if (!cardEl || cardEl.classList.contains('face-down')) return;

        const pileEl = cardEl.closest('.pile');
        if (!pileEl) return;

        const cards = [];
        let startIndex = -1;

        if (pileEl.classList.contains('waste')) {
            cards.push(this.state.waste[this.state.waste.length - 1]);
            this.state.dragSource = { type: 'waste', index: this.state.waste.length - 1 };
        } else if (pileEl.classList.contains('foundation')) {
            const suit = pileEl.dataset.suit;
            cards.push(this.state.foundations[suit][this.state.foundations[suit].length - 1]);
            this.state.dragSource = { type: 'foundation', suit };
        } else if (pileEl.classList.contains('tableau')) {
            const col = parseInt(pileEl.dataset.col);
            const faceUpCards = this.state.tableau[col].filter(c => c.faceUp);
            const cardIndex = this.state.tableau[col].findIndex(c => c.suit === cardEl.dataset.suit && c.rank === cardEl.dataset.rank && c.faceUp);
            if (cardIndex >= 0) {
                cards.push(...this.state.tableau[col].slice(cardIndex));
                this.state.dragSource = { type: 'tableau', col, startIndex: cardIndex };
            }
        }

        if (cards.length === 0) return;

        this.state.draggedCards = cards;
        cardEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(cards.map(c => ({ suit: c.suit, rank: c.rank }))));
    }

    handleDragEnd(e) {
        const cardEl = e.target.closest('.card');
        if (cardEl) cardEl.classList.remove('dragging');
        document.querySelectorAll('.pile.valid-drop').forEach(p => p.classList.remove('valid-drop'));
        this.state.draggedCards = null;
        this.state.dragSource = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const pileEl = e.target.closest('.pile');
        if (pileEl && this.state.draggedCards) {
            if (this.canDropOnPile(pileEl)) {
                pileEl.classList.add('valid-drop');
            }
        }
    }

    handleDragLeave(e) {
        const pileEl = e.target.closest('.pile');
        if (pileEl) pileEl.classList.remove('valid-drop');
    }

    handleDrop(e) {
        e.preventDefault();
        const pileEl = e.target.closest('.pile');
        if (!pileEl || !this.state.draggedCards) return;

        pileEl.classList.remove('valid-drop');

        let success = false;
        if (pileEl.classList.contains('foundation')) {
            success = this.dropOnFoundation(pileEl.dataset.suit);
        } else if (pileEl.classList.contains('tableau')) {
            success = this.dropOnTableau(parseInt(pileEl.dataset.col));
        }

        if (success) {
            this.state.saveState();
            this.state.recordMove();
            this.render();
            this.checkWinCondition();
        }
    }

    canDropOnPile(pileEl) {
        if (!this.state.draggedCards || this.state.draggedCards.length === 0) return false;
        const card = this.state.draggedCards[0];

        if (pileEl.classList.contains('foundation')) {
            const foundation = this.state.foundations[pileEl.dataset.suit];
            if (foundation.length === 0) return card.rank === 'A';
            const topCard = foundation[foundation.length - 1];
            return topCard.suit === card.suit && RANKS.indexOf(card.rank) === RANKS.indexOf(topCard.rank) + 1;
        }

        if (pileEl.classList.contains('tableau')) {
            const col = parseInt(pileEl.dataset.col);
            const tableauCol = this.state.tableau[col];
            if (tableauCol.length === 0) return card.rank === 'K';
            const faceUpCards = tableauCol.filter(c => c.faceUp);
            const topCard = faceUpCards[faceUpCards.length - 1];
            return topCard && topCard.color !== card.color && RANKS.indexOf(card.rank) === RANKS.indexOf(topCard.rank) - 1;
        }
        return false;
    }

    dropOnFoundation(suit) {
        if (this.state.draggedCards.length !== 1) return false;
        const card = this.state.draggedCards[0];
        return this.moveToFoundation(card, this.getSourceString());
    }

    dropOnTableau(col) {
        const cards = this.state.draggedCards;
        const targetCol = this.state.tableau[col];
        const faceUpCards = targetCol.filter(c => c.faceUp);
        const topCard = faceUpCards[faceUpCards.length - 1];

        if (targetCol.length === 0) {
            if (cards[0].rank !== 'K') return false;
        } else {
            if (topCard.color === cards[0].color) return false;
            if (RANKS.indexOf(cards[0].rank) !== RANKS.indexOf(topCard.rank) - 1) return false;
        }

        this.removeFromSource(cards.length);
        targetCol.push(...cards);

        if (this.state.dragSource.type === 'tableau') {
            this.flipTableauTop(this.state.dragSource.col);
        }

        this.state.addScore(cards.length * 5);
        return true;
    }

    getSourceString() {
        const src = this.state.dragSource;
        if (!src) return '';
        if (src.type === 'waste') return 'waste';
        if (src.type === 'foundation') return `foundation-${src.suit}`;
        if (src.type === 'tableau') return `tableau-${src.col}`;
        return '';
    }

    removeFromSource(count) {
        const src = this.state.dragSource;
        if (!src) return;

        if (src.type === 'waste') {
            this.state.waste.pop();
        } else if (src.type === 'foundation') {
            this.state.foundations[src.suit].pop();
        } else if (src.type === 'tableau') {
            this.state.tableau[src.col].splice(src.startIndex, count);
        }
    }

    undo() {
        if (this.state.undo()) {
            this.render();
        }
    }

    checkWinCondition() {
        if (this.state.checkWin()) {
            this.state.stopTimer();
            setTimeout(() => this.showWinMessage(), 300);
        }
    }

    showWinMessage() {
        document.getElementById('final-moves').textContent = this.state.moves;
        document.getElementById('final-time').textContent = this.state.getTimeString();
        document.getElementById('final-score').textContent = this.state.score;
        document.getElementById('win-message').classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SolitaireGame();
});