import page from './page';
import hero from './sections/hero';
import textWithImage from './sections/textWithImage';
import gallery from './sections/gallery';
import callToAction from './sections/callToAction';
import staff from './staff';
import staffOrder from './staffOrder';
import announcement from './announcement';
import settings from './settings';
import mainMenu from './menus/mainMenu';
import footerMenu from './menus/footerMenu';

export const schemaTypes = [
	// Documents
	page,
	staff,
	staffOrder,
	announcement,
	settings,
	mainMenu,
	footerMenu,
	// Objects (Sections)
	hero,
	textWithImage,
	gallery,
	callToAction
];
