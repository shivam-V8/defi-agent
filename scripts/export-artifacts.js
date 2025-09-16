#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');
const TYPES_DIR = path.join(__dirname, '..', 'packages', 'types', 'src');
const OUT_DIR = path.join(CONTRACTS_DIR, 'out');

function exportArtifacts() {
  console.log('Exporting contract artifacts...');
  
  // Check if contracts are built
  if (!fs.existsSync(OUT_DIR)) {
    console.log('Contracts not built yet. Run "forge build" first.');
    return;
  }

  const artifacts = [];
  
  // Find all contract artifacts
  const findArtifacts = (dir) => {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findArtifacts(fullPath);
      } else if (item.endsWith('.json') && !item.includes('.dbg.')) {
        try {
          const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (artifact.abi && artifact.bytecode) {
            artifacts.push({
              name: artifact.contractName,
              abi: artifact.abi,
              bytecode: artifact.bytecode,
              deployedBytecode: artifact.deployedBytecode,
            });
          }
        } catch (error) {
          console.warn(`Failed to parse artifact ${fullPath}:`, error.message);
        }
      }
    }
  };

  findArtifacts(OUT_DIR);
  
  if (artifacts.length === 0) {
    console.log('No contract artifacts found.');
    return;
  }

  // Generate TypeScript file with artifacts
  const tsContent = `// Auto-generated contract artifacts
// Generated on: ${new Date().toISOString()}

export interface ContractArtifact {
  name: string;
  abi: any[];
  bytecode: string;
  deployedBytecode: string;
}

export const CONTRACT_ARTIFACTS: Record<string, ContractArtifact> = {
${artifacts.map(artifact => 
  `  ${artifact.name}: {
    name: "${artifact.name}",
    abi: ${JSON.stringify(artifact.abi, null, 4)},
    bytecode: "${artifact.bytecode}",
    deployedBytecode: "${artifact.deployedBytecode}",
  }`
).join(',\n')}
};

// Export individual artifacts for convenience
${artifacts.map(artifact => 
  `export const ${artifact.name}Artifact = CONTRACT_ARTIFACTS.${artifact.name};`
).join('\n')}
`;

  // Write to types package
  const outputPath = path.join(TYPES_DIR, 'contracts.ts');
  fs.writeFileSync(outputPath, tsContent);
  
  console.log(`Exported ${artifacts.length} contract artifacts to ${outputPath}`);
  console.log('Artifacts:', artifacts.map(a => a.name).join(', '));
}

exportArtifacts();
