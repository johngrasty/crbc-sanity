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
import bentoCard from './objects/bentoCard';
import statistic from './objects/statistic';
import resource from './resource';
import siteAlert from './alert';
import homePage from './pages/home';
import aboutPage from './pages/about';
import beliefsPage from './pages/beliefs';
import givingPage from './pages/giving';
import visitPage from './pages/visit';
import connectPage from './pages/connect';
import watchPage from './pages/watch';
import designTokens from './designTokens';
import logoCloud from './sections/logo-cloud';
import footerSettings from './singletons/footer';

export const schemaTypes = [
	// Documents
	homePage,
	aboutPage,
	beliefsPage,
	givingPage,
	visitPage,
	connectPage,
	watchPage,
	page,
	staff,
	staffOrder,
	announcement,
	siteAlert,
	settings,
	designTokens,
	footerSettings,
	mainMenu,
	footerMenu,
	article,
	resource,
	// Objects (Sections)
	hero,
	textWithImage,
	gallery,
	callToAction,
	logoCloud,
	// Objects (Fields)
	richText,
	bentoCard,
	statistic
];
