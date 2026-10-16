import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';

const TOOLS_DIR = join(process.cwd(), 'src/data/tools');

// OSI-approved open source licenses
const OSS_LICENSES = [
  'MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'GPL-3.0', 'AGPL-3.0',
  'LGPL-3.0', 'MPL-2.0', 'ISC', 'EPL-2.0', 'AFL-3.0'
];

function isOpenSourceLicense(license: string | undefined): boolean {
  if (!license) return false;
  // Check if license starts with any OSS license name (handles "MIT (core) + proprietary ee/" cases)
  return OSS_LICENSES.some(oss => license.startsWith(oss));
}

interface ToolData {
  name: string;
  license?: string;
  languages: string[];
  runtimes?: string[];
  platforms?: string[];
  [key: string]: any;
}

// Platform mappings based on common runtimes (we'll verify these manually)
const PLATFORM_HINTS: Record<string, string[]> = {
  // Language-agnostic tools with CLI/Desktop/Hosted
  'postman': [], // Desktop/Web/CLI - language agnostic
  'bruno': [], // Desktop - language agnostic
  'insomnia': [], // Desktop - language agnostic
  'hoppscotch': ['Web'], // Web app
  'httpie': [], // CLI - language agnostic
  'yaak': [], // Desktop - language agnostic
  'thunder-client': [], // VS Code extension - language agnostic
  'apidog': [], // Desktop - language agnostic
  
  // Mock servers (often language-agnostic)
  'mockoon': [], // Desktop/CLI - language agnostic
  'prism': [], // CLI/Docker - language agnostic
  'wiremock': [], // JVM but language-agnostic server
  'mountebank': [], // Node but language-agnostic server
  'hoverfly': [], // Go but language-agnostic proxy
  'microcks': [], // Kubernetes - language agnostic
  'beeceptor': ['Web'], // Hosted web service
  'mockaroo': ['Web'], // Web service
  'postman-mock-servers': ['Web'], // Hosted
  
  // Browser/Web tools
  'msw': ['Web'],
  'miragejs': ['Web'],
  'pollyjs': ['Web'],
  'cypress': ['Web'],
  'playwright': ['Web'],
  
  // React Native
  'mockifyer': ['React Native', 'Web'],
  'detox': ['React Native', 'iOS', 'Android'],
  'reactotron': ['React Native', 'iOS', 'Android'],
  'flipper': ['React Native', 'iOS', 'Android'],
  
  // Mobile
  'maestro': ['iOS', 'Android', 'React Native', 'Flutter', 'Web'],
  'appium': ['iOS', 'Android', 'React Native'],
  'proxyman': ['iOS', 'Android'],
  'charles': ['iOS', 'Android', 'Web'],
  
  // Observability (typically language-agnostic)
  'sentry': [], // Multi-platform - language agnostic
  'datadog': [], // Multi-platform - language agnostic  
  'newrelic': [], // Multi-platform - language agnostic
  'betterstack': [], // Hosted - language agnostic
  'openobserve': [], // Self-hosted - language agnostic
  'signoz': [], // Self-hosted - language agnostic
  'grafana-loki': [], // Self-hosted - language agnostic
  'prometheus': [], // Self-hosted - language agnostic
  'opentelemetry': [], // Libraries for many platforms - language agnostic
};

const files = readdirSync(TOOLS_DIR).filter(f => f.endsWith('.yaml'));

console.log(`Updating ${files.length} tool files...\n`);

let updated = 0;

for (const file of files) {
  const path = join(TOOLS_DIR, file);
  const content = readFileSync(path, 'utf-8');
  const data = parse(content) as ToolData;
  
  let changed = false;
  
  // Add isOpenSource
  if (data.isOpenSource === undefined) {
    data.isOpenSource = isOpenSourceLicense(data.license);
    changed = true;
  }
  
  // Add languageAgnostic for N/A language tools
  if (data.languageAgnostic === undefined && 
      data.languages?.length === 1 && 
      data.languages[0] === 'N/A') {
    data.languageAgnostic = true;
    changed = true;
  }
  
  // Add platforms hint (to be verified manually)
  const slug = file.replace('.yaml', '');
  if (!data.platforms && PLATFORM_HINTS[slug]) {
    if (PLATFORM_HINTS[slug].length > 0) {
      data.platforms = PLATFORM_HINTS[slug];
      changed = true;
    }
  }
  
  if (changed) {
    // Preserve YAML formatting as much as possible
    const newContent = stringify(data, {
      lineWidth: 0,
      defaultStringType: 'PLAIN'
    });
    writeFileSync(path, newContent);
    updated++;
    console.log(`✓ ${data.name}`);
  }
}

console.log(`\n✅ Updated ${updated} tools`);
