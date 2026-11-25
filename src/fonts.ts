import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {FONT_CAPTION, FONT_HOOK, FONT_TITLE} from './theme';

// Schriften liegen lokal in /assets/fonts (SIL Open Font License) –
// kein Netzwerkzugriff beim Rendern nötig.
export const fontsLoaded = Promise.all([
	loadFont({family: FONT_TITLE, url: staticFile('fonts/cinzel-latin-700-normal.woff2'), weight: '700'}),
	loadFont({family: FONT_TITLE, url: staticFile('fonts/cinzel-latin-900-normal.woff2'), weight: '900'}),
	loadFont({family: FONT_CAPTION, url: staticFile('fonts/montserrat-latin-800-normal.woff2'), weight: '800'}),
	loadFont({family: FONT_HOOK, url: staticFile('fonts/anton-latin-400-normal.woff2'), weight: '400'}),
	loadFont({family: FONT_CAPTION, url: staticFile('fonts/montserrat-latin-900-normal.woff2'), weight: '900'}),
]);
