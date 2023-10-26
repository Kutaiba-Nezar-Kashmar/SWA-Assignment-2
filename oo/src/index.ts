import { Board, Generator } from "./board";
class GeneratorFake<T> implements Generator<T> {
    private upcoming: T[];

    constructor(...upcoming: T[]) {
        this.upcoming = upcoming;
    }

    prepare(...e: T[]) {
        this.upcoming.push(...e);
    }

    next(): T {
        let v = this.upcoming.shift();
        if (v === undefined) throw new Error("Empty queue");
        else return v;
    }
}

const generator = new GeneratorFake<String>(
    "D",
    "B",
    "A",
    "D",
    "B",
    "C",
    "B",
    "A",
    "B",
    "C",
    "B",
    "D"
);
const board = new Board(generator, 3, 4);
board.debugNow = true;
generator.prepare("D", "C", "B", "B", "A");
board.move({ row: 0, col: 1 }, { row: 2, col: 1 });
