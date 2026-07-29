const fs = require('fs');
const path = require('path');

function convertIssuesToPosts(issuesJsonPath, outputDir) {
  const issues = JSON.parse(fs.readFileSync(issuesJsonPath, 'utf8'));
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  issues.forEach(issue => {
    // 解析 Issue 正文中的 Front Matter
    const body = issue.body || '';
    const frontMatterMatch = body.match(/^---\n([\s\S]*?)\n---/);
    let frontMatter = {};
    let content = body;
    
    if (frontMatterMatch) {
      // 解析 YAML Front Matter
      const yamlContent = frontMatterMatch[1];
      frontMatter = parseYAML(yamlContent);
      content = body.replace(frontMatterMatch[0], '').trim();
    }
    
    // 提取标签
    const tags = issue.labels.map(label => label.name);
    
    // 构建文章元数据
    const postData = {
      title: frontMatter.title || issue.title,
      date: frontMatter.date || issue.createdAt,
      tags: frontMatter.tags || tags,
      categories: frontMatter.categories || '未分类',
      cover: frontMatter.cover || '',
      ...frontMatter
    };
    
    // 生成文件内容
    const fileContent = `---
${Object.entries(postData).map(([key, value]) => {
  if (Array.isArray(value)) {
    return `${key}: [${value.join(', ')}]`;
  }
  return `${key}: ${value}`;
}).join('\n')}
---

${content}`;
    
    // 文件名：日期-标题.md
    const dateStr = new Date(postData.date).toISOString().split('T')[0];
    const titleSlug = postData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${dateStr}-${titleSlug}.md`;
    
    fs.writeFileSync(
      path.join(outputDir, filename),
      fileContent,
      'utf8'
    );
    
    console.log(`✅ 已生成: ${filename}`);
  });
}

function parseYAML(yaml) {
  // 简易 YAML 解析（生产环境建议使用 js-yaml 库）
  const result = {};
  yaml.split('\n').forEach(line => {
    const match = line.match(/^(\w+):\s*(.+)/);
    if (match) {
      const [, key, value] = match;
      if (value.startsWith('[') && value.endsWith(']')) {
        result[key] = value.slice(1, -1).split(',').map(v => v.trim());
      } else {
        result[key] = value;
      }
    }
  });
  return result;
}

// 执行
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('用法: node convert-issues.js <issues.json路径> <输出目录>');
  process.exit(1);
}

convertIssuesToPosts(args[0], args[1]);