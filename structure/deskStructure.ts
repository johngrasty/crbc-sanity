import { StructureBuilder } from 'sanity/structure';

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

      // Other document types
      S.listItem()
        .title('Announcements')
        .child(S.documentTypeList('announcement')),

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