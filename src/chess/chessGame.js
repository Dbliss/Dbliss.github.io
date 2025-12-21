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

	// Compatibility helpers (chess.js renamed these across versions)
	const isCheckmate = () =>
		typeof chess.isCheckmate === "function" ? chess.isCheckmate()
		: typeof chess.in_checkmate === "function" ? chess.in_checkmate()
		: false;

	const isDraw = () =>
		typeof chess.isDraw === "function" ? chess.isDraw()
		: typeof chess.in_draw === "function" ? chess.in_draw()
		: false;

	return {
		chess,
		reset() {
			chess.reset();
		},
		turn() {
			return chess.turn(); // 'w' or 'b'
		},
		legalMovesFrom(square) {
			return chess.moves({ square, verbose: true });
		},
		tryMove(from, to, promotion = "q") {
			try {
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
			return typeof chess.isGameOver === "function" ? chess.isGameOver()
				: typeof chess.game_over === "function" ? chess.game_over()
				: false;
		},

		// New: these power your win/lose scene
		isCheckmate() {
			return isCheckmate();
		},
		isDraw() {
			return isDraw();
		},

		// New: single call for UI logic
		outcome() {
			if (!this.isGameOver()) return { status: "ongoing", winner: null };

			if (this.isCheckmate()) {
				// side-to-move is checkmated, so winner is the opposite
				const winner = this.turn() === "w" ? "black" : "white";
				return { status: "checkmate", winner };
			}

			// stalemate / repetition / insufficient / 50-move etc.
			if (this.isDraw()) return { status: "draw", winner: null };

			// Fallback for any other "game over" condition
			return { status: "over", winner: null };
		},
	};
}
