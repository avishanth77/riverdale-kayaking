const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\764e073f-3dd4-40fc-8c6b-3117baa3b457\\.system_generated\\logs\\transcript_full.jsonl';
const outPath = path.join(__dirname, '..', 'PROJECT_CHAT_HISTORY.md');

if (!fs.existsSync(transcriptPath)) {
  console.error('Transcript not found at:', transcriptPath);
  process.exit(1);
}

const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');

const turns = [];
let currentUser = null;

lines.forEach((l) => {
  try {
    const o = JSON.parse(l);
    if (o.type === 'USER_INPUT') {
      let cleanContent = o.content || '';
      const match = cleanContent.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
      if (match) cleanContent = match[1].trim();
      currentUser = {
        stepIndex: o.step_index,
        time: o.created_at,
        userMessage: cleanContent,
        assistantMessage: '',
        assistantTime: ''
      };
      turns.push(currentUser);
    } else if (o.type === 'PLANNER_RESPONSE' && o.content) {
      if (currentUser) {
        currentUser.assistantMessage = o.content;
        currentUser.assistantTime = o.created_at;
      }
    }
  } catch (err) {}
});

let md = '# 🚣 Riverdale Kayaking — Full Chat & Engineering History\n\n';
md += '> **Project:** Riverdale Kayaking Web Application & Custom Admin Portal\n';
md += '> **Stack:** Node.js, Express 5, Multer, Vanilla JS, Tailwind CSS, JSON Persistent Storage\n';
md += '> **Generated Date:** ' + new Date().toLocaleString('en-US', { timeZoneName: 'short' }) + '\n';
md += '> **Total Dialogue Turns:** ' + turns.length + '\n\n';
md += '---\n\n';

md += '## 📑 Quick Navigation\n\n';
turns.forEach((t, i) => {
  let firstLine = t.userMessage.split('\n')[0].replace(/[#*`_\[\]]/g, '').trim();
  if (firstLine.length > 80) firstLine = firstLine.slice(0, 77) + '...';
  md += `- [**Turn ${i + 1}:** ${firstLine}](#turn-${i + 1})\n`;
});
md += '\n---\n\n';

turns.forEach((t, i) => {
  md += `## Turn ${i + 1}\n\n`;
  if (t.time) {
    md += `🕒 **Timestamp:** \`${t.time}\`\n\n`;
  }
  md += '### 👤 User Request\n\n';
  md += '> ' + t.userMessage.split('\n').join('\n> ') + '\n\n';
  
  md += '### 🤖 Assistant Response & Actions Taken\n\n';
  if (t.assistantMessage && t.assistantMessage.trim()) {
    md += t.assistantMessage + '\n\n';
  } else {
    md += '*(Current step: exporting all chat dialogue turns into this structured Markdown document.)*\n\n';
  }
  md += '---\n\n';
});

fs.writeFileSync(outPath, md, 'utf8');
console.log('Successfully created:', outPath);
console.log('File size:', fs.statSync(outPath).size, 'bytes');
