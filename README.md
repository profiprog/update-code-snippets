Simple tool for updating code snippets in RREADME.md or in other .md files directly from project codes.

Currently supports just `typescript`. Other languages will be added as needed.

## Install
```
$ npm install -D update-code-snippets
```

## Usage
Tool can be used together with `husky` to automatically update code snippets in README.md before every commit.

In `package.json` set up:
```json
{ 
  "scripts": {
    "precommit": "update-code-snippets"
  },
  "devDependencies": {
    "husky": "^0.14.3",
    "update-code-snippets": "^1.0.0"
  }
}
```

<!-- testing include:
```typescript
function resolveKind(kind) {
	for (let x in ts.SyntaxKind) if (ts.SyntaxKind[x] === kind) return x;
	return "(unknown)";
}
```
-->