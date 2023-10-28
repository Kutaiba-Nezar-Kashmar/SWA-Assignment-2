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


type RefillResult<T> = {
    board: Board<T>;
    hasRefilled: boolean;
}
type movePiceResult<T> = {
    board: Board<T>;
    stateChanged: boolean;
    newPiecePosition: Position;
}

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

    function gameLoop(board: Board<T>, effects: Effect<T>[]): MoveResult<T>{
        console.log("BEFORE MATCHES", board.state);
        let allMatches = getAllMatches(board);
        if(allMatches.length > 0){
            let newCleardBoard = clearMatches(board, allMatches);
            let boardAfterMoved = movePiecesDown(newCleardBoard);
            let refillResult = refillEmptyPostions(boardAfterMoved, generator);

            if (refillResult.hasRefilled){
                console.log("REFILLED", refillResult.board.state)
                return gameLoop(refillResult.board, [...effects, ...allMatches.flatMap((m) => {
                    return { kind: "Match" as "Match",  match: m}
                }), {kind: "Refill" as "Refill", board: refillResult.board}])
            }else{
                return gameLoop(refillResult.board, [...effects, ...allMatches.flatMap((m) => {
                    return { kind: "Match" as "Match",  match: m}
                })])
            }
        }else{
            return {board, effects}
        }
    }
    return gameLoop(boardAfterMove, []);
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
        { row: position.row  + 1, col: position.col },
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

        let nextPosition = { row, col: p.col + 1 };
        if (piece(board, p) === pieceToMatch && pieceToMatch !== undefined) {
            return go(
                board,
                nextPosition,
                pieceToMatch,
                buffer.concat([p]),
                allMatches
            );
        } else {
            const nextType = piece(board, nextPosition);
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
        if (piece(board, p) === pieceToMatch && pieceToMatch !== undefined) {
            return go(
                board,
                nextPosition,
                pieceToMatch,
                buffer.concat([p]),
                allMatches
            );
        } else {
            const nextType = piece(board, nextPosition);
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
    const firstPieceType = piece(board, firstPosition);
    return go(board, firstPosition, firstPieceType, [], []);
}

function getEmptyPositions<T>(board: Board<T>): Position[]{
    function go(board: Board<T>, currentPosition: Position, emptyPositions: Position[]): Position[]{
        const newPosition = currentPosition.col < board.width -1 ? {row:currentPosition.row, col:currentPosition.col+1} : {row: currentPosition.row+1, col:0}
        if (isOutsideBoard(board, currentPosition)){
            return emptyPositions
        }else{
            if (piece(board, currentPosition) === undefined){
                return go(board, newPosition, [...emptyPositions, currentPosition])
            }else{
                return go(board, newPosition, emptyPositions)
            }
        }
    }

    return go(board, {row: 0, col:0},  []);
}

function refillEmptyPostions<T>(board: Board<T>, generator: Generator<T>): RefillResult<T> {
    const emptyPositions = getEmptyPositions(board);
    const refilledBoard = emptyPositions.reduce((currentBoardState, currentEmptyPosition) => setPiece(currentBoardState, currentEmptyPosition, generator.next()), board)
    return {board: refilledBoard, hasRefilled: emptyPositions.length > 0 }
}

function clearMatches<T>(board: Board<T>, matchesToClear: Match<T>[]): Board<T> {
    return matchesToClear.reduce((_, currentMatch) => {
        return currentMatch.positions.reduce((boardAccumulator, currentPosition) => {
            return setPiece(boardAccumulator, currentPosition, undefined);
        }, board);
    }, board);
}

function setPiece<T>(board: Board<T>, p: Position, value: T): Board<T> {
    if (isOutsideBoard(board, p)) {
        return;
    }

    return {
        state: board.state.map((row, rowIdx) =>
            row.map((col, colIdx) => {
                if (indexesMatchesPosition(p, rowIdx, colIdx)) {
                    return value;
                } else {
                    return col;
                }
            })
        ),
        height: board.height,
        width: board.width,
    };
}

function movePiecesInColumnToButtom<T>(board: Board<T>, position: Position): Board<T>{
    if (position.row < 0){
        return board;
    }else{
        const newBoardState = movePieceToButtom(board, position);
        return movePiecesInColumnToButtom(newBoardState, {row: position.row-1, col: position.col});
    }
}

function movePieceToButtom<T>(board: Board<T>, position: Position): Board<T>{
    if (isOutsideBoard(board, position)){
        return board;
    }

    const below = {row: position.row+1, col:position.col} as Position;
    const belowPiece = piece(board, below);

    if (belowPiece !== undefined){
        return board;
    }else{
        const moveResult = movePieceDown(board, position);
        if(moveResult.stateChanged){
            return movePieceToButtom(moveResult.board, moveResult.newPiecePosition);
        }
        else{
            return moveResult.board;
        }
    }
}

function movePiecesDown<T>(board: Board<T>): Board<T> {
    function do_movePiecesDown<T>(currentBoardState: Board<T>, currentColumn:number ): Board<T>{
        if (currentColumn >= currentBoardState.width){
            return currentBoardState;
        }else{
            const newBoardState = movePiecesInColumnToButtom(currentBoardState, {row: currentBoardState.height -1, col: currentColumn});
            return do_movePiecesDown(newBoardState, currentColumn + 1);
        }
    }
    return do_movePiecesDown(board, 0);
}


function movePieceDown<T>(board: Board<T>, p: Position): movePiceResult<T> {
    const _piece = piece(board, p);
    if (
        isOutsideBoard(board, p) ||
        _piece === undefined ||
        p.row === board.height - 1
    ) {
        return {board, stateChanged: false, newPiecePosition: p};
    }

    const down = { row: p.row + 1, col: p.col };
    if (piece(board, down) !== undefined) {
        return {board, stateChanged: false, newPiecePosition: p};
    }

    let newBoard = swap(board, p, down);
    return {board: newBoard, stateChanged: true, newPiecePosition: down};
}


function getAllMatches<T>(board: Board<T>): Match<T>[] {
    function collectHorizontalMatches(board: Board<T>, currentPosition: Position, allMatches: Match<T>[]): Match<T>[]{
        if (isOutsideBoard(board, currentPosition)){
            return allMatches;
        }else{
            const horizontalMatches = getHorizontalMatches(board, currentPosition.row);
            const newPosition: Position =  {row: currentPosition.row+1, col: currentPosition.col};
            return collectHorizontalMatches(board, newPosition, [...allMatches, ...horizontalMatches])
        }
    }
    
    function collectVerticalMatches(board: Board<T>, currentPosition: Position, allMatches: Match<T>[]): Match<T>[]{
        if (isOutsideBoard(board, currentPosition)){
            return allMatches;
        }else{
            const verticalMatches = getVerticalMatches(board, currentPosition.col);
            const newPosition: Position =  {row: currentPosition.row, col: currentPosition.col+1};
            return collectVerticalMatches(board, newPosition, [...allMatches, ...verticalMatches])
        }
    }

    const verticalMatches = collectVerticalMatches(board, {row: 0, col: 0}, []);
    const horizontalMatches= collectHorizontalMatches(board, {row: 0, col: 0}, []);
  
    return [...horizontalMatches, ...verticalMatches]
  }
