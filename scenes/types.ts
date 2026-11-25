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
	closeup: 'pushIn',
};

export const DEFAULT_MOOD: Record<SceneVisual['type'], NonNullable<SceneVisual['mood']>> = {
	title: 'blood',
	castle: 'dusk',
	village: 'sunset',
	battle: 'sunset',
	map: 'gold',
	portrait: 'sunset',
	document: 'gold',
	dungeon: 'fire',
	sea: 'dusk',
	closeup: 'sunset',
};
