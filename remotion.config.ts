import {Config} from '@remotion/cli/config';

// Statische Dateien (Fonts, generierte Audios) liegen in /assets
Config.setPublicDir('./assets');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('swangle');
