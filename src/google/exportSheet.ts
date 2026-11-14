import { layoutSheet } from '../sheet/layout';
import type { SheetDef } from '../sheet/types';
import type { Palette } from '../ui/theme/themes';
import { createSpreadsheetFrom, setSpreadsheetLocale, updateDriveItem, type SheetRef } from './api';
import { buildSpreadsheet } from './sheetsOutput';

type Fetch = typeof fetch;

/**
 * Crea en el Drive del usuario la hoja de una herramienta y la deja en su
 * región; con `folder`, la mueve a esa carpeta (Gemba Kit / Sueltas).
 */
export async function exportToGoogleSheet(token: string, def: SheetDef, palette: Palette, locale: string, f: Fetch = fetch, folder?: string): Promise<SheetRef> {
  const ref = await createSpreadsheetFrom(token, buildSpreadsheet(def, layoutSheet(def), palette), f);
  if (locale !== 'en_US') await setSpreadsheetLocale(token, ref.id, locale, f);
  if (folder) await updateDriveItem(token, ref.id, {}, { to: folder }, f);
  return ref;
}
