import { runCode } from './src/runner.ts'; 

const benignCode = "module.exports = function add(a, b) { return a + b; };"; 
const maliciousCode = "module.exports = function malicious() { const fs = require('fs'); try { return fs.readFileSync('/etc/passwd', 'utf8').substring(0, 50); } catch (e) { return e.message; } };"; 
console.log(JSON.stringify(runCode(benignCode, 'javascript', [{ input: '1, 2', expected_output: '3' }]), null, 2)); 
console.log(JSON.stringify(runCode(maliciousCode, 'javascript', [{ input: '', expected_output: 'root:x:0:0:root:/root:/bin/ash' }]), null, 2));
