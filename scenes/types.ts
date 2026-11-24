import type {SceneVisual} from '../src/types';
import type {Palette} from '../src/theme';

export interface SceneProps {
	visual: SceneVisual;
	durationInFrames: number;
	p: Palette;
	index: number;
}

/** Standard-Kamerabewegung je Szenentyp, falls im Skript nichts angegeben ist */
export const DEFAULT_CAMERA: Record<SceneVisual['type'], NonNullable<SceneVisual['camera']>> = {
	title: 'punchIn',
	castle: 'pushIn',
	village: 'panRight',
	battle: 'panLeft',
	map: 'pushIn',
	portrait: 'pushIn',
	document: 'drift',
	dungeon: 'tiltDown',
	sea: 'drift',
};

export const DEFAULT_MOOD: Record<SceneVisual['type'], NonNullable<SceneVisual['mood']>> = {
	title: 'blood',
	castle: 'night',
	village: 'fog',
	battle: 'blood',
	map: 'gold',
	portrait: 'night',
	document: 'gold',
	dungeon: 'fire',
	sea: 'storm',
};
