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
  AlertCircle
} from 'lucide-react';

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // Singleton for church settings
      S.listItem()
        .title('Church Settings')
        .id('settings')
        .icon(Settings)
        .child(S.document().schemaType('settings').documentId('settings')),

      // Regular document types
      S.listItem()
        .title('Pages')
        .icon(FileText)
        .child(S.documentTypeList('page')),

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

      // Announcements group
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

      S.listItem()
        .title('Articles')
        .icon(BookOpen)
        .child(S.documentTypeList('article')),

      S.listItem()
        .title('Resources')
        .icon(Folder)
        .child(S.documentTypeList('resource')),

      // Group navigation items
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
            ])
        ),
    ]);