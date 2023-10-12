export type Generator<T> = { next: () => T };

export type Position = {
    row: number;
    col: number;
};

export type Match<T> = {
    matched: T;
    positions: Position[];
};

export type Board<T> = {
    state: T[][];
    width: number;
    height: number;
};

type MatchEffect<T> = {
    kind: "Match";
    match: Match<T>;
};

type RefillEffect<T> = {
    kind: "Refill";
    board: Board<T>;
};

export type Effect<T> = MatchEffect<T> | RefillEffect<T>;

export type MoveResult<T> = {
    board: Board<T>;
    effects: Effect<T>[];
};

export function create<T>(
    generator: Generator<T>,
    width: number,
    height: number
): Board<T> {
    return {
        state: createEmptyTwoDimensionalArray(height, width).map((row) =>
            row.map((_) => generator.next())
        ),
        width,
        height,
    };
}

export function piece<T>(board: Board<T>, p: Position): T | undefined {
    if (isOutsideBoard(board, p)) {
        return undefined;
    } else {
        return board.state[p.row][p.col];
    }
}

export function canMove<T>(
    board: Board<T>,
    first: Position,
    second: Position
): boolean {
    const boardAfterSwap = swap(board, first, second);

    return !(
        isOutsideBoard(board, first) ||
        isOutsideBoard(board, second) ||
        (!hasMatchHorizontally(boardAfterSwap, first) &&
            !hasMatchHorizontally(boardAfterSwap, second) &&
            !hasMatchVertically(boardAfterSwap, first) &&
            !hasMatchVertically(boardAfterSwap, second)) ||
        isDiagonalMove(first, second)
    );
}

export function move<T>(
    generator: Generator<T>,
    board: Board<T>,
    first: Position,
    second: Position
): MoveResult<T> {
    if (!canMove(board, first, second)) {
        return {
            board,
            effects: [],
        };
    }

    let boardAfterMove = swap(board, first, second);
    let firstPositionHorizontalMatchesEffect = getHorizontalMatches(
        boardAfterMove,
        first.row
    ).map((match) => {
        return { kind: "Match" as "Match", match };
    });
    let firstPositionVerticalMatchesEffect = getVerticalMatches(
        boardAfterMove,
        first.col
    ).map((match) => {
        return { kind: "Match" as "Match", match };
    });

    let secondPositionHorizontalMatchesEffect = getHorizontalMatches(
        boardAfterMove,
        second.row
    ).map((match) => {
        return { kind: "Match" as "Match", match };
    });
    let secondPositionVerticalMatchesEffect = getVerticalMatches(
        boardAfterMove,
        first.col
    ).map((match) => {
        return { kind: "Match" as "Match", match };
    });

    return {
        board: boardAfterMove,
        effects: [
            ...firstPositionHorizontalMatchesEffect,
            ...secondPositionHorizontalMatchesEffect,
            ...firstPositionVerticalMatchesEffect,
            ...secondPositionVerticalMatchesEffect,
        ],
    };
}

export function positions<T>(board: Board<T>): Position[] {
    return board.state.flatMap((row, rowIdx) =>
        row.map((col, colIdx) => {
            return { row: rowIdx, col: colIdx };
        })
    );
}

function createEmptyTwoDimensionalArray<T>(rows: number, cols: number): T[][] {
    return Array(rows).fill(Array(cols).fill(undefined));
}

function isOutsideBoard(
    board: { width: number; height: number },
    p: Position
): boolean {
    return (
        p.col >= board.width || p.row >= board.height || p.col < 0 || p.row < 0
    );
}

function hasMatchHorizontally<T>(board: Board<T>, position: Position): boolean {
    return (
        1 +
            getLeftConsecutiveMatches(board, position) +
            getRightConsecutiveMatches(board, position) >=
        3
    );
}

function hasMatchVertically<T>(board: Board<T>, position: Position): boolean {
    return (
        1 +
            getAboveConsecutiveMatches(board, position) +
            getBelowConsecutiveMatches(board, position) >=
        3
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
function getLeftConsecutiveMatches<T>(
    board: Board<T>,
    position: Position
): number {
    function go(
        board: Board<T>,
        pieceToMatch: T,
        positionToConsider: Position,
        matches: number
    ): number {
        if (
            isOutsideBoard(board, positionToConsider) ||
            piece(board, positionToConsider) !== pieceToMatch
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
        board,
        piece(board, position),
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
function getRightConsecutiveMatches<T>(
    board: Board<T>,
    position: Position
): number {
    function go(
        board: Board<T>,
        pieceToMatch: T,
        positionToConsider: Position,
        matches: number
    ): number {
        if (
            isOutsideBoard(board, positionToConsider) ||
            piece(board, positionToConsider) !== pieceToMatch
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
        board,
        piece(board, position),
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
function getAboveConsecutiveMatches<T>(
    board: Board<T>,
    position: Position
): number {
    function go(
        board: Board<T>,
        pieceToMatch: T,
        positionToConsider: Position,
        matches: number
    ): number {
        if (
            isOutsideBoard(board, positionToConsider) ||
            piece(board, positionToConsider) !== pieceToMatch
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
        board,
        piece(board, position),
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
function getBelowConsecutiveMatches<T>(
    board: Board<T>,
    position: Position
): number {
    function go(
        board: Board<T>,
        pieceToMatch: T,
        positionToConsider: Position,
        matches: number
    ): number {
        if (
            isOutsideBoard(board, positionToConsider) ||
            piece(board, positionToConsider) !== pieceToMatch
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
        board,
        piece(board, position),
        { row: position.row, col: position.col },
        0
    );
}

function isDiagonalMove(first: Position, second: Position): boolean {
    return (
        Math.abs(first.row - second.row) > 0 &&
        Math.abs(first.col - second.col) > 0
    );
}

function swap<T>(board: Board<T>, first: Position, second: Position): Board<T> {
    const firstPiece = piece(board, first);
    const secondPiece = piece(board, second);
    return {
        state: board.state.map((row, rowIdx) =>
            row.map((col, colIdx) => {
                if (indexesMatchesPosition(first, rowIdx, colIdx)) {
                    return secondPiece;
                } else if (indexesMatchesPosition(second, rowIdx, colIdx)) {
                    return firstPiece;
                } else {
                    return col;
                }
            })
        ),
        height: board.height,
        width: board.width,
    };
}

function indexesMatchesPosition(
    p: Position,
    rowIndex: number,
    colIndex: number
): boolean {
    return rowIndex === p.row && colIndex === p.col;
}

function getHorizontalMatches<T>(board: Board<T>, row: number): Match<T>[] {
    function go(
        board: Board<T>,
        p: Position,
        pieceToMatch: T,
        buffer: Position[],
        allMatches: Match<T>[]
    ) {
        if (isOutsideBoard(board, p)) {
            if (buffer.length >= 3) {
                allMatches = allMatches.concat([
                    { matched: pieceToMatch, positions: buffer },
                ]);
            }
            return allMatches;
        }

        let nextPosition = { row: row, col: p.col + 1 };
        if (piece(board, p) === pieceToMatch) {
            return go(
                board,
                nextPosition,
                pieceToMatch,
                buffer.concat([p]),
                allMatches
            );
        } else {
            const nextType = piece(board, nextPosition);
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

    const firstPosition = { row, col: 0 };
    const firstPieceType = piece(board, firstPosition);
    return go(board, firstPosition, firstPieceType, [], []);
}

function getVerticalMatches<T>(board: Board<T>, col: number): Match<T>[] {
    function go(
        board: Board<T>,
        p: Position,
        pieceToMatch: T,
        buffer: Position[],
        allMatches: Match<T>[]
    ) {
        if (isOutsideBoard(board, p)) {
            if (buffer.length >= 3) {
                allMatches = allMatches.concat([
                    { matched: pieceToMatch, positions: buffer },
                ]);
            }
            return allMatches;
        }

        let nextPosition = { row: p.row + 1, col };
        if (piece(board, p) === pieceToMatch) {
            return go(
                board,
                nextPosition,
                pieceToMatch,
                buffer.concat([p]),
                allMatches
            );
        } else {
            const nextType = piece(board, nextPosition);
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
    const firstPieceType = piece(board, firstPosition);
    return go(board, firstPosition, firstPieceType, [], []);
}
