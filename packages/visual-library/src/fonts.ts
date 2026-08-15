import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadJetBrainsMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadArchivoBlack} from '@remotion/google-fonts/ArchivoBlack';

let loaded = false;

/**
 * Load the fonts referenced by the style tokens for both the browser Player
 * and worker renders. Fonts are fetched once at bundle time (cached by
 * Remotion); offline renders fall back to system fonts.
 */
export function loadProjectFonts(): void {
  if (loaded) return;
  loaded = true;
  loadInter('normal', {weights: ['400', '600', '700', '800'], subsets: ['latin'], ignoreTooManyRequestsWarning: true});
  loadJetBrainsMono('normal', {weights: ['400', '600'], subsets: ['latin'], ignoreTooManyRequestsWarning: true});
  loadArchivoBlack('normal', {subsets: ['latin'], ignoreTooManyRequestsWarning: true});
}
