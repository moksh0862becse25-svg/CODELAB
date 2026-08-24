const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Environment variables load karna (Strict path ke sath taaki hamesha file mile)
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
const envConfig = dotenv.config({ path: envPath });

// Test lines: Check karne ke liye ki .env load hua ya nahi
console.log("-----------------------------------------");
if (envConfig.error) {
    console.log("DOTENV ERROR: ", envConfig.error.message);
} else {
    console.log("DOTENV SUCCESS: .env file found and loaded!");
}
console.log("Client ID is: ", process.env.JDOODLE_CLIENT_ID ? "Loaded Successfully ✅" : "UNDEFINED ❌");
console.log("-----------------------------------------");

const app = express();
const PORT = process.env.PORT || 3000;

// JDoodle API Endpoint & Credentials
const JDOODLE_URL = 'https://api.jdoodle.com/v1/execute';
const CLIENT_ID = process.env.JDOODLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET || '';

const QUESTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'questions-data.json'), 'utf8'));

app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Reference logic (Answers generate karne ke liye)
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
    reverseWords: s => s.split(' ').map(ref.reverseString).join(' '),
    reverseWordOrder: s => s.trim().split(/ +/).reverse().join(' '),
    removeDuplicates: s => [...new Set(s)].join(''),
    findDuplicates: s => { let seen = new Set(), dup = new Set(), out = ''; for (const c of s) { if (seen.has(c) && !dup.has(c)) { dup.add(c); out += c } else seen.add(c) } return out },
    frequency: (s, c) => [...s].filter(x => x === c[0]).length,
    maxOccurringChar: s => { let m = new Map(); for (const c of s) m.set(c, (m.get(c) || 0) + 1); let best = s[0]; for (const c of s) if (m.get(c) > m.get(best)) best = c; return best },
    isAnagram: (a, b) => [...a].sort().join('') === [...b].sort().join(''),
    removeCharacter: (s, c) => [...s].filter(x => x !== c[0]).join(''),
    replaceCharacter: (s, a, b) => [...s].map(x => x === a[0] ? b[0] : x).join(''),
    onlyDigits: s => /^[0-9]*$/.test(s),
    firstNonRepeating: s => { for (const c of s) if ([...s].filter(x => x === c).length === 1) return c; return '' },
    firstRepeating: s => { let seen = new Set(); for (const c of s) { if (seen.has(c)) return c; seen.add(c) } return '' },
    isRotation: (a, b) => a.length === b.length && (a + a).includes(b),
    removeVowels: s => [...s].filter(c => !'aeiou'.includes(c.toLowerCase())).join(''),
    countCase: s => `Uppercase = ${[...s].filter(c => /[A-Z]/.test(c)).length}\nLowercase = ${[...s].filter(c => /[a-z]/.test(c)).length}`,
    isPalindromeIgnoreSpaces: s => { const x = s.replaceAll(' ', ''); return x === ref.reverseString(x) }
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
    const fn = q.function.split('(')[0];
    return (pools[fn] || ['test', 'example']).map(input => ({
        input,
        expected: String(ref[fn](...input.split('\n')))
    }));
}

// 600ms Delay API ko rate limit hone se rokti hai
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function execute(q, code, test) {
    const fn = q.function.split('(')[0];
    const args = test.input.split('\n').map(x => JSON.stringify(x)).join(', ');

    // Java Signature Fix (Dynamic types)
    let javaSignature = `public static String ${fn}(String str)`;
    const intReturningFunctions = ["countVowels", "countConsonants", "countDigits", "countSpaces", "findLength", "firstOccurrence", "lastOccurrence", "countWords"];
    
    if (intReturningFunctions.includes(fn)) {
        javaSignature = `public static int ${fn}(String str)`;
    } else if (fn === "countCharacter" || fn === "removeCharacter") {
        javaSignature = `public static String ${fn}(String str, String charToRemove)`;
    }

    // FIX: "public class Main" ki jagah sirf "class Main" (JDoodle rule)
    const source = `import java.util.*; class Main { ${javaSignature} { ${code} } public static void main(String[] args) { System.out.println(${fn}(${args})); } }`;

    const requestBody = {
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: source,
        language: "java",
        versionIndex: "4" 
    };

    const r = await fetch(JDOODLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!r.ok) throw new Error(`JDoodle request failed (${r.status})`);

    const d = await r.json();
    
    const output = (d.output || '').replace(/\r?\n$/, '');
    const error = d.error || '';

    // Terminal mein logs dikhane ke liye taaki debug aasan ho
    console.log(`[Test for ${fn}] Expected: ${test.expected} | Output: ${output}`);

    // Agar JDoodle limit/compilation pe fasa toh UI ko asli error dikhayega
    if (d.memory === null || d.cpuTime === null) {
         return {
            input: test.input,
            expected: test.expected,
            output: output, 
            error: "Execution/Compilation Issue", 
            status: 'failed'
        };
    }

    return {
        input: test.input,
        expected: test.expected,
        output,
        error,
        status: !error && output.trim() === test.expected.trim() ? 'passed' : 'failed'
    };
}

app.get('/api/questions', (req, res) => res.json(QUESTIONS));

app.post('/api/run', async (req, res) => {
    try {
        if (!CLIENT_ID || !CLIENT_SECRET) return res.status(503).json({ error: 'Backend is not configured. Add JDOODLE API credentials to .env.' });

        const q = QUESTIONS.find(x => x.id === Number(req.body?.questionId));
        const code = req.body?.code;

        if (!q || typeof code !== 'string' || !code.trim()) return res.status(400).json({ error: 'Invalid question or empty code.' });

        const samples = q.samples.slice(0, 2);
        const hiddenCases = hidden(q);

        const sample = [];
        for (const t of samples) {
            sample.push(await execute(q, code, t));
            await delay(600); // Wait for 600ms
        }

        const hiddenResults = [];
        for (const t of hiddenCases) {
            hiddenResults.push(await execute(q, code, t));
            await delay(600); // Wait for 600ms
        }

        const results = [...sample, ...hiddenResults];

        res.json({
            sample,
            hidden: hiddenResults,
            summary: {
                samplePassed: sample.filter(x => x.status === 'passed').length,
                sampleTotal: sample.length,
                hiddenPassed: hiddenResults.filter(x => x.status === 'passed').length,
                hiddenTotal: hiddenResults.length,
                totalPassed: results.filter(x => x.status === 'passed').length,
                total: results.length
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const dist = path.join(__dirname, 'dist');
if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`Backend: http://localhost:${PORT}`));