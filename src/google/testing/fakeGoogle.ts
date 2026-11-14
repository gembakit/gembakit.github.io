// Google de mentira para las pruebas: Drive (archivos y carpetas) y Sheets
// (pestañas, valores, avisos) en memoria, con las mismas peticiones que la
// API de verdad. Solo lo que usa la app. Comprueba además que las fórmulas
// se escriben con la hoja en región en_US.

export interface FakeSheet {
  sheetId: number;
  title: string;
  values: unknown[][];
  protectedRanges: { protectedRangeId: number }[];
  conditional: number;
}

export interface FakeFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  trashed: boolean;
  appProperties: Record<string, string>;
  sheets?: FakeSheet[];
  locale?: string;
  modifiedBy?: string;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const notFound = () => json({ error: { message: 'File not found' } }, 404);

export class FakeGoogle {
  files = new Map<string, FakeFile>();
  /** Lotes de cambios recibidos (para comprobar cuántas veces se escribió). */
  batches: unknown[][] = [];
  private next = 1;

  private id(prefix: string) {
    return `${prefix}${this.next++}`;
  }

  /** Archivos vivos con ese nombre. */
  find(name: string): FakeFile[] {
    return [...this.files.values()].filter((f) => f.name === name && !f.trashed);
  }

  sheetsOf(fileId: string): FakeSheet[] {
    return this.files.get(fileId)!.sheets!;
  }

  /** Cambia una celda como lo haría alguien en Sheets. */
  edit(fileId: string, title: string, row: number, col: number, value: unknown, by = 'Ana Pérez') {
    const file = this.files.get(fileId)!;
    const sh = file.sheets!.find((s) => s.title === title)!;
    while (sh.values.length <= row) sh.values.push([]);
    sh.values[row]![col] = value;
    file.modifiedBy = by;
  }

  /** Añade una pestaña propia del usuario. */
  addUserTab(fileId: string, title: string, values: unknown[][]) {
    this.sheetsOf(fileId).push({ sheetId: 900 + this.next++, title, values, protectedRanges: [], conditional: 0 });
  }

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = init?.body && typeof init.body === 'string' && init.body.startsWith('{') ? (JSON.parse(init.body) as Record<string, unknown>) : {};

    // ── Sheets ──
    if (url.host === 'sheets.googleapis.com') {
      const m = /^\/v4\/spreadsheets(?:\/([^/:]+))?(?::(batchUpdate))?(?:\/values:(batchGet))?$/.exec(url.pathname)!;
      const [, id, batch, read] = m;
      if (!id && method === 'POST') {
        const fileId = this.id('sheet');
        const props = body.properties as { title: string; locale: string };
        const sheets = ((body.sheets as { properties: { sheetId: number; title: string } }[]) ?? [{ properties: { sheetId: 0, title: 'Sheet1' } }]).map((s) => ({
          sheetId: s.properties.sheetId,
          title: s.properties.title,
          values: [],
          protectedRanges: [],
          conditional: 0,
        }));
        this.files.set(fileId, {
          id: fileId,
          name: props.title,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: ['root'],
          trashed: false,
          appProperties: {},
          sheets,
          locale: props.locale,
        });
        return json({ spreadsheetId: fileId, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${fileId}` });
      }
      const file = this.files.get(id!);
      if (!file) return notFound();
      if (batch) {
        const requests = body.requests as Record<string, Record<string, unknown>>[];
        this.batches.push(requests);
        return json({ replies: requests.map((r) => this.apply(file, r)) });
      }
      if (read) {
        const values = url.searchParams.getAll('ranges').map((r) => {
          const title = r.replace(/^'|'$/g, '').replace(/''/g, "'");
          const sh = file.sheets!.find((s) => s.title === title);
          if (!sh) throw new Error(`Pestaña desconocida: ${title}`);
          return { values: sh.values.map((row) => [...row]) };
        });
        return json({ valueRanges: values });
      }
      return json({
        sheets: file.sheets!.map((s, index) => ({
          properties: { sheetId: s.sheetId, title: s.title, index },
          protectedRanges: s.protectedRanges,
          conditionalFormats: Array.from({ length: s.conditional }, () => ({})),
        })),
      });
    }

    // ── Drive ──
    const m = /^\/drive\/v3\/files(?:\/([^/]+))?$/.exec(url.pathname);
    if (!m) throw new Error(`Llamada no prevista: ${method} ${url}`);
    const id = m[1] ? decodeURIComponent(m[1]) : undefined;
    if (!id && method === 'POST') {
      const fileId = this.id('folder');
      const b = body as { name: string; mimeType: string; parents?: string[] };
      this.files.set(fileId, { id: fileId, name: b.name, mimeType: b.mimeType, parents: b.parents ?? ['root'], trashed: false, appProperties: {} });
      return json({ id: fileId, webViewLink: `https://drive.google.com/${fileId}` });
    }
    if (!id) {
      // Búsqueda: «name = 'x' and mimeType = '…' and 'padre' in parents and trashed = false».
      const q = url.searchParams.get('q') ?? '';
      const name = /name = '((?:[^'\\]|\\.)*)'/.exec(q)?.[1]?.replace(/\\(.)/g, '$1');
      const parent = /'([^']*)' in parents/.exec(q)?.[1];
      const files = [...this.files.values()].filter((f) => !f.trashed && (!name || f.name === name) && (!parent || f.parents.includes(parent)));
      return json({ files: files.map((f) => ({ id: f.id, name: f.name })) });
    }
    const file = this.files.get(id);
    if (!file) return notFound();
    if (method === 'PATCH') {
      const add = url.searchParams.get('addParents');
      const remove = url.searchParams.get('removeParents')?.split(',') ?? [];
      if (add) file.parents = [...file.parents.filter((p) => !remove.includes(p)), add];
      if (typeof body.name === 'string') file.name = body.name;
      if (body.appProperties) Object.assign(file.appProperties, body.appProperties);
      if (body.trashed === true) file.trashed = true;
      return json({ id });
    }
    return json({
      id: file.id,
      name: file.name,
      trashed: file.trashed,
      parents: file.parents,
      webViewLink: `https://drive.google.com/${file.id}`,
      modifiedTime: '2026-11-14T10:32:00Z',
      lastModifyingUser: { displayName: file.modifiedBy ?? 'Yo', me: !file.modifiedBy },
    });
  };

  private apply(file: FakeFile, r: Record<string, Record<string, unknown>>): unknown {
    const sheets = file.sheets!;
    const byId = (id: unknown) => {
      const sh = sheets.find((s) => s.sheetId === id);
      if (!sh) throw new Error(`Pestaña ${String(id)} no existe`);
      return sh;
    };
    const [kind, req] = Object.entries(r)[0]!;
    switch (kind) {
      case 'updateSpreadsheetProperties':
        file.locale = (req.properties as { locale: string }).locale;
        return {};
      case 'addSheet': {
        const p = req.properties as { sheetId: number; title: string; index: number };
        if (sheets.some((s) => s.sheetId === p.sheetId || s.title.toLowerCase() === p.title.toLowerCase())) throw new Error(`Pestaña repetida: ${p.title}`);
        sheets.splice(Math.min(p.index, sheets.length), 0, { sheetId: p.sheetId, title: p.title, values: [], protectedRanges: [], conditional: 0 });
        return { addSheet: { properties: p } };
      }
      case 'deleteSheet': {
        if (sheets.length === 1) throw new Error('No se puede borrar la última pestaña');
        sheets.splice(sheets.indexOf(byId(req.sheetId)), 1);
        return {};
      }
      case 'updateSheetProperties': {
        const p = req.properties as { sheetId: number; title?: string };
        if (p.title && String(req.fields).includes('title')) byId(p.sheetId).title = p.title;
        return {};
      }
      case 'updateCells': {
        if (req.rows) {
          const start = req.start as { sheetId: number; rowIndex: number; columnIndex: number };
          const sh = byId(start.sheetId);
          (req.rows as { values: { userEnteredValue?: Record<string, unknown> }[] }[]).forEach((row, i) => {
            sh.values[start.rowIndex + i] = row.values.map((c) => {
              const v = c.userEnteredValue;
              if (v?.formulaValue !== undefined && file.locale !== 'en_US') throw new Error('Fórmula escrita fuera de en_US');
              return v ? (v.formulaValue ?? v.stringValue ?? v.numberValue ?? '') : '';
            });
          });
        } else byId((req.range as { sheetId: number }).sheetId).values = [];
        return {};
      }
      case 'duplicateSheet': {
        const src = byId(req.sourceSheetId);
        const sheetId = 500 + this.next++;
        const copy: FakeSheet = {
          sheetId,
          title: String(req.newSheetName),
          values: src.values.map((row) => [...row]),
          protectedRanges: src.protectedRanges.map(() => ({ protectedRangeId: this.next++ })),
          conditional: src.conditional,
        };
        sheets.splice(Number(req.insertSheetIndex), 0, copy);
        return { duplicateSheet: { properties: { sheetId, title: copy.title } } };
      }
      case 'addProtectedRange': {
        const pr = req.protectedRange as { range: { sheetId: number }; warningOnly: boolean };
        if (!pr.warningOnly) throw new Error('Se esperaba aviso para todos');
        byId(pr.range.sheetId).protectedRanges.push({ protectedRangeId: this.next++ });
        return {};
      }
      case 'deleteProtectedRange':
        for (const s of sheets) s.protectedRanges = s.protectedRanges.filter((p) => p.protectedRangeId !== req.protectedRangeId);
        return {};
      case 'addConditionalFormatRule':
        byId((req.rule as { ranges: { sheetId: number }[] }).ranges[0]!.sheetId).conditional++;
        return {};
      case 'deleteConditionalFormatRule':
        byId(req.sheetId).conditional--;
        return {};
      default:
        return {};
    }
  }
}
