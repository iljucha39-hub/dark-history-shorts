import type React from 'react';
import type {SceneType} from '../src/types';
import {BattleScene, CastleScene, DungeonScene, SeaScene, VillageScene} from './LandscapeScenes';
import {MapScene} from './MapScene';
import {DocumentScene, PortraitScene, TitleScene} from './StoryScenes';
import type {SceneProps} from './types';

/** Alle verfügbaren Szenentypen. Neue Szenen hier registrieren. */
export const SCENES: Record<SceneType, React.FC<SceneProps>> = {
	title: TitleScene,
	castle: CastleScene,
	village: VillageScene,
	battle: BattleScene,
	map: MapScene,
	portrait: PortraitScene,
	document: DocumentScene,
	dungeon: DungeonScene,
	sea: SeaScene,
};

export {DEFAULT_CAMERA, DEFAULT_MOOD} from './types';
export type {SceneProps} from './types';
