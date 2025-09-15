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
  Phone
} from 'lucide-react';

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
              S.divider(),
              S.listItem()
                .title('Other Pages')
                .icon(FileText)
                .child(S.documentTypeList('page')),
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
              S.listItem()
                .title('Church Announcements')
                .icon(Church)
                .child(S.documentTypeList('announcement')),
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