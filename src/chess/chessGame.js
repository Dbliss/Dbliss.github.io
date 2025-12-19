// src/chess/chessGame.js
import { Chess } from "chess.js";
import { parseUciMove } from "./stockfishClient";

export function fileRankToSquare(file, rank) {
	const f = String.fromCharCode("a".charCodeAt(0) + file);
	const r = String(rank + 1);
	return `${f}${r}`;
}

export function squareToFileRank(square) {
	const file = square.charCodeAt(0) - "a".charCodeAt(0);
	const rank = parseInt(square.slice(1), 10) - 1;
	return { file, rank };
}

export function createChessGame(fen = undefined) {
	const chess = fen ? new Chess(fen) : new Chess();

	return {
		chess,
		reset() {
			chess.reset();
		},
		turn() {
			return chess.turn(); // 'w' or 'b'
		},
		legalMovesFrom(square) {
			// chess.js supports verbose legal move generation per square. :contentReference[oaicite:8]{index=8}
			return chess.moves({ square, verbose: true });
		},
		tryMove(from, to, promotion = "q") {
			try {
				// chess.js accepts object notation {from,to,promotion}. :contentReference[oaicite:9]{index=9}
				return chess.move({ from, to, promotion });
			} catch {
				return null;
			}
		},
		tryMoveUci(uci) {
			const mv = parseUciMove(uci);
			if (!mv) return null;
			return this.tryMove(mv.from, mv.to, mv.promotion || "q");
		},
		fen() {
			return chess.fen();
		},
		pgn() {
			return chess.pgn();
		},
		history(verbose = true) {
			return chess.history({ verbose });
		},
		isGameOver() {
			return chess.isGameOver();
		},
	};
}
