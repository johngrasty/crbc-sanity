import { StructureBuilder, StructureResolverContext } from 'sanity/structure';
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list';
import {
  BellRing,
  Settings,
  FileText,
  Users,
  BookOpen,
  Folder,
  Navigation,
  UserCircle,
  Menu,
  MenuSquare,
  Church,
  AlertCircle,
  Home,
  Palette,
  Info,
  Phone,
  DollarSign,
  MapPin,
  Heart,
  UserPlus,
  HelpCircle,
  CalendarDays,
  Briefcase,
  Wrench
} from 'lucide-react';
import { AnnouncementHelp } from '../schemaTypes/components/AnnouncementHelp';
import { SignUpHelp } from '../schemaTypes/components/SignUpHelp';

export const deskStructure = (S: StructureBuilder, context: StructureResolverContext) =>
  S.list()
    .title('CRBC Website')
    .items([
      // Pages Section
      S.listItem()
        .title('Pages')
        .icon(FileText)
        .child(
          S.list()
            .title('Pages')
            .items([
              S.listItem()
                .title('Home Page')
                .id('homePage')
                .icon(Home)
                .child(S.document().schemaType('homePage').documentId('homePage')),
              S.listItem()
                .title('About Page')
                .id('aboutPage')
                .icon(Info)
                .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
              S.listItem()
                .title('Connect Page')
                .id('connectPage')
                .icon(Phone)
                .child(S.document().schemaType('connectPage').documentId('connectPage')),
              S.listItem()
                .title('Beliefs Page')
                .id('beliefsPage')
                .icon(BookOpen)
                .child(S.document().schemaType('beliefsPage').documentId('beliefsPage')),
              S.listItem()
                .title('Giving Page')
                .id('givingPage')
                .icon(DollarSign)
                .child(S.document().schemaType('givingPage').documentId('givingPage')),
              S.listItem()
                .title('Visit Page')
                .id('visitPage')
                .icon(MapPin)
                .child(S.document().schemaType('visitPage').documentId('visitPage')),
              S.listItem()
                .title('Services Page')
                .id('servicesPage')
                .icon(Church)
                .child(S.document().schemaType('servicesPage').documentId('servicesPage')),
              S.listItem()
                .title('Watch Page')
                .id('watchPage')
                .icon(FileText)
                .child(S.document().schemaType('watchPage').documentId('watchPage')),
              S.listItem()
                .title('Calendar Page')
                .id('calendarPage')
                .icon(CalendarDays)
                .child(S.document().schemaType('calendarPage').documentId('calendarPage')),
              S.listItem()
                .title('Life Groups Page')
                .id('lifeGroupsPage')
                .icon(Users)
                .child(S.document().schemaType('lifeGroupsPage').documentId('lifeGroupsPage')),
              S.listItem()
                .title('Community Groups Page')
                .id('communityGroupsPage')
                .icon(Users)
                .child(S.document().schemaType('communityGroupsPage').documentId('communityGroupsPage')),
              S.divider(),
              S.listItem()
                .title('Other Pages')
                .icon(FileText)
                .child(S.documentTypeList('page')),
            ])
        ),

      S.divider(),

      // Site Alert (single banner shown on every page; weather closures, urgent notices)
      S.listItem()
        .title('Site Alert (closures, urgent notices)')
        .id('siteAlert')
        .icon(AlertCircle)
        .child(S.document().schemaType('siteAlert').documentId('siteAlert')),

      S.divider(),

      // Ministries Section
      S.listItem()
        .title('Ministries')
        .icon(Heart)
        .child(S.documentTypeList('ministry')),

      S.divider(),

      // Sign-Ups Section
      S.listItem()
        .title('Sign-Ups')
        .icon(UserPlus)
        .child(
          S.list()
            .title('Sign-Ups')
            .items([
              S.listItem()
                .title('About Sign-Ups')
                .icon(HelpCircle)
                .child(
                  S.component(SignUpHelp)
                    .title('Custom Sign-Ups Guide')
                ),
              S.divider(),
              S.listItem()
                .title('All Custom Sign-Ups')
                .icon(UserPlus)
                .child(
                  S.documentTypeList('customSignUp')
                    .title('All Custom Sign-Ups')
                    .defaultOrdering([{ field: 'active', direction: 'desc' }, { field: 'featured', direction: 'desc' }, { field: 'date', direction: 'asc' }])
                ),
              S.listItem()
                .title('Inactive Sign-Ups')
                .icon(UserPlus)
                .child(
                  S.documentTypeList('customSignUp')
                    .title('Inactive Sign-Ups')
                    .filter('_type == "customSignUp" && active == false')
                    .defaultOrdering([{ field: '_updatedAt', direction: 'desc' }])
                ),
            ])
        ),

      S.divider(),

      // Job Openings Section
      S.listItem()
        .title('Job Openings')
        .icon(Briefcase)
        .child(
          S.list()
            .title('Job Openings')
            .items([
              S.listItem()
                .title('All Job Openings')
                .icon(Briefcase)
                .child(
                  S.documentTypeList('jobOpening')
                    .title('All Job Openings')
                    .defaultOrdering([{ field: 'displayOrder', direction: 'asc' }])
                ),
              S.listItem()
                .title('Hidden and Closed')
                .icon(Briefcase)
                .child(
                  S.documentTypeList('jobOpening')
                    .title('Hidden and Closed Job Openings')
                    .filter('_type == "jobOpening" && (active != true || (defined(closeDate) && closeDate < now()))')
                    .defaultOrdering([{ field: '_updatedAt', direction: 'desc' }])
                ),
            ])
        ),

      S.divider(),

      // Site Settings Section
      S.listItem()
        .title('Site Settings')
        .icon(Settings)
        .child(
          S.list()
            .title('Site Settings')
            .items([
              S.listItem()
                .title('Church info, service times, social')
                .id('settings')
                .icon(Settings)
                .child(S.document().schemaType('settings').documentId('settings')),
            ])
        ),

      S.divider(),

      // Staff & Leadership folder
      S.listItem()
        .title('Staff & Leadership')
        .icon(Users)
        .child(
          S.list()
            .title('Staff & Leadership')
            .items([
              // Drag to reorder within each category. The plugin writes staff.orderRank;
              // the website sorts by category, then orderRank.
              orderableDocumentListDeskItem({
                type: 'staff',
                title: 'Pastoral Staff (drag to reorder)',
                icon: UserCircle,
                filter: 'category == "pastoral"',
                id: 'staff-pastoral',
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'staff',
                title: 'Ministry Staff (drag to reorder)',
                icon: UserCircle,
                filter: 'category == "ministry"',
                id: 'staff-ministry',
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'staff',
                title: 'Support Staff (drag to reorder)',
                icon: UserCircle,
                filter: 'category == "support"',
                id: 'staff-support',
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'staff',
                title: 'Deacons (drag to reorder)',
                icon: UserCircle,
                filter: 'category == "deacons"',
                id: 'staff-deacons',
                S,
                context,
              }),
              S.divider(),
              S.listItem()
                .title('All Staff Members')
                .icon(Users)
                .child(S.documentTypeList('staff').title('All Staff Members')),
            ])
        ),

      // Content Section
      S.listItem()
        .title('Content')
        .icon(BookOpen)
        .child(
          S.list()
            .title('Content')
            .items([
              S.listItem()
                .title('Articles')
                .icon(BookOpen)
                .child(S.documentTypeList('article')),
              S.listItem()
                .title('Resources')
                .icon(Folder)
                .child(S.documentTypeList('resource')),
            ])
        ),

      S.divider(),

      // Announcements Section
      S.listItem()
        .title('Announcements')
        .icon(BellRing)
        .child(
          S.list()
            .title('Announcements')
            .items([
              // Help Guide
              S.listItem()
                .title('Quick Guide')
                .icon(HelpCircle)
                .child(
                  S.component(AnnouncementHelp)
                    .title('Announcement Management Guide')
                ),
              S.divider(),
              S.listItem()
                .title('All Announcements')
                .icon(Church)
                .child(
                  S.documentTypeList('announcement')
                    .title('All Announcements')
                    .defaultOrdering([{ field: 'priority', direction: 'desc' }])
                ),
              S.listItem()
                .title('Expired Announcements')
                .icon(Church)
                .child(
                  S.documentTypeList('announcement')
                    .title('Expired Announcements')
                    .filter('_type == "announcement" && defined(endDate) && endDate < now()')
                    .defaultOrdering([{ field: 'endDate', direction: 'desc' }])
                ),
            ])
        ),

      S.divider(),

      // Navigation Section
      S.listItem()
        .title('Navigation')
        .icon(Navigation)
        .child(
          S.list()
            .title('Navigation')
            .items([
              S.listItem()
                .title('Main Menu')
                .icon(Menu)
                .child(
                  S.document()
                    .schemaType('mainMenu')
                    .documentId('mainMenu')
                ),
              S.listItem()
                .title('Footer Menu')
                .icon(MenuSquare)
                .child(
                  S.document()
                    .schemaType('footerMenu')
                    .documentId('footerMenu')
                ),
              S.listItem()
                .title('Footer Settings')
                .icon(MenuSquare)
                .child(
                  S.document()
                    .schemaType('footerSettings')
                    .documentId('footerSettings')
                ),
            ])
        ),

      S.divider(),

      // Developer settings: values a volunteer editor should not need to touch.
      S.listItem()
        .title('Developer settings')
        .icon(Wrench)
        .child(
          S.list()
            .title('Developer settings')
            .items([
              S.listItem()
                .title('Design Tokens')
                .id('designTokens')
                .icon(Palette)
                .child(S.document().schemaType('designTokens').documentId('designTokens')),
            ])
        ),
    ]);