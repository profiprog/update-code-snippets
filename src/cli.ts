#!/usr/bin/env node
import {lstatSync, readdirSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";
import * as ts from "typescript";

function resolveKind(kind) {
	for (let x in ts.SyntaxKind) if (ts.SyntaxKind[x] === kind) return x;
	return "(unknown)";
}

const parseAST = fileName => ts.createSourceFile(
	fileName,
	readFileSync(fileName).toString(),
	ts.ScriptTarget.ES2015,
	true);

const listFiles = (dir: string, pattern: RegExp) => readdirSync(dir).reduce((result: string[], entry: string) => {
	let fullPathEntry = join(dir, entry),
		stat = lstatSync(fullPathEntry);
	if (stat.isDirectory()) result.push(...listFiles(fullPathEntry, pattern));
	else if (stat.isFile() && entry.match(pattern)) result.push(fullPathEntry);
	return result;
}, []);

const extractCode = node => node.getSourceFile().text.substring(node.getFullStart(), node.getEnd()).trim();

const sourceFinder = (sources: ts.SourceFile[], matcher: (node:ts.Node) => boolean): ts.Node | null => {
	let level = 1;
	let find = (node: ts.Node, deep: number): ts.Node | null => {
		if (matcher(node)) return node;
		if (deep >= level) {
			let children = node.getChildren();
			for (let i = 0; i < children.length; i++) {
				let result = find(children[i], deep + 1);
				if (result) return result;
			}
		}
		return null;
	};
	for (let i = 0; i < sources.length; i++) {
		let node = find(sources[i], level);
		if (node != null) return node;
	}
	return null;
};

const hasIdentifier = (node: any) => node.name && node.name.kind === ts.SyntaxKind.Identifier;
const getIdentifier = (node: any)  => hasIdentifier(node) ? extractCode(node.name) : null;

const updateCode = (tsCode, sources) => {
	let snapshot = ts.createSourceFile("snapshot", tsCode, ts.ScriptTarget.ES2015, true);
	const children = (children: ts.Node[], node: ts.Node) => {
		switch(node.kind) {
			case ts.SyntaxKind.SyntaxList: return children.concat(node.getChildren());
			case ts.SyntaxKind.EndOfFileToken: return children;
			default: throw new Error("Unexpected node syntax kind: " + resolveKind(node.kind));
		}
	};
	return snapshot.getChildren().reduce(children, []).map(node => {
		let id = getIdentifier(node);
		let source = extractCode(node);
		if (id) {
			let original = sourceFinder(sources, n => n.kind === node.kind && getIdentifier(n) === id);
			if (!original) console.log("\x1b[33mWarning " + resolveKind(node.kind) + ": " + id + " was not found!\x1b[0m");
			else {
				let originalSource = extractCode(original);
				if (source.trim() !== originalSource.trim()) {
					console.log("\x1b[36mUpdating " + resolveKind(node.kind) + ": " + id + "\x1b[0m");
					return originalSource.trim();
				}
			}
		}
		return source.trim();
	}).join('\n') + '\n';
};

const TYPESCRIPT = "typescript\n";
const updateContent = (mdFile, sources) => {
	let content = readFileSync(mdFile).toString().split("```");
	for (let i = 1; i < content.length; i += 2) {
		if (content[i].startsWith(TYPESCRIPT)) {
			content[i] = "typescript\n" + updateCode(content[i].substr(TYPESCRIPT.length), sources);
		}
	}
	writeFileSync(mdFile, content.join("```"));
};

const docFiles = process.argv.slice(2);
if (!docFiles.length) {
	if (lstatSync("README.md")) docFiles.push("README.md");
	else new Error("File README.md not found!");
}

if (docFiles.length) {
	let sources = listFiles("src", /.+\.ts$/).map(parseAST);
	docFiles.forEach(file => {
		if (!lstatSync(file).isFile()) new Error("File " + file + " not found!");
		if (file.match(".md")) updateContent(file, sources);
		else new Error("Other files than .md are not supported yet!");
	});
}
