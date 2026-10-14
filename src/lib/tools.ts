import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { ToolSchema, type Tool } from './schema';

const TOOLS_DIR = join(process.cwd(), 'src/data/tools');

export function getAllTools(): Tool[] {
  const files = readdirSync(TOOLS_DIR).filter(f => f.endsWith('.yaml'));
  
  const tools = files.map(file => {
    const content = readFileSync(join(TOOLS_DIR, file), 'utf-8');
    const data = parse(content);
    return ToolSchema.parse(data);
  });

  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

export function getToolBySlug(slug: string): Tool | undefined {
  try {
    const content = readFileSync(join(TOOLS_DIR, `${slug}.yaml`), 'utf-8');
    const data = parse(content);
    return ToolSchema.parse(data);
  } catch {
    return undefined;
  }
}

export function getToolsByCategory(category: string): Tool[] {
  const tools = getAllTools();
  return tools.filter(tool => tool.categories.includes(category as any));
}

export function getToolsBySection(section: string): Tool[] {
  const tools = getAllTools();
  return tools.filter(tool => tool.section === section);
}

export function getUniqueLanguages(): string[] {
  const tools = getAllTools();
  const languages = new Set<string>();
  tools.forEach(tool => {
    tool.languages.forEach(lang => languages.add(lang));
  });
  return Array.from(languages).sort();
}

export function getUniqueCategories(): string[] {
  const tools = getAllTools();
  const categories = new Set<string>();
  tools.forEach(tool => {
    tool.categories.forEach(cat => categories.add(cat));
  });
  return Array.from(categories).sort();
}

export function getUniqueSections(): string[] {
  const tools = getAllTools();
  const sections = new Set<string>();
  tools.forEach(tool => {
    sections.add(tool.section);
  });
  return Array.from(sections).sort();
}
