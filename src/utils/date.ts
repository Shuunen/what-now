/**
 * Return a relative Date
 * @param nbDays the number of days to subtract from today
 */
export const daysAgo = (nbDays = 0): Date => (d => new Date(d.setDate(d.getDate() - nbDays)))(new Date())

/**
 * Format a date to ISO without time, ex: 2019-12-31
 * @param date
 */
export const dateIso10 = (date = new Date()): string => date.toISOString().split('T')[0]

/**
 * Return a relative date formatted to ISO 10
 * @param nbDays the number of days to subtract from today
 */
export const daysAgoIso10 = (nbDays = 0): string => dateIso10(daysAgo(nbDays))
