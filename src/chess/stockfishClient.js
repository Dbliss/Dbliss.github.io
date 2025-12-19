const DEFAULT_WORKER_URL = "/stockfish/stockfish-17.1-lite-single-03e3232.js";

function isString(x) {
	return typeof x === "string" || x instanceof String;
}

export class StockfishClient {
	constructor({
		workerUrl = DEFAULT_WORKER_URL,
		skillLevel = 2, // 0..20 (lower = weaker)
		movetimeMs = 100,
		hashMb = 16,
		threads = 1,
		debug = false,
	} = {}) {
		this.workerUrl = workerUrl;
		this.skillLevel = skillLevel;
		this.movetimeMs = movetimeMs;
		this.hashMb = hashMb;
		this.threads = threads;
		this.debug = debug;

		this.worker = null;
		this._ready = false;
		this._busy = false;

		this._pendingBestmove = null; // { resolve, reject, token }
		this._token = 0;
	}

	async init() {
		if (this.worker) return;

		// Stockfish worker scripts are usually "classic"
		this.worker = new Worker(this.workerUrl);

		this.worker.onmessage = (e) => {
			const line = isString(e.data) ? e.data : String(e.data);
			if (this.debug) console.log("[SF]", line);

			// Resolve bestmove
			if (this._pendingBestmove && line.startsWith("bestmove ")) {
				const { resolve } = this._pendingBestmove;

				this._pendingBestmove = null;
				this._busy = false;

				// "bestmove e2e4" or "bestmove e7e8q"
				const parts = line.trim().split(/\s+/);
				resolve(parts[1] || null);
			}
		};

		this.worker.onerror = (err) => {
			if (this._pendingBestmove) {
				this._pendingBestmove.reject(err);
				this._pendingBestmove = null;
			}
			this._busy = false;
		};

		// UCI handshake
		await this._sendAndWait("uci", (l) => l === "uciok");
		await this._sendAndWait("isready", (l) => l === "readyok");

		// Light configuration
		this.send(`setoption name Threads value ${this.threads}`);
		this.send(`setoption name Hash value ${this.hashMb}`);

		// Weakness
		// Skill Level exists in official Stockfish UCI options (0..20). :contentReference[oaicite:5]{index=5}
		this.send(`setoption name Skill Level value ${this.skillLevel}`);

		this.send("ucinewgame");
		await this._sendAndWait("isready", (l) => l === "readyok");

		this._ready = true;
	}

	send(cmd) {
		if (!this.worker) throw new Error("Stockfish worker not initialized. Call init() first.");
		this.worker.postMessage(cmd);
	}

	terminate() {
		if (this.worker) this.worker.terminate();
		this.worker = null;
		this._ready = false;
		this._busy = false;
		this._pendingBestmove = null;
	}

	/**
	 * Request a best move for a given FEN.
	 * By default uses `go movetime X` for “low strength / quick”.
	 */
	async bestMoveFromFen(fen, { movetimeMs = this.movetimeMs, depth = null } = {}) {
		if (!this._ready) await this.init();

    if (this._busy) {
    // Keep it simple: you shouldn't be asking for another move while one is running.
    throw new Error("Stockfish is busy");
    }

    this._busy = true;

    // Set position
    this.send(`position fen ${fen}`);

    // Start search
    const goCmd = depth != null ? `go depth ${depth}` : `go movetime ${movetimeMs}`;
    this.send(goCmd);

    return new Promise((resolve, reject) => {
        this._pendingBestmove = { resolve, reject };
    });
	}

	// --- internal ---
	_sendAndWait(cmd, predicate, timeoutMs = 3000) {
		return new Promise((resolve, reject) => {
			const start = performance.now();

			const handler = (e) => {
				const line = isString(e.data) ? e.data : String(e.data);
				if (predicate(line.trim())) {
					this.worker.removeEventListener("message", handler);
					resolve(true);
				} else if (performance.now() - start > timeoutMs) {
					this.worker.removeEventListener("message", handler);
					reject(new Error(`Stockfish timeout waiting after "${cmd}"`));
				}
			};

			this.worker.addEventListener("message", handler);
			this.send(cmd);
		});
	}
}

// Helpers: parse UCI "e2e4" / "e7e8q"
export function parseUciMove(uci) {
	if (!uci || uci.length < 4) return null;
	const from = uci.slice(0, 2);
	const to = uci.slice(2, 4);
	const promotion = uci.length >= 5 ? uci[4] : undefined;
	return { from, to, promotion };
}
