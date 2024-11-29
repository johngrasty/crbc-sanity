import page from './page';
import hero from './sections/hero';
import textWithImage from './sections/textWithImage';
import gallery from './sections/gallery';
import callToAction from './sections/callToAction';
import staff from './staff';
import announcement from './announcement';
import navigation from './navigation';
import settings from './settings';

export const schemaTypes = [
	// Documents
	page,
	staff,
	announcement,
	navigation,
	settings,
	// Objects (Sections)
	hero,
	textWithImage,
	gallery,
	callToAction
];
