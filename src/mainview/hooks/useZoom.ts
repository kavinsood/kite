import { useEffect, useState } from "react";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_KEY = "kite:zoomLevel";

export function useZoom() {
	const [zoom, setZoom] = useState(() => {
		const stored = localStorage.getItem(ZOOM_KEY);
		return stored ? Number(stored) : 1;
	});

	useEffect(() => {
		document.documentElement.style.zoom = String(zoom);
		localStorage.setItem(ZOOM_KEY, String(zoom));
	}, [zoom]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (!e.ctrlKey) return;

			if (e.key === "=" || e.key === "+") {
				e.preventDefault();
				setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10));
			} else if (e.key === "-") {
				e.preventDefault();
				setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10));
			} else if (e.key === "0") {
				e.preventDefault();
				setZoom(1);
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);
}
