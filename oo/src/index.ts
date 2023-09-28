import { Board, Generator } from "./board";


const createGenerator = () =>  {
    let values = [3, 3, 3, 4]
    let index = 0;

    const next = ()=> {
        const val = values[index];
        index++;
        return val;
    }

    return {next};
}

const board = new Board(1, 4, createGenerator());

console.log(board.getHorizontalPositionsToClear(0));

