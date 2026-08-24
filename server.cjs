const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

const JDOODLE_URL = 'https://api.jdoodle.com/v1/execute';
const CLIENT_ID = process.env.JDOODLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET || '';

const questionsPath = path.join(__dirname, 'public', 'questions-data.json');
const QUESTIONS = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

app.use(cors());
app.use(express.json({ limit: '256kb' }));

const ref = {
  reverseString: s => [...s].reverse().join(''),
  isPalindrome: s => s === ref.reverseString(s),
  countVowels: s => [...s].filter(c => 'aeiou'.includes(c.toLowerCase())).length,
  countConsonants: s => [...s].filter(c => /[A-Za-z]/.test(c) && !'aeiou'.includes(c.toLowerCase())).length,
  countDigits: s => [...s].filter(c => /[0-9]/.test(c)).length,
  countSpaces: s => [...s].filter(c => c === ' ').length,
  convertToUpper: s => s.replace(/[a-z]/g, c => String.fromCharCode(c.charCodeAt(0) - 32)),
  convertToLower: s => s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32)),
  findLength: s => [...s].reduce(n => n + 1, 0),
  countCharacter: (s, c) => [...s].filter(x => x === c[0]).length,
  firstOccurrence: (s, c) => s.indexOf(c[0]),
  lastOccurrence: (s, c) => s.lastIndexOf(c[0]),
  removeSpaces: s => s.replaceAll(' ', ''),
  countWords: s => s.trim() ? s.trim().split(/ +/).length : 0,
  reverseWords: s => s.split(' ').map(x => [...x].reverse().join('')).join(' '),
  reverseWordOrder: s => s.trim().split(/ +/).reverse().join(' '),
  removeDuplicates: s => [...new Set(s)].join(''),
  findDuplicates: s => {
    const seen = new Set(), dup = new Set();
    let out = '';
    for (const c of s) {
      if (seen.has(c) && !dup.has(c)) {
        dup.add(c);
        out += c;
      } else seen.add(c);
    }
    return out;
  },
  frequency: (s, c) => [...s].filter(x => x === c[0]).length,
  maxOccurringChar: s => {
    const m = new Map();
    for (const c of s) m.set(c, (m.get(c) || 0) + 1);
    let best = s[0];
    for (const c of s) if ((m.get(c) || 0) > (m.get(best) || 0)) best = c;
    return best;
  },
  isAnagram: (a, b) => [...a].sort().join('') === [...b].sort().join(''),
  removeCharacter: (s, c) => [...s].filter(x => x !== c[0]).join(''),
  replaceCharacter: (s, a, b) => [...s].map(x => x === a[0] ? b[0] : x).join(''),
  onlyDigits: s => /^[0-9]*$/.test(s),
  firstNonRepeating: s => {
    for (const c of s) if ([...s].filter(x => x === c).length === 1) return c;
    return '';
  },
  firstRepeating: s => {
    const seen = new Set();
    for (const c of s) {
      if (seen.has(c)) return c;
      seen.add(c);
    }
    return '';
  },
  isRotation: (a, b) => a.length === b.length && (a + a).includes(b),
  removeVowels: s => [...s].filter(c => !'aeiou'.includes(c.toLowerCase())).join(''),
  countCase: s =>
    `Uppercase = ${[...s].filter(c => /[A-Z]/.test(c)).length}\nLowercase = ${[...s].filter(c => /[a-z]/.test(c)).length}`,
  isPalindromeIgnoreSpaces: s => {
    const x = s.replaceAll(' ', '');
    return x === [...x].reverse().join('');
  }
};

const pools = {
  reverseString: ['OpenAI', 'racecar'],
  isPalindrome: ['level', 'coding'],
  countVowels: ['beautiful', 'sky'],
  countConsonants: ['abcdef', 'Java'],
  countDigits: ['a1b2c3', '2026'],
  countSpaces: ['one two three', 'no spaces'],
  convertToUpper: ['practice lab', 'abcXYZ'],
  convertToLower: ['PRACTICE LAB', 'ABCxyz'],
  findLength: ['OpenAI', ''],
  countCharacter: ['mississippi\ns', 'letter\nt'],
  firstOccurrence: ['banana\na', 'hello\no'],
  lastOccurrence: ['banana\na', 'programming\ng'],
  removeSpaces: ['a b c d', 'hello world'],
  countWords: ['one two three', '  Java   lab  '],
  reverseWords: ['abc def', 'one two three'],
  reverseWordOrder: ['one two three', 'Java is fun'],
  removeDuplicates: ['mississippi', 'aabbcc'],
  findDuplicates: ['mississippi', 'letter'],
  frequency: ['mississippi\ns', 'letter\nt'],
  maxOccurringChar: ['mississippi', 'aabbccc'],
  isAnagram: ['evil\nvile', 'abc\nadb'],
  removeCharacter: ['mississippi\ns', 'banana\nb'],
  replaceCharacter: ['mississippi\ns\nx', 'banana\na\no'],
  onlyDigits: ['000123', '12a3'],
  firstNonRepeating: ['aabbcd', 'aabbccx'],
  firstRepeating: ['abcdefca', 'abcdab'],
  isRotation: ['waterbottle\nerbottlewat', 'abcd\ndabc'],
  removeVowels: ['beautiful', 'AEIOU'],
  countCase: ['ABCdef', 'Hello WORLD'],
  isPalindromeIgnoreSpaces: ['a b c b a', 'a b c']
};

function hidden(q) {
  const fn = String(q.function || '').split('(')[0].trim();
  const implementation = ref[fn];
  if (typeof implementation !== 'function') return [];

  return (pools[fn] || ['test', 'example']).map(input => ({
    input,
    expected: String(implementation(...input.split('\n')))
  }));
}

function getFunctionName(q) {
  return String(q.function || '').split('(')[0].trim();
}

function getReturnType(fn) {
  const ints = [
    'countVowels','countConsonants','countDigits','countSpaces',
    'findLength','firstOccurrence','lastOccurrence','countWords','frequency'
  ];
  const bools = [
    'isPalindrome','isPalindromeIgnoreSpaces','isAnagram','onlyDigits','isRotation'
  ];
  if (ints.includes(fn)) return 'int';
  if (bools.includes(fn)) return 'boolean';
  return 'String';
}

function getParamsSignature(inputLines) {
  if (inputLines.length === 1) return 'String str';
  if (inputLines.length === 2) return 'String str, String c';
  if (inputLines.length === 3) return 'String str, String a, String b';
  return inputLines.map((_, i) => `String arg${i}`).join(', ');
}

function javaStringLiteral(value) {
  return JSON.stringify(String(value));
}

function buildInvocation(fn, inputLines) {
  return `${fn}(${inputLines.map(javaStringLiteral).join(', ')})`;
}

function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function looksLikeCompleteJavaSource(code) {
  const clean = stripComments(code);
  return /\b(?:public\s+)?(?:final\s+)?class\s+[A-Za-z_$][\w$]*\b/.test(clean)
    || /\binterface\s+[A-Za-z_$][\w$]*\b/.test(clean)
    || /\benum\s+[A-Za-z_$][\w$]*\b/.test(clean);
}

function hasMainMethod(code) {
  return /\bstatic\s+void\s+main\s*\(\s*String\s*(?:\[\]|\.\.\.)\s+\w+\s*\)/.test(code);
}

function buildJavaSource(q, userCode, test) {
  const code = String(userCode || '').trim();
  const inputLines = String(test.input ?? '').split('\n');
  const fn = getFunctionName(q);

  // Complete Java source: never wrap it again.
  if (looksLikeCompleteJavaSource(code)) {
    if (hasMainMethod(code)) return code;

    // For a complete class without main, add a generated main before
    // the final class brace. This works for normal single-class submissions.
    const lastBrace = code.lastIndexOf('}');
    if (lastBrace !== -1 && fn) {
      const invocation = buildInvocation(fn, inputLines);
      const main = `
    public static void main(String[] args) {
        System.out.println(${invocation});
    }
`;
      return code.slice(0, lastBrace) + main + code.slice(lastBrace);
    }
    return code;
  }

  // Logic-only source. IMPORTANT: JDoodle needs a PUBLIC class.
  const returnType = getReturnType(fn);
  const paramsSignature = getParamsSignature(inputLines);
  const invocation = buildInvocation(fn, inputLines);

  return `import java.util.*;

public class Main {
    public static ${returnType} ${fn}(${paramsSignature}) {
        ${code}
    }

    public static void main(String[] args) {
        System.out.println(${invocation});
    }
}
`;
}

function cleanOutput(value) {
  return String(value || '').replace(/\r?\n$/, '');
}

async function execute(q, code, test) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'Backend is not configured. Add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to .env.'
    );
  }

  const source = buildJavaSource(q, code, test);

  const response = await fetch(JDOODLE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      script: source,
      language: 'java',
      versionIndex: '4'
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `JDoodle request failed (${response.status}).`
    );
  }

  const output = cleanOutput(data.output);
  const error = cleanOutput(data.error);

  if (error) {
    return {
      input: test.input,
      expected: test.expected,
      output,
      error,
      status: 'failed'
    };
  }

  return {
    input: test.input,
    expected: test.expected,
    output,
    error: '',
    status:
      output.trim().toLowerCase() === String(test.expected).trim().toLowerCase()
        ? 'passed'
        : 'failed'
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    backend: 'running',
    provider: 'JDoodle',
    jdoodleConfigured: Boolean(CLIENT_ID && CLIENT_SECRET)
  });
});

app.get('/api/questions', (req, res) => {
  res.json(QUESTIONS);
});

app.post('/api/run', async (req, res) => {
  try {
    const q = QUESTIONS.find(x => x.id === Number(req.body?.questionId));
    const code = req.body?.code;

    if (!q) return res.status(400).json({ error: 'Question not found.' });
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Code cannot be empty.' });
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(503).json({
        error:
          'Backend is not configured. Add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to .env.'
      });
    }

    const samples = Array.isArray(q.samples) ? q.samples.slice(0, 2) : [];
    const hiddenCases = hidden(q);

    // JDoodle has execution/rate limits, so keep the request sequence controlled.
    const sample = [];
    for (const test of samples) {
      sample.push(await execute(q, code, test));
    }

    const hiddenResults = [];
    for (const test of hiddenCases) {
      hiddenResults.push(await execute(q, code, test));
    }

    const all = [...sample, ...hiddenResults];

    res.json({
      sample,
      hidden: hiddenResults,
      summary: {
        samplePassed: sample.filter(x => x.status === 'passed').length,
        sampleTotal: sample.length,
        hiddenPassed: hiddenResults.filter(x => x.status === 'passed').length,
        hiddenTotal: hiddenResults.length,
        totalPassed: all.filter(x => x.status === 'passed').length,
        total: all.length
      }
    });
  } catch (e) {
    console.error('Run error:', e);
    res.status(500).json({
      error: e.message || 'Execution failed.'
    });
  }
});

const dist = path.join(__dirname, 'dist');

if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend: http://localhost:${PORT}`);
  console.log(
    `JDoodle credentials: ${
      CLIENT_ID && CLIENT_SECRET ? 'Loaded Successfully ✅' : 'UNDEFINED ❌'
    }`
  );
});
