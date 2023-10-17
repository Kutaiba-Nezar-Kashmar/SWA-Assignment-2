export type Generator<T> = { next: () => T };

export type Position = {
    row: number;
    col: number;
};

export type Match<T> = {
    matched: T;
    positions: Position[];
};

export type BoardEvent<T> = {
    kind: "Match" | "Refill";
    match?: Match<T>;
};

export type BoardListener<T> = (event: BoardEvent<T>) => void;

export class Board<T> {
    public board: T[][];
    public debugNow: boolean;
    private listeners: BoardListener<T>[] = [];
    private generator: Generator<T>;

    constructor(generator: Generator<T>, cols: number, rows: number) {
        this.board = [];
        this.generator = generator;
        for (let i = 0; i < rows; i++) {
            this.board.push([] as T[]);
            for (let j = 0; j < cols; j++) {
                this.board[i][j] = generator.next();
            }
        }
        this.gameLoop();
    }

    addListener(listener: BoardListener<T>) {
        this.listeners.push(listener);
    }

    piece(p: Position): T | undefined {
        if (this.isOutsideBoard(p)) {
            return undefined;
        }
        return this.board[p.row][p.col] ?? undefined;
    }

    setPiece(p: Position, value: T): void {
        if (this.isOutsideBoard(p)) {
            return;
        }

        this.board[p.row][p.col] = value;
    }

    canMove(first: Position, second: Position): boolean {
        if (this.isOutsideBoard(first) || this.isOutsideBoard(second)) {
            return false;
        }

        if (this.isDiagonalMove(first, second)) {
            return false;
        }

        // Temporarily swap positions
        this.swapPostion(first, second);

        const result = this.hasMatch(second) || this.hasMatch(first);

        // Swap back to the original positions
        this.swapPostion(first, second);

        return result;
    }

    move(first: Position, second: Position) {
        if (!this.canMove(first, second)) {
            return;
        }

        this.swapPostion(first, second);
        if (first.col === 4) {
            this.debugNow = true;
        }
        this.gameLoop();
    }

    gameLoop() {
        let allMatches = this.getAllMatches();
        while (allMatches.length > 0) {
            allMatches.forEach((match) => {
                let matchEvent = { kind: "Match" as "Match", match };
                this.listeners.forEach((listener) => listener(matchEvent));
            });
            this.clearMatches([allMatches[0]]);
            this.movePiecesDown();
            let hasRefilled = this.refillEmptyPostions();
            if (hasRefilled) {
                this.listeners.forEach((lis) =>
                    lis({ kind: "Refill" as "Refill" })
                );
            }
            allMatches = this.getAllMatches();
        }
    }

    movePiecesDown() {
        for (let i = 0; i < this.width; i++) {
            const rowIndexes = Array.from(Array(this.height).keys()).reverse();
            rowIndexes.forEach((idx) => {
                let finished = !this.movePieceDown({ row: idx, col: i });
                let amountMoved = 0;
                while (!finished) {
                    finished = !this.movePieceDown({
                        row: idx,
                        col: i - amountMoved,
                    });
                }
            });
        }
    }

    getFirstUndfinedRow() {}

    movePieceDown(p: Position): boolean {
        const piece = this.piece(p);
        if (
            this.isOutsideBoard(p) ||
            piece === undefined ||
            p.row === this.height - 1
        ) {
            return false;
        }

        const down = { row: p.row + 1, col: p.col };
        if (this.piece(down) !== undefined) {
            return false;
        }

        this.swapPostion(p, down);
        return true;
    }

    refillEmptyPostions(): boolean {
        let refillCount = 0;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                const position = { row: i, col: j };
                if (this.piece(position) === undefined) {
                    refillCount++;
                    const newPiece = this.generator.next();
                    this.setPiece(position, newPiece);
                }
            }
        }
        return refillCount > 0;
    }

    getAllMatches() {
        let allMatches = [] as Match<T>[];
        for (let j = 0; j < this.width; j++) {
            allMatches = [...allMatches, ...this.getVerticalMatches(j)];
        }

        for (let i = 0; i < this.height; i++) {
            allMatches = [...allMatches, ...this.getHorizontalMatches(i)];
        }

        return allMatches;
    }

    hasMatch(fromPosition: Position): boolean {
        return (
            1 +
                this.getAboveConsecutiveMatches(fromPosition) +
                this.getBelowConsecutiveMatches(fromPosition) >=
                3 ||
            1 +
                this.getLeftConsecutiveMatches(fromPosition) +
                this.getRightConsecutiveMatches(fromPosition) >=
                3
        );
    }

    swapPostion(first: Position, second: Position) {
        const temp = this.piece(first);
        this.setPiece(first, this.piece(second));
        this.setPiece(second, temp);
    }

    positions(): Position[] {
        let results = [] as Position[];
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board[i].length; j++) {
                results.push({ row: i, col: j });
            }
        }
        return results;
    }

    get width() {
        return this.board[0].length;
    }

    get height() {
        return this.board.length;
    }

    isOutsideBoard(p: Position): boolean {
        return (
            p.col >= this.width ||
            p.row >= this.height ||
            p.col < 0 ||
            p.row < 0
        );
    }

    /**
     * Recursively finds the amount of matching pieces to the left of position, the piece itself exclusive.
     * E.g. given the state:
     * board.state =  [
     *  [1, 1, 1]
     * ]
     * getLeftConsecutiveMatches(board, {row: 0, col: 2})
     * will return 2, since there are 2 matching "1" to the left of pos (0, 2)
     */
    getLeftConsecutiveMatches(position: Position): number {
        function go(
            board: Board<T>,
            pieceToMatch: T,
            positionToConsider: Position,
            matches: number
        ): number {
            if (
                board.isOutsideBoard(positionToConsider) ||
                board.piece(positionToConsider) !== pieceToMatch
            ) {
                return matches;
            } else {
                return go(
                    board,
                    pieceToMatch,
                    {
                        row: positionToConsider.row,
                        col: positionToConsider.col - 1,
                    },
                    matches + 1
                );
            }
        }

        return go(
            this,
            this.piece(position),
            { row: position.row, col: position.col - 1 },
            0
        );
    }

    /**
     * Recursively finds the amount of matching pieces to the left of position, the piece itself exclusive.
     * E.g. given the state:
     * board.state =  [
     *  [1, 1, 1]
     * ]
     * getRightConsecutiveMatches(board, {row: 0, col: 0})
     * will return 2, since there are 2 matching "1" to the right of pos (0, 0)
     */
    getRightConsecutiveMatches(position: Position): number {
        function go(
            board: Board<T>,
            pieceToMatch: T,
            positionToConsider: Position,
            matches: number
        ): number {
            if (
                board.isOutsideBoard(positionToConsider) ||
                board.piece(positionToConsider) !== pieceToMatch
            ) {
                return matches;
            } else {
                return go(
                    board,
                    pieceToMatch,
                    {
                        row: positionToConsider.row,
                        col: positionToConsider.col + 1,
                    },
                    matches + 1
                );
            }
        }

        return go(
            this,
            this.piece(position),
            { row: position.row, col: position.col + 1 },
            0
        );
    }

    /**
     * Recursively finds the amount of matching pieces above the position, the piece itself exclusive.
     * E.g. given the state:
     * board.state =  [
     *  [1, 0 ,0],
     *  [1, 1, 1],
     *  [1, 0, 1],
     * ]
     * getAboveConsecutiveMatches(board, {row: 2, col: 0})
     * will return 2, since there are 2 matching "1" above of pos (2, 0)
     */
    getAboveConsecutiveMatches(position: Position): number {
        function go(
            board: Board<T>,
            pieceToMatch: T,
            positionToConsider: Position,
            matches: number
        ): number {
            if (
                board.isOutsideBoard(positionToConsider) ||
                board.piece(positionToConsider) !== pieceToMatch
            ) {
                return matches;
            } else {
                return go(
                    board,
                    pieceToMatch,
                    {
                        row: positionToConsider.row - 1,
                        col: positionToConsider.col,
                    },
                    matches + 1
                );
            }
        }

        return go(
            this,
            this.piece(position),
            { row: position.row - 1, col: position.col },
            0
        );
    }

    /**
     * Recursively finds the amount of matching pieces below the position, the piece itself exclusive.
     * E.g. given the state:
     * board.state =  [
     *  [1, 0 ,0],
     *  [1, 1, 1],
     *  [1, 0, 1],
     * ]
     * getBelowConsecutiveMatches(board, {row: 0, col: 0})
     * will return 2, since there are 2 matching "1" below of pos (0, 0)
     */
    getBelowConsecutiveMatches(position: Position): number {
        function go(
            board: Board<T>,
            pieceToMatch: T,
            positionToConsider: Position,
            matches: number
        ): number {
            if (
                board.isOutsideBoard(positionToConsider) ||
                board.piece(positionToConsider) !== pieceToMatch
            ) {
                return matches;
            } else {
                return go(
                    board,
                    pieceToMatch,
                    {
                        row: positionToConsider.row + 1,
                        col: positionToConsider.col,
                    },
                    matches + 1
                );
            }
        }

        return go(
            this,
            this.piece(position),
            { row: position.row, col: position.col },
            0
        );
    }

    getVerticalMatches(col: number): Match<T>[] {
        function go(
            board: Board<T>,
            p: Position,
            pieceToMatch: T,
            buffer: Position[],
            allMatches: Match<T>[]
        ) {
            if (board.isOutsideBoard(p)) {
                if (buffer.length >= 3) {
                    allMatches = allMatches.concat([
                        { matched: pieceToMatch, positions: buffer },
                    ]);
                }
                return allMatches;
            }

            let nextPosition = { row: p.row + 1, col };
            if (board.piece(p) === pieceToMatch && pieceToMatch !== undefined) {
                return go(
                    board,
                    nextPosition,
                    pieceToMatch,
                    buffer.concat([p]),
                    allMatches
                );
            } else {
                const nextType = board.piece(nextPosition);
                nextPosition =
                    nextType !== undefined && nextType !== pieceToMatch
                        ? p
                        : nextPosition;
                if (buffer.length >= 3) {
                    return go(
                        board,
                        nextPosition,
                        nextType ?? pieceToMatch,
                        [],
                        allMatches.concat([
                            { matched: pieceToMatch, positions: buffer },
                        ])
                    );
                } else {
                    return go(
                        board,
                        nextPosition,
                        nextType ?? pieceToMatch,
                        [],
                        allMatches
                    );
                }
            }
        }

        const firstPosition = { row: 0, col };
        const firstPieceType = this.piece(firstPosition);
        return go(this, firstPosition, firstPieceType, [], []);
    }

    getHorizontalMatches(row: number): Match<T>[] {
        function go(
            board: Board<T>,
            p: Position,
            pieceToMatch: T,
            buffer: Position[],
            allMatches: Match<T>[]
        ) {
            if (board.isOutsideBoard(p)) {
                if (buffer.length >= 3) {
                    allMatches = allMatches.concat([
                        { matched: pieceToMatch, positions: buffer },
                    ]);
                }
                return allMatches;
            }

            let nextPosition = { row, col: p.col + 1 };
            if (board.piece(p) === pieceToMatch) {
                return go(
                    board,
                    nextPosition,
                    pieceToMatch,
                    buffer.concat([p]),
                    allMatches
                );
            } else {
                const nextType = board.piece(nextPosition);
                nextPosition =
                    nextType !== undefined && nextType !== pieceToMatch
                        ? p
                        : nextPosition;
                if (buffer.length >= 3) {
                    return go(
                        board,
                        p,
                        nextType ?? pieceToMatch,
                        [],
                        allMatches.concat([
                            { matched: pieceToMatch, positions: buffer },
                        ])
                    );
                } else {
                    return go(
                        board,
                        nextPosition,
                        nextType ?? pieceToMatch,
                        [],
                        allMatches
                    );
                }
            }
        }

        const firstPosition = { row, col: 0 };
        const firstPieceType = this.piece(firstPosition);
        return go(this, firstPosition, firstPieceType, [], []);
    }

    clearMatches(matchesToClear: Match<T>[]) {
        matchesToClear.forEach((match) => {
            match.positions.forEach((position) => {
                this.setPiece(position, undefined);
            });
        });
    }
    isDiagonalMove(first: Position, second: Position): boolean {
        return (
            Math.abs(first.row - second.row) > 0 &&
            Math.abs(first.col - second.col) > 0
        );
    }
}
