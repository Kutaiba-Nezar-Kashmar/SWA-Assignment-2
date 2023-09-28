import { Board, Generator } from "./board";

const createGenerator = () => {
    let values = [3, 3, 3, 4, 5, 3, 3, 3];
    let index = 0;

    const next = () => {
        const val = values[index];
        index++;
        return val;
    };

    return { next };
};

const board = new Board(2, 4, createGenerator());
console.log(board.toString());
console.log("to clear: ", board.getHorizontalPositionsToClear());
