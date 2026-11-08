export type PineInputType = 'bool' | 'int' | 'float' | 'string' | 'source';

export interface PineInputDef {
  id: string; // variable name e.g. "maType"
  name: string; // variable name
  title: string; // display title e.g. "Orta Bant (MA) Türü"
  type: PineInputType;
  defval: any;
  options?: string[]; // for input.string options
  min?: number;
  max?: number;
  step?: number;
  group?: string; // group title
  tooltip?: string;
}

/**
 * Extracts all input.* and legacy input() declarations from Pine Script v5/v4
 */
export function extractPineInputs(code: string): PineInputDef[] {
  if (!code || typeof code !== 'string') return [];

  const inputs: PineInputDef[] = [];
  const lines = code.split('\n');

  // Track group variable mappings e.g. grp_bb = "Bollinger Bantları Ayarları"
  const groupVars = new Map<string, string>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('//')) continue;

    // Detect group variable definitions: grp_bb = "Bollinger Bantları Ayarları"
    const grpMatch = rawLine.match(/^([a-zA-Z0-9_]+)\s*=\s*["']([^"']+)["']/);
    if (grpMatch && grpMatch[1].startsWith('grp')) {
      groupVars.set(grpMatch[1], grpMatch[2]);
      continue;
    }

    // Match input declarations:
    // varName = input.type(defval, title=..., ...) or varName = input(defval, ...)
    const inputMatch = rawLine.match(/^([a-zA-Z0-9_]+)\s*=\s*input(?:\.([a-zA-Z]+))?\s*\((.*)\)/);
    if (!inputMatch) continue;

    const varName = inputMatch[1];
    const subType = inputMatch[2]?.toLowerCase(); // bool, int, float, string, source, or undefined
    const insideArgs = inputMatch[3];

    // Parse parameters inside input(...)
    const parsed = parseInputArguments(insideArgs);

    let type: PineInputType = 'float';
    let defval = parsed.defval;

    if (subType === 'bool') {
      type = 'bool';
      defval = defval === 'true' || defval === true;
    } else if (subType === 'int') {
      type = 'int';
      defval = parseInt(defval, 10);
      if (isNaN(defval)) defval = 0;
    } else if (subType === 'float') {
      type = 'float';
      defval = parseFloat(defval);
      if (isNaN(defval)) defval = 0;
    } else if (subType === 'string') {
      type = 'string';
      if (typeof defval === 'string') {
        defval = defval.replace(/^["']|["']$/g, '');
      }
    } else if (subType === 'source') {
      type = 'source';
      if (typeof defval === 'string') {
        defval = defval.replace(/^["']|["']$/g, '');
      }
    } else {
      // Legacy input(...) inference
      if (defval === 'true' || defval === 'false') {
        type = 'bool';
        defval = defval === 'true';
      } else if (!isNaN(parseFloat(defval))) {
        type = defval.includes('.') ? 'float' : 'int';
        defval = parseFloat(defval);
      } else if (['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4', 'volume'].includes(defval)) {
        type = 'source';
      } else {
        type = 'string';
        defval = defval.replace(/^["']|["']$/g, '');
      }
    }

    // Resolve group name if referenced via variable (e.g. group=grp_bb)
    let group = parsed.group;
    if (group && groupVars.has(group)) {
      group = groupVars.get(group);
    } else if (group) {
      group = group.replace(/^["']|["']$/g, '');
    }

    inputs.push({
      id: varName,
      name: varName,
      title: parsed.title ? parsed.title.replace(/^["']|["']$/g, '') : varName,
      type,
      defval,
      options: parsed.options,
      min: parsed.minval,
      max: parsed.maxval,
      step: parsed.step,
      group: group || 'Genel Ayarlar',
      tooltip: parsed.tooltip ? parsed.tooltip.replace(/^["']|["']$/g, '') : undefined,
    });
  }

  return inputs;
}

/**
 * Splits and extracts named arguments inside input(...)
 */
function parseInputArguments(inside: string): {
  defval: any;
  title?: string;
  options?: string[];
  minval?: number;
  maxval?: number;
  step?: number;
  group?: string;
  tooltip?: string;
} {
  const parts: string[] = [];
  let depth = 0;
  let inQuotes = false;
  let quoteChar = '';
  let curr = '';

  for (let i = 0; i < inside.length; i++) {
    const ch = inside[i];

    if ((ch === '"' || ch === "'") && (i === 0 || inside[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = ch;
      } else if (ch === quoteChar) {
        inQuotes = false;
      }
    }

    if (!inQuotes) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;

      if (ch === ',' && depth === 0) {
        parts.push(curr.trim());
        curr = '';
        continue;
      }
    }

    curr += ch;
  }
  if (curr.trim()) parts.push(curr.trim());

  let defval: any = '';
  let title: string | undefined;
  let options: string[] | undefined;
  let minval: number | undefined;
  let maxval: number | undefined;
  let step: number | undefined;
  let group: string | undefined;
  let tooltip: string | undefined;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    const defvalMatch = part.match(/^defval\s*=\s*(.+)$/i);
    const titleMatch = part.match(/^title\s*=\s*(.+)$/i);
    const optionsMatch = part.match(/^options\s*=\s*\[(.*)\]$/i);
    const minMatch = part.match(/^minval\s*=\s*([0-9.-]+)$/i);
    const maxMatch = part.match(/^maxval\s*=\s*([0-9.-]+)$/i);
    const stepMatch = part.match(/^step\s*=\s*([0-9.-]+)$/i);
    const groupMatch = part.match(/^group\s*=\s*(.+)$/i);
    const tooltipMatch = part.match(/^tooltip\s*=\s*(.+)$/i);

    if (defvalMatch) {
      defval = defvalMatch[1].trim();
    } else if (titleMatch) {
      title = titleMatch[1].trim();
    } else if (optionsMatch) {
      options = optionsMatch[1]
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (minMatch) {
      minval = parseFloat(minMatch[1]);
    } else if (maxMatch) {
      maxval = parseFloat(maxMatch[1]);
    } else if (stepMatch) {
      step = parseFloat(stepMatch[1]);
    } else if (groupMatch) {
      group = groupMatch[1].trim();
    } else if (tooltipMatch) {
      tooltip = tooltipMatch[1].trim();
    } else if (i === 0 && !defval) {
      // Positional first arg is defval
      defval = part;
    } else if (i === 1 && !title && (part.startsWith('"') || part.startsWith("'"))) {
      // Positional second arg is title
      title = part;
    }
  }

  return { defval, title, options, minval, maxval, step, group, tooltip };
}

