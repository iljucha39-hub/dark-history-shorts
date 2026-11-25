// Datenmodell eines Videoskripts (scripts/*.json) und der vom Pipeline-Schritt
// erzeugten Zeitleiste. Die Pipeline (pipeline/*.mjs) validiert gegen dieselben Regeln.

export type SceneType =
	| 'title'
	| 'castle'
	| 'village'
	| 'battle'
	| 'map'
	| 'portrait'
	| 'document'
	| 'dungeon'
	| 'sea'
	| 'closeup';

export type CameraMove =
	| 'pushIn'
	| 'pullOut'
	| 'panLeft'
	| 'panRight'
	| 'tiltUp'
	| 'tiltDown'
	| 'drift'
	| 'punchIn';

export type Mood = 'night' | 'blood' | 'fog' | 'fire' | 'storm' | 'gold' | 'sunset' | 'dusk';

export type CharacterKind =
	| 'knight'
	| 'soldier'
	| 'archer'
	| 'king'
	| 'queen'
	| 'monk'
	| 'peasant'
	| 'plagueDoctor'
	| 'executioner'
	| 'noble'
	| 'viking'
	| 'sultan';

export type CharacterAction =
	| 'idle'
	| 'walk'
	| 'run'
	| 'march'
	| 'fight'
	| 'point'
	| 'cower'
	| 'raiseArm'
	| 'pray';

export interface CharacterSpec {
	kind: CharacterKind;
	action?: CharacterAction;
	/** horizontale Position 0..1 (Bildbreite) */
	x?: number;
	/** Größe relativ (1 = Standard) */
	scale?: number;
	facing?: 'left' | 'right';
	/** horizontale Bewegung über die Szene in Bildbreiten (z. B. 0.3) */
	travel?: number;
}

export interface MapMarker {
	lon: number;
	lat: number;
	label: string;
}

export interface MapSpec {
	/** Kartenausschnitt [West, Süd, Ost, Nord] in Grad */
	bounds: [number, number, number, number];
	markers?: MapMarker[];
	/** Route als Liste von [lon, lat] – wird animiert gezeichnet */
	route?: [number, number][];
	/** Ausbreitung (z. B. Seuche) ab diesem Marker-Index als wachsender Kreis */
	spreadFrom?: number;
	title?: string;
}

export interface SceneVisual {
	type: SceneType;
	camera?: CameraMove;
	mood?: Mood;
	/** großer Text (Titel, Jahreszahl, Name) */
	text?: string;
	/** kleiner Zusatztext */
	subtext?: string;
	characters?: CharacterSpec[];
	map?: MapSpec;
	fire?: boolean;
	rain?: boolean;
	lightning?: boolean;
	/** Großer Titel über dem Bild (Cover-Stil): obere Zeile weiß, untere groß in Rot */
	hook?: {top?: string; main: string};
	/** Flaggen-/Bannerfarben im Hintergrund (closeup) */
	flags?: string[];
}

export interface ScriptScene {
	id?: string;
	narration: string;
	visual: SceneVisual;
	/** Wörter, die in den Untertiteln rot hervorgehoben werden */
	emphasis?: string[];
}

export interface VideoScript {
	id: string;
	title: string;
	status: 'draft' | 'approved';
	category?: string;
	topic?: string;
	description?: string;
	hashtags?: string[];
	sources?: string[];
	voice?: {model?: string; lengthScale?: number};
	music?: {seed?: number; key?: string; file?: string};
	/** Aussprache-Ersetzungen nur für TTS, z. B. {"Vlad": "Wlad"} */
	pronunciations?: Record<string, string>;
	scenes: ScriptScene[];
}

export interface WordTiming {
	text: string;
	start: number;
	end: number;
	scene: number;
}

export interface SceneTiming {
	start: number;
	end: number;
	narrationStart: number;
	narrationEnd: number;
}

export interface Timeline {
	fps: number;
	duration: number;
	scenes: SceneTiming[];
	words: WordTiming[];
}

export interface VideoProps {
	script: VideoScript;
	timeline: Timeline;
	/** Pfad relativ zu /assets, z. B. generated/<id>/mix.wav */
	audio: string | null;
	[key: string]: unknown;
}
