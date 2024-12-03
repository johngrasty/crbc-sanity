import { StructureBuilder } from 'sanity/structure';
import { BellRing } from 'lucide-react';

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // Singleton for church settings
      S.listItem()
        .title('Church Settings')
        .id('settings')
        .child(S.document().schemaType('settings').documentId('settings')),

      // Regular document types
      S.listItem()
        .title('Pages')
        .child(S.documentTypeList('page')),

      // Staff & Leadership folder
      S.listItem()
        .title('Staff & Leadership')
        .child(
          S.list()
            .title('Staff & Leadership')
            .items([
              S.listItem()
                .title('Staff Members')
                .child(S.documentTypeList('staff')),
              S.listItem()
                .title('Staff Display Order')
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
              S.documentTypeListItem('announcement')
                .title('Church Announcements'),
              S.documentTypeListItem('siteAlert')
                .title('Site Alerts')
            ])
        ),

      S.listItem()
        .title('Articles')
        .child(S.documentTypeList('article')),

      S.listItem()
        .title('Resources')
        .child(S.documentTypeList('resource')),

      // Group navigation items
      S.listItem()
        .title('Navigation')
        .child(
          S.list()
            .title('Navigation')
            .items([
              S.listItem()
                .title('Main Menu')
                .child(
                  S.document()
                    .schemaType('mainMenu')
                    .documentId('mainMenu')
                ),
              S.listItem()
                .title('Footer Menu')
                .child(
                  S.document()
                    .schemaType('footerMenu')
                    .documentId('footerMenu')
                ),
            ])
        ),
    ]);