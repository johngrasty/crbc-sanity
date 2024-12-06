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
import article from './article';
import richText from './objects/richText';
import resource from './resource';
import siteAlert from './alert';

export const schemaTypes = [
	// Documents
	page,
	staff,
	staffOrder,
	announcement,
	siteAlert,
	settings,
	mainMenu,
	footerMenu,
	article,
	resource,
	// Objects (Sections)
	hero,
	textWithImage,
	gallery,
	callToAction,
	// Objects (Fields)
	richText
];
