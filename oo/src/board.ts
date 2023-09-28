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

export type BoardListener<T> = {
  onEvent: (event: BoardEvent<T>) => void;
};

export class Board<T> {
  private listeners: BoardListener<T>[] = [];
  private board: T[][];

  constructor(rows: number, cols: number, generator: Generator<T>) {
    this.board = [];
    for (let i = 0; i < rows; i++) {
      this.board.push([] as T[]);
      for (let j = 0; j < cols; j++) {
        this.board[i][j] = generator.next();
      }
    }
  }

  addListener(listener: BoardListener<T>) {
    this.listeners.push(listener);
  }

  piece(p: Position): T | undefined {
    return this.board[p.row][p.col] ?? undefined;
  }

  canMove(first: Position, second: Position): boolean {
    return this.hasMatch<T>(this, second, this.piece(first));
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

    let matches = 0;
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

  getHorizontalPositionsToClear(row: number): Position[]{
    function doGetHorizontalPositionsToClear(board: Board<T>, fromPosition: Position, visited: Map<Position, boolean>, res: Position[]){
        if (visited.has(fromPosition)){
            return;
        }

        const val = board.piece(fromPosition);
        let i = 0;
        let nextPiece;
        while (nextPiece === val && nextPiece !== undefined){
            nextPiece = board.piece({row: fromPosition.row, col: fromPosition.col + i});
            const currentPosition = {row: fromPosition.row, col: fromPosition.col + 1};
            res.push(currentPosition);
            visited.set(currentPosition, true);
            i++;
        }
    }
    
    const visited: Map<Position, boolean> = new Map();
    const res = [] as Position[];
    for (let i = 0; i < this.board.length; i++){
        doGetHorizontalPositionsToClear(this,{row: row, col: i},visited, res);
    }

    return res;
  }

  clearMatches<T>(){

  }

}
