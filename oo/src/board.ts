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
    private listeners: BoardListener<T>[] = [];
    private board: T[][];

    constructor(generator: Generator<T>, cols: number, rows: number) {
        this.board = [];
        for (let i = 0; i < rows; i++) {
            this.board.push([] as T[]);
            for (let j = 0; j < cols; j++) {
                this.board[i].push(generator.next());
            }
        }
    }

    addListener(listener: BoardListener<T>) {
        this.listeners.push(listener);
    }

    piece(p: Position): T | undefined {
        if (p.row<0 || p.col<0) return undefined;
        if (p.row>=this.board.length) return undefined;
        if (p.col>=this.board[p.row].length) return undefined;
        return this.board[p.row][p.col] ?? undefined;
    }



    canMove(first: Position, second: Position): boolean {
        if (second.row<0 || second.col<0) return false;
        if (second.row>=this.board.length) return false;
        if (second.col>=this.board[second.row].length) return false;
        if (first.row<0 || first.col<0) return false;
        if (first.row>=this.board.length) return false;
        if (first.col>=this.board[first.row].length) return false;
        if (first.row===second.row && first.col === second.col) return false;
        if ((Math.abs(first.row - second.row)>=1) && (Math.abs(first.col - second.col)>=1)) return false; 
        this.swapPostion(first, second);
        const result =  this.hasMatch<T>(this, second, this.piece(first)) || this.hasMatch<T>(this, first, this.piece(second));
        
        return result;
    }

    move(first: Position, second: Position) {
        if (!this.canMove(first, second)) {
            return;
        }
        this.swapPostion(first, second);
    }

    hasMatch<T>(
        board: Board<T>,
        fromPosition: Position,
        value: T | undefined
    ): boolean {
        if (value === undefined) {
            return false;
        }


        let matches = 1;
        // Check upwards
        const upCheckStartingRow = this.isOutOfBounds({
            row: fromPosition.row - 1,
            col: fromPosition.col,
        })
            ? fromPosition.row
            : fromPosition.row - 1;
        for (let i = upCheckStartingRow; i >= 0; i--) {
            if (board.piece({ row: i, col: fromPosition.col }) === value) {
                matches++;
                if (matches === 3) {
                    return true;
                }
            }
        }

        // Check downward
        const downCheckStaringRow = this.isOutOfBounds({
            row: fromPosition.row + 1,
            col: fromPosition.col,
        })
            ? fromPosition.row
            : fromPosition.row - 1;
        for (let i = downCheckStaringRow; i < this.board.length; i++) {
            if (board.piece({ row: i, col: fromPosition.col }) === value) {
                matches++;
                if (matches === 3) {
                    return true;
                }
            }
        }

        // Check left
        matches = 1;
        const leftCheckStartingCol = this.isOutOfBounds({
            row: fromPosition.row,
            col: fromPosition.col - 1,
        })
            ? fromPosition.col
            : fromPosition.col - 1;
        for (let i = fromPosition.col - 1; i >= 0; i--) {
            if (board.piece({ row: fromPosition.row, col: i }) === value) {
                matches++;
                if (matches === 3) {
                    return true;
                }
            }
        }

        // Check right
        const rightCheckStartingCol = this.isOutOfBounds({
            row: fromPosition.row,
            col: fromPosition.col + 1,
        })
            ? fromPosition.col
            : fromPosition.col + 1;
        for (let i = fromPosition.col + 1; i < this.board.length; i++) {
            if (board.piece({ row: fromPosition.row, col: i }) === value) {
                matches++;
                if (matches === 3) {
                    return true;
                }
            }
        }
        return false;
    }

    isOutOfBounds(position: Position): boolean {
        if (position.col < 0 || position.col > this.board[0].length - 1) {
            return true;
        }

        if (position.row < 0 || position.row > this.board.length - 1) {
            return true;
        }

        return false;
    }

    swapPostion(first: Position, second: Position) {
        const temp = this.piece(first);
        this.board[first.row][first.col] = this.board[second.row][second.col];
        this.board[second.row][second.col] = temp;
    }

    getHorizontalPositionsToClear(): Position[] {
        let results = [] as Position[];
        for (let i = 0; i < this.board.length; i++) {
            for (let j = 0; j < this.board[i].length; j++) {
                if (this.piece({ row: i, col: j }) === undefined) {
                    continue;
                }

                let endOfMatch = false;
                let pieceToMatch = this.piece({ row: i, col: j });
                // NOTE: (mibui 2023-09-28) Keeps track of which pieces we have matched in this sequence so far
                //                          We don't add directly to results, since we want to ensure that only
                //                          horizontal sequences of 3+ will get cleared.
                let matchPositionsBuffer = [{ row: i, col: j }] as Position[];
                let nextColPointer = j + 1;
                while (!endOfMatch && nextColPointer < this.board[i].length) {
                    const nextPiece = this.piece({
                        row: i,
                        col: nextColPointer,
                    });

                    if (nextPiece === undefined || nextPiece !== pieceToMatch) {
                        endOfMatch = true;
                        break;
                    }

                    matchPositionsBuffer.push({ row: i, col: nextColPointer });
                    nextColPointer++;
                }

                if (matchPositionsBuffer.length >= 3) {
                    results = results.concat(matchPositionsBuffer);
                    if (nextColPointer < this.board[i].length) {
                        j = nextColPointer;
                    }
                }
            }
        }
        return results;
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



    clearMatches<T>() {}
    toString(): string {
        return JSON.stringify(this.board, null, 4);
    }
}
