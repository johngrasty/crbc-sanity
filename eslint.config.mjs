import studio from '@sanity/eslint-config-studio'

export default [...studio, {ignores: ['dist/**', '.sanity/**', 'sanity.types.ts']}]
