import React from 'react';
import {Composition} from 'remotion';
import demoScript from '../scripts/beispiel-pest-1347.json';
import './fonts';
import {estimateTimeline} from './lib/estimate';
import {FPS, HEIGHT, WIDTH} from './theme';
import type {VideoProps, VideoScript} from './types';
import {DarkHistoryVideo} from './Video';

const demo = demoScript as unknown as VideoScript;

export const RemotionRoot: React.FC = () => (
	<Composition
		id="DarkHistoryShort"
		component={DarkHistoryVideo}
		width={WIDTH}
		height={HEIGHT}
		fps={FPS}
		durationInFrames={FPS * 45}
		defaultProps={{script: demo, timeline: estimateTimeline(demo, FPS), audio: null} as VideoProps}
		calculateMetadata={({props}) => ({
			durationInFrames: Math.max(FPS, Math.ceil(props.timeline.duration * FPS)),
		})}
	/>
);
