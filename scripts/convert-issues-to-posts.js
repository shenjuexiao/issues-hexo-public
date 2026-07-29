const fs = require('fs');
const path = require('path');

function convertIssuesToPosts(issuesJsonPath, outputDir) {
  const issues = JSON.parse(fs.readFileSync(issuesJsonPath, 'utf8'));
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const generatedFiles = [];
  
  issues.forEach(issue => {
    // 跳过已关闭的 Issue（除非是已发布状态）
    if (issue.state === 'closed') {
      console.log(`⏭️  跳过已关闭的 Issue #${issue.number}: ${issue.title}`);
      return;
    }
    
    // 检查标签：是否包含 'draft' 标签
    const labels = issue.labels.map(l => l.name);
    if (labels.includes('draft')) {
      console.log(`⏭️  跳过草稿 Issue #${issue.number}: ${issue.title}`);
      return;
    }
    
    // 解析 Issue 正文
    const body = issue.body || '';
    const frontMatterMatch = body.match(/^---\n([\s\S]*?)\n---/);
    let frontMatter = {};
    let content = body;
    
    if (frontMatterMatch) {
      // 使用 js-yaml 解析更可靠
      try {
        const yaml = require('js-yaml');
        frontMatter = yaml.load(frontMatterMatch[1]);
        content = body.replace(frontMatterMatch[0], '').trim();
      } catch (e) {
        console.warn(`⚠️  解析 Issue #${issue.number} 的 Front Matter 失败:`, e.message);
      }
    }
    
    // 构建文章元数据
    const postData = {
      title: frontMatter.title || issue.title,
      date: frontMatter.date || issue.createdAt,
      updated: frontMatter.updated || issue.updatedAt,
      tags: frontMatter.tags || labels.filter(l => !['draft', 'published'].includes(l)),
      categories: frontMatter.categories || '未分类',
      cover: frontMatter.cover || '',
      comments: frontMatter.comments !== undefined ? frontMatter.comments : true,
      ...frontMatter
    };
    
    // 生成 Front Matter
    const yaml = require('js-yaml');
    const frontMatterYaml = yaml.dump(postData, {
      lineWidth: 120,
      forceQuotes: false,
    });
    
    // 组合完整文件内容
    const fileContent = `---\n${frontMatterYaml}---\n\n${content}`;
    
    // 文件名：日期-标题-slug.md
    const dateStr = new Date(postData.date).toISOString().split('T')[0];
    const titleSlug = postData.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${dateStr}-${titleSlug}.md`;
    
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, fileContent, 'utf8');
    generatedFiles.push(filename);
    
    console.log(`✅ 已生成: ${filename} (Issue #${issue.number})`);
  });
  
  return generatedFiles;
}

// 执行
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('用法: node convert-issues-to-posts.js <issues.json路径> <输出目录>');
  process.exit(1);
}

try {
  const yaml = require('js-yaml');
} catch (e) {
  console.error('请安装 js-yaml: npm install js-yaml');
  process.exit(1);
}

convertIssuesToPosts(args[0], args[1]);