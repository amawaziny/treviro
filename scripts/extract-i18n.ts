#!/usr/bin/env tsx
/**
 * i18n extractor for Treviro app
 * Scans all TypeScript and TypeScript React files in the project
 * Extracts hardcoded strings and replaces them with translation function calls
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname, extname } from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { fileURLToPath } from "url";

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROJECT_ROOT = process.cwd();
const TARGET_SRC_DIR = join(PROJECT_ROOT, "src", "app", "(app)", "expenses"); // Targeting specific directory
const LOCALES_DIR = join(PROJECT_ROOT, "public", "locales"); // Locales are in public
const IGNORE_DIRS = [
  "node_modules",
  ".next",
  ".vercel",
  ".git",
  "dist",
  "build",
  "scripts", // Ignore the scripts directory itself
  "api" // Ignore API routes as they often contain non-translatable strings
];
const FILE_EXTENSIONS = [".ts", ".tsx"];

// Ensure locales directory exists
if (!existsSync(LOCALES_DIR)) {
  mkdirSync(LOCALES_DIR, { recursive: true });
}

// Initialize locale files if they don't exist
const localeFiles = {
  en: join(LOCALES_DIR, "en.json"),
  ar: join(LOCALES_DIR, "ar.json"),
};

Object.values(localeFiles).forEach((file) => {
  if (!existsSync(file)) {
    writeFileSync(file, JSON.stringify({}, null, 2));
  }
});

// Load existing translations
const translations = {
  en: JSON.parse(readFileSync(localeFiles.en, "utf-8")),
  ar: JSON.parse(readFileSync(localeFiles.ar, "utf-8")),
};

// Track new strings
const newStrings = new Map<string, string>();

// Function to find all TypeScript/TSX files recursively
function findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory() && !IGNORE_DIRS.includes(file)) {
      findTypeScriptFiles(filePath, fileList);
    } else if (FILE_EXTENSIONS.includes(extname(file).toLowerCase())) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Function to generate a key from text
function generateKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, "") // Keep only alphanumeric and spaces
    .trim()
    .replace(/\s+/g, "_"); // Replace spaces with underscores
}

// Function to check if a string should be skipped (simplified)
function shouldSkipText(text: string): boolean {
  if (!text || text.trim().length === 0) return true;

  const trimmed = text.trim();

  // Skip patterns that should never be translated
  const skipPatterns = [
    /^\s*$/, // Skip empty or whitespace-only strings
    /^[^a-zA-Z0-9]?$/, // Skip single characters
    /^[^a-zA-Z]+$/, // Skip numbers and special characters only (e.g., "123", "!@#")
    /^<[a-z][\s\S]*>$/i, // Skip common HTML tags (e.g., "<div>")
    /^&[a-z]+;$/i, // Skip HTML entities (e.g., "&nbsp;")
    /^(https?:\/\/|www\.|\/|#|\.\.?\/|mailto:)/i, // Skip URLs and file paths
    /\$\{.*\}/, // Skip template literals with expressions (e.g., `Hello ${name}`)
    /^[a-z]+:[^\s]+/i, // Skip key:value patterns (e.g., "type: 'submit'")
    /^[a-z]+\s*=\s*["'][^"']*["']/i, // Skip key="value" patterns (e.g., "data-value='abc'")
    /^[0-9]+(px|rem|em|%|vh|vw|vmin|vmax|s|ms)?$/, // Skip CSS unit values (e.g., "10px")
    /^#[0-9a-f]{3,6}$/i, // Skip hex colors (e.g., "#FF00AA")
    /^rgba?\([^)]+\)$/, // Skip rgb/rgba colors (e.g., "rgba(0,0,0,0.5)")
    /^[0-9]+(\.[0-9]+)?$/, // Skip numbers (e.g., "123", "1.23")
    /^(true|false|null|undefined)$/i, // Skip common boolean/null values
    /^[a-z_$][a-z0-9_$]*(\.[a-z_$][a-z0-9_$]*)*$/i, // Skip common variable/function names
    /^\.[a-z0-9]+$/i, // Skip file extensions (e.g., ".js")
    /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/, // Skip dates and times
    /^v?\d+(\.\d+)+(-[a-z0-9.]+)?$/, // Skip version numbers
  ];

  // Skip if any pattern matches
  if (skipPatterns.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  return false;
}

// Helper to identify React components (simple heuristic: starts with uppercase)
function isReactComponent(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.charAt(0) === name.charAt(0).toUpperCase();
}


// Process a single file
async function processFile(filePath: string) {
  let code = readFileSync(filePath, "utf-8");
  let ast;

  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e);
    return;
  }

  let fileNeedsUseLanguageImport = false;
  const componentsNeedingTDeclaration = new Set<t.FunctionDeclaration | t.ArrowFunctionExpression>();

  traverse(ast, {
    StringLiteral(path) {
      const { node, parentPath } = path;
      const value = node.value.trim();

      // Check if the string literal is part of a TypeScript type annotation or declaration
      const isTypeContext = path.findParent(
        (p) =>
          t.isTSTypeAnnotation(p.node) ||
          t.isTSTypeAliasDeclaration(p.node) ||
          t.isTSPropertySignature(p.node) ||
          t.isTSMethodSignature(p.node) ||
          t.isTSLiteralType(p.node)
      );

      if (isTypeContext) {
        return;
      }

      // Skip if it's already a translation call (e.g., t("key"))
      if (parentPath.isCallExpression() && t.isIdentifier(parentPath.node.callee) && parentPath.node.callee.name === 't') {
        return;
      }

      // Skip if it's a value of a `className` attribute
      if (parentPath.isJSXAttribute() && t.isJSXIdentifier(parentPath.node.name) && parentPath.node.name.name === 'className') {
        return;
      }

      // Skip if it's an argument of a `cn()` call (common for Tailwind class merging)
      if (parentPath.isCallExpression() && t.isIdentifier(parentPath.node.callee) && parentPath.node.callee.name === 'cn') {
          return;
      }

      // Skip if it's an attribute name (e.g., <div type="text">, "text" is not a string literal to translate)
      if (parentPath.isJSXAttribute() && t.isJSXIdentifier(parentPath.node.name)) {
        return;
      }

      // Handle ObjectProperty keys that are string literals
      // If the current node (StringLiteral) is the key of an ObjectProperty
      // AND the ObjectProperty is not already computed
      if (parentPath.isObjectProperty() && path.node === parentPath.node.key && !parentPath.node.computed) {
          const key = generateKey(value);
          if (!translations.en[key]) {
              newStrings.set(key, value);
          }
          // Convert the ObjectProperty to a computed property with the t() call as its key
          parentPath.node.computed = true;
          parentPath.node.key = t.callExpression(t.identifier('t'), [t.stringLiteral(key)]);
          fileNeedsUseLanguageImport = true;
          path.skip(); // Skip further processing of this node
          return;
      }

      // Skip if it's a variable name or property key (e.g., const name = "John"; obj.prop = "value")
      if (t.isVariableDeclarator(parentPath.node)) {
        if (t.isIdentifier(parentPath.node.id) && parentPath.node.id.name === node.value) {
          return; // Don't translate variable names where value matches the identifier
        }
      } else if (t.isObjectProperty(parentPath.node) || t.isProperty(parentPath.node)) {
        if (t.isIdentifier(parentPath.node.key) && parentPath.node.key.name === node.value) {
          return; // Don't translate property keys where value matches the key
        }
      }
      
      // Skip imports/exports source
      if (parentPath.isImportDeclaration() || parentPath.isExportDeclaration()) {
          return;
      }
      
      // Skip if it's the argument of a TSImportType (e.g., import("module-name"))
      if (t.isTSImportType(parentPath.node) && path.node === parentPath.node.argument) {
          return;
      }
      
      // Skip if it's a literal in a TSLiteralType (e.g., type Foo = "bar")
      if (t.isTSLiteralType(parentPath.node) && path.node === parentPath.node.literal) {
          return;
      }
      
      if (shouldSkipText(value)) {
        return;
      }

      const key = generateKey(value);
      if (!translations.en[key]) {
        newStrings.set(key, value);
      }

      // Replace string literal with t("key") call
      path.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]));
      fileNeedsUseLanguageImport = true;

      // Mark the closest React component for 't' declaration
      const componentPath = path.findParent(
          (p) =>
              (p.isFunctionDeclaration() && isReactComponent(p.node.id?.name)) ||
              (p.isVariableDeclarator() && t.isIdentifier(p.node.id) && isReactComponent(p.node.id.name) && p.node.init?.type === 'ArrowFunctionExpression')
      );

      if (componentPath && (componentPath.node as any).body?.type === 'BlockStatement') {
        componentsNeedingTDeclaration.add(componentPath.node as t.FunctionDeclaration | t.ArrowFunctionExpression);
      }
      path.skip(); // Prevent re-processing of the newly inserted node
    },

    JSXText(path) {
      const { node } = path;
      const value = node.value.trim(); // Simplified from node.extra?.rawValue?.trim() || node.value.trim();

      // Check if the JSX text is part of a TypeScript type annotation or declaration
      const isTypeContext = path.findParent(
        (p) =>
          t.isTSTypeAnnotation(p.node) ||
          t.isTSTypeAliasDeclaration(p.node) ||
          t.isTSPropertySignature(p.node) ||
          t.isTSMethodSignature(p.node) ||
          t.isTSLiteralType(p.node)
      );

      if (isTypeContext) {
        return;
      }

      if (shouldSkipText(value)) {
        return;
      }

      const key = generateKey(value);
      if (!translations.en[key]) {
        newStrings.set(key, value);
      }

      // Replace JSXText with JSXExpressionContainer containing t("key")
      path.replaceWith(
          t.jsxExpressionContainer(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]))
      );
      fileNeedsUseLanguageImport = true;

      // Mark the closest React component for 't' declaration
      const componentPath = path.findParent(
          (p) =>
              (p.isFunctionDeclaration() && isReactComponent(p.node.id?.name)) ||
              (p.isVariableDeclarator() && t.isIdentifier(p.node.id) && isReactComponent(p.node.id.name) && p.node.init?.type === 'ArrowFunctionExpression')
      );

      if (componentPath && (componentPath.node as any).body?.type === 'BlockStatement') {
        componentsNeedingTDeclaration.add(componentPath.node as t.FunctionDeclaration | t.ArrowFunctionExpression);
      }
      path.skip();
    },

    Program: {
      exit(path) {
        // Add import for useLanguage if needed
        if (fileNeedsUseLanguageImport) {
          const existingImport = path.node.body.find(
              (node) =>
                  t.isImportDeclaration(node) &&
                  node.source.value === '@/contexts/language-context' &&
                  node.specifiers.some(
                      (specifier) =>
                          t.isImportSpecifier(specifier) && specifier.local.name === 'useLanguage'
                  )
          );
          if (!existingImport) {
            const importDeclaration = t.importDeclaration(
                [t.importSpecifier(t.identifier('useLanguage'), t.identifier('useLanguage'))],
                t.stringLiteral('@/contexts/language-context')
            );
            path.node.body.unshift(importDeclaration); // Add at the beginning of the file
          }
        }
      },
    },
  });

  // Add useLanguage hook declaration to components that need it
  traverse(ast, {
    FunctionDeclaration(path) {
      if (componentsNeedingTDeclaration.has(path.node)) {
        const body = path.node.body.body;
        const hasTDeclaration = body.some(
            (statement) =>
                t.isVariableDeclaration(statement) &&
                statement.declarations.some(
                    (decl) =>
                        t.isVariableDeclarator(decl) &&
                        t.isObjectPattern(decl.id) &&
                        decl.id.properties.some(
                            (prop) =>
                                t.isObjectProperty(prop) &&
                                t.isIdentifier(prop.key, { name: 't' })
                        ) &&
                        t.isCallExpression(decl.init) &&
                        t.isIdentifier(decl.init.callee, { name: 'useLanguage' })
                )
        );
        if (!hasTDeclaration) {
          body.unshift(
              t.variableDeclaration('const', [
                  t.variableDeclarator(
                      t.objectPattern([t.objectProperty(t.identifier('t'), t.identifier('t'))]),
                      t.callExpression(t.identifier('useLanguage'), [])
                  ),
              ])
          );
        }
      }
    },
    ArrowFunctionExpression(path) {
      if (componentsNeedingTDeclaration.has(path.node)) {
        // Ensure it's a block statement for the body
        if (t.isBlockStatement(path.node.body)) {
          const body = path.node.body.body;
          const hasTDeclaration = body.some(
              (statement) =>
                  t.isVariableDeclaration(statement) &&
                  statement.declarations.some(
                      (decl) =>
                          t.isVariableDeclarator(decl) &&
                          t.isObjectPattern(decl.id) &&
                          decl.id.properties.some(
                              (prop) =>
                                  t.isObjectProperty(prop) &&
                                  t.isIdentifier(prop.key, { name: 't' })
                          ) &&
                          t.isCallExpression(decl.init) &&
                          t.isIdentifier(decl.init.callee, { name: 'useLanguage' })
                  )
          );
          if (!hasTDeclaration) {
            body.unshift(
                t.variableDeclaration('const', [
                    t.variableDeclarator(
                        t.objectPattern([t.objectProperty(t.identifier('t'), t.identifier('t'))]),
                        t.callExpression(t.identifier('useLanguage'), [])
                    ),
                ])
            );
          }
        }
      }
    }
  });


  const output = generate(ast, { retainLines: true, compact: false }, code);
  writeFileSync(filePath, output.code);
}

async function main() {
  console.log("Starting i18n extraction...");
  const files = findTypeScriptFiles(TARGET_SRC_DIR);

  for (const file of files) {
    console.log(`Processing ${file}...`);
    await processFile(file);
  }

  // Update locale files with new strings
  if (newStrings.size > 0) {
    console.log(`Found ${newStrings.size} new strings.`);
    let updatedEn = { ...translations.en };
    let updatedAr = { ...translations.ar };

    newStrings.forEach((value, key) => {
      if (!(key in updatedEn)) {
        updatedEn[key] = value;
        updatedAr[key] = value; // For new keys, initialize Arabic with English value
      }
    });

    // Sort keys for consistent output
    updatedEn = Object.keys(updatedEn).sort().reduce((obj: { [key: string]: string }, key) => {
      obj[key] = updatedEn[key];
      return obj;
    }, {});
    updatedAr = Object.keys(updatedAr).sort().reduce((obj: { [key: string]: string }, key) => {
      obj[key] = updatedAr[key];
      return obj;
    }, {});

    writeFileSync(localeFiles.en, JSON.stringify(updatedEn, null, 2));
    writeFileSync(localeFiles.ar, JSON.stringify(updatedAr, null, 2));
    console.log("Locale files updated successfully.");
  } else {
    console.log("No new strings found.");
  }

  console.log("i18n extraction complete.");
}

main().catch(console.error);