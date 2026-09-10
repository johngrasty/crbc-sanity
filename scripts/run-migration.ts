/** Sanity request errors can contain authorization headers and must not be logged. */
export async function runMigration(migrate: () => Promise<void>) {
  try {
    await migrate()
  } catch {
    console.error(
      'Migration failed. Verify the document state before retrying; the request may have applied. ' +
        'Error details were suppressed because they may contain credentials.',
    )
    process.exitCode = 1
  }
}
