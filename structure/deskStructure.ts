import { StructureBuilder } from 'sanity/structure';
import {
  BellRing,
  Settings,
  FileText,
  Users,
  BookOpen,
  Folder,
  Navigation,
  UserCircle,
  ListOrdered,
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
  Database,
  HelpCircle,
  CalendarDays
} from 'lucide-react';
import { AnnouncementHelp } from '../schemaTypes/components/AnnouncementHelp';
import { SignUpHelp } from '../schemaTypes/components/SignUpHelp';

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
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
              S.divider(),
              S.listItem()
                .title('Other Pages')
                .icon(FileText)
                .child(S.documentTypeList('page')),
            ])
        ),

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
                .title('📖 About Sign-Ups')
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
              S.divider(),
              S.listItem()
                .title('By Category')
                .icon(Folder)
                .child(
                  S.list()
                    .title('Sign-Ups by Category')
                    .items([
                      S.listItem()
                        .title('📅 Events')
                        .icon(CalendarDays)
                        .child(
                          S.documentTypeList('customSignUp')
                            .title('Event Sign-Ups')
                            .filter('_type == "customSignUp" && category == "event"')
                            .defaultOrdering([{ field: 'date', direction: 'asc' }])
                        ),
                      S.listItem()
                        .title('⛪ Ministries')
                        .icon(Church)
                        .child(
                          S.documentTypeList('customSignUp')
                            .title('Ministry Sign-Ups')
                            .filter('_type == "customSignUp" && category == "ministry"')
                            .defaultOrdering([{ field: 'active', direction: 'desc' }, { field: 'title', direction: 'asc' }])
                        ),
                      S.listItem()
                        .title('🤝 Volunteer Opportunities')
                        .icon(UserPlus)
                        .child(
                          S.documentTypeList('customSignUp')
                            .title('Volunteer Sign-Ups')
                            .filter('_type == "customSignUp" && category == "volunteer"')
                            .defaultOrdering([{ field: 'active', direction: 'desc' }, { field: 'title', direction: 'asc' }])
                        ),
                    ])
                ),
              S.divider(),
              S.listItem()
                .title('⭐ Featured Sign-Ups')
                .icon(CalendarDays)
                .child(
                  S.documentTypeList('customSignUp')
                    .title('Featured Sign-Ups')
                    .filter('_type == "customSignUp" && featured == true && active == true')
                    .defaultOrdering([{ field: 'date', direction: 'asc' }])
                ),
              S.listItem()
                .title('✅ Active Sign-Ups')
                .icon(UserPlus)
                .child(
                  S.documentTypeList('customSignUp')
                    .title('Active Sign-Ups')
                    .filter('_type == "customSignUp" && active == true')
                    .defaultOrdering([{ field: 'date', direction: 'asc' }])
                ),
              S.listItem()
                .title('💤 Inactive Sign-Ups')
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

      // Site Settings Section
      S.listItem()
        .title('Site Settings')
        .icon(Settings)
        .child(
          S.list()
            .title('Site Settings')
            .items([
              S.listItem()
                .title('Church Settings')
                .id('settings')
                .icon(Settings)
                .child(S.document().schemaType('settings').documentId('settings')),
              S.listItem()
                .title('Design Tokens')
                .id('designTokens')
                .icon(Palette)
                .child(S.document().schemaType('designTokens').documentId('designTokens')),
              S.listItem()
                .title('Planning Center Settings')
                .id('pcoSettings')
                .icon(Database)
                .child(S.document().schemaType('pcoSettings').documentId('pcoSettings')),
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
              S.listItem()
                .title('Staff Members')
                .icon(UserCircle)
                .child(S.documentTypeList('staff')),
              S.listItem()
                .title('Staff Display Order')
                .icon(ListOrdered)
                .child(S.documentTypeList('staffOrder')),
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
                .title('📖 Quick Guide')
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
              S.divider(),
              S.listItem()
                .title('Active Announcements')
                .icon(Church)
                .child(
                  S.documentTypeList('announcement')
                    .title('Active Announcements')
                    .filter('_type == "announcement" && active == true && startDate <= now() && (endDate > now() || !defined(endDate))')
                    .defaultOrdering([{ field: 'priority', direction: 'desc' }])
                ),
              S.listItem()
                .title('Scheduled Announcements')
                .icon(Church)
                .child(
                  S.documentTypeList('announcement')
                    .title('Scheduled Announcements')
                    .filter('_type == "announcement" && active == true && startDate > now()')
                    .defaultOrdering([{ field: 'startDate', direction: 'asc' }])
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
              S.listItem()
                .title('Inactive Announcements')
                .icon(Church)
                .child(
                  S.documentTypeList('announcement')
                    .title('Inactive Announcements')
                    .filter('_type == "announcement" && active == false')
                    .defaultOrdering([{ field: '_updatedAt', direction: 'desc' }])
                ),
              S.divider(),
              S.listItem()
                .title('Site Alerts')
                .icon(AlertCircle)
                .child(S.documentTypeList('siteAlert')),
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
    ]);