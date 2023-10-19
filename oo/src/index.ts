import { Board, Generator } from "./board";

const createGenerator = () => {
    let values = ["A", "D", "D", "D", "D", "D"];
    let index = 0;

    const next = () => {
        const val = values[index];
        index++;
        return val;
    };

    return { next };
};

const board = new Board(createGenerator(), 1, 5);

board.debugNow = true;
console.log((board.board = [["A", "D", "D", "D", "A"]]));
console.log(board.getHorizontalMatches(0));
