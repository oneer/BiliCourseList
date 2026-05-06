// ==UserScript==
// @name         B站课程信息提取器
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  提取B站课程列表信息，用于学习计划
// @author       You
// @match        https://www.bilibili.com/video/*
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('[B站课程提取器] 脚本已加载');
    
    // 等待DOM加载完成
    function waitForDOM() {
        if (document.body) {
            console.log('[B站课程提取器] DOM已就绪，初始化...');
            initExtractor();
        } else {
            setTimeout(waitForDOM, 100);
        }
    }
    
    // 初始化提取器
    function initExtractor() {
        // 创建按钮
        createExtractButton();
        // 设置观察器监听DOM变化
        setupObserver();
    }
    
    waitForDOM();

    // 创建提取按钮
    function createExtractButton() {
        // 检查是否已经添加过按钮
        if (document.getElementById('extract-course-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'extract-course-btn';
        button.textContent = '📋 提取课程';
        button.style.cssText = `
            padding: 6px 12px;
            background-color: #00a1d6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 8px;
            transition: all 0.3s ease;
            font-weight: 500;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        `;

        button.onmouseover = () => {
            button.style.backgroundColor = '#0088aa';
            button.style.transform = 'scale(1.05)';
        };

        button.onmouseout = () => {
            button.style.backgroundColor = '#00a1d6';
            button.style.transform = 'scale(1)';
        };

        button.onclick = extractCourses;

        // 尝试找到自动连播按钮容器
        const continuousBtn = document.querySelector('.auto-play .continuous-btn');
        if (continuousBtn && continuousBtn.parentElement) {
            const container = continuousBtn.parentElement;
            container.insertBefore(button, continuousBtn);
            console.log('✅ 按钮已添加到自动连播左侧');
        } else {
            // 备用方案：添加到播放器控制栏
            const ctrlArea = document.querySelector('.bpx-player-control-bottom-center, .player-control-btn-group');
            if (ctrlArea) {
                ctrlArea.insertBefore(button, ctrlArea.firstChild);
                console.log('✅ 按钮已添加到控制栏');
            } else {
                // 最后的备用方案：固定位置
                button.style.cssText = `
                    position: fixed;
                    bottom: 80px;
                    right: 20px;
                    padding: 10px 15px;
                    background-color: #00a1d6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                    font-weight: 500;
                    white-space: nowrap;
                `;
                document.body.appendChild(button);
                console.log('✅ 按钮已添加到右下角（备用方案）');
            }
        }
    }

    // 备用：创建浮动按钮
    function createFloatingButton() {
        const button = document.createElement('button');
        button.id = 'extract-course-btn';
        button.textContent = '📋 提取课程';
        button.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            padding: 8px 12px;
            background-color: #00a1d6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            font-weight: 500;
        `;

        button.onmouseover = () => {
            button.style.backgroundColor = '#0088aa';
            button.style.transform = 'scale(1.05)';
        };

        button.onmouseout = () => {
            button.style.backgroundColor = '#00a1d6';
            button.style.transform = 'scale(1)';
        };

        button.onclick = extractCourses;
        document.body.appendChild(button);
        console.log('✅ 浮动按钮已添加');
    }

    // 提取课程信息
    function extractCourses() {
        const pageTitle = document.querySelector('h1.video-title.special-text-indent')?.textContent.trim() || '';
        const courses = [];
        const items = document.querySelectorAll('.video-pod__item');

        let totalSeconds = 0;
        items.forEach((item, index) => {
            const titleElement = item.querySelector('.title-txt');
            const durationElement = item.querySelector('.stat-item.duration');

            if (titleElement && durationElement) {
                const durationText = durationElement.textContent.trim();
                totalSeconds += parseDurationToSeconds(durationText);
                courses.push({
                    序号: index + 1,
                    课程名称: titleElement.textContent.trim(),
                    时长: durationText
                });
            }
        });

        if (courses.length === 0) {
            showNotification('未找到课程信息', 'error');
            return;
        }

        const totalDurationText = formatSecondsToTime(totalSeconds);
        showExportDialog(courses, pageTitle, totalDurationText);
    }

    // 显示导出对话框
    function showExportDialog(courses, pageTitle, totalDurationText) {
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.id = 'export-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            z-index: 10001;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            min-width: 400px;
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
        `;

        // 标题
        const title = document.createElement('h3');
        title.textContent = `课程信息已提取 (${courses.length} 条)`;
        title.style.marginTop = '0';

        if (pageTitle) {
            const subj = document.createElement('div');
            subj.textContent = `课程标题：${pageTitle}`;
            subj.style.margin = '4px 0 8px';
            subj.style.fontSize = '13px';
            subj.style.color = '#333';
            dialog.appendChild(subj);
        }

        const courseCount = courses.length;

        const countLine = document.createElement('div');
        countLine.textContent = `课程总数：${courseCount}`;
        countLine.style.margin = '0 0 4px';
        countLine.style.fontSize = '13px';
        countLine.style.color = '#333';
        dialog.appendChild(countLine);

        const totalLine = document.createElement('div');
        totalLine.textContent = `总时长：${totalDurationText}`;
        totalLine.style.margin = '0 0 12px';
        totalLine.style.fontSize = '13px';
        totalLine.style.color = '#333';
        dialog.appendChild(totalLine);

        let includeUrls = false;
        const optionContainer = document.createElement('div');
        optionContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            font-size: 13px;
        `;
        const urlCheckbox = document.createElement('input');
        urlCheckbox.type = 'checkbox';
        urlCheckbox.id = 'extract-url-checkbox';
        const urlLabel = document.createElement('label');
        urlLabel.htmlFor = 'extract-url-checkbox';
        urlLabel.textContent = '包含课程地址';
        urlCheckbox.onchange = () => {
            includeUrls = urlCheckbox.checked;
            preview.textContent = formatSimple(courses, pageTitle, totalDurationText, courseCount, includeUrls);
        };
        optionContainer.appendChild(urlCheckbox);
        optionContainer.appendChild(urlLabel);
        dialog.appendChild(optionContainer);

        // 格式选择按钮
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin: 15px 0;
            flex-wrap: wrap;
        `;

        const formats = [
            { name: '简洁文本', format: 'simple', func: () => formatSimple(courses, pageTitle, totalDurationText, courseCount, includeUrls) },
            { name: '表格格式', format: 'table', func: () => formatTable(courses, pageTitle, totalDurationText, courseCount, includeUrls) },
            { name: 'Markdown格式', format: 'markdown', func: () => formatMarkdown(courses, pageTitle, totalDurationText, courseCount, includeUrls) },
            { name: 'JSON格式', format: 'json', func: () => formatJSON(courses, pageTitle, totalDurationText, courseCount, includeUrls) },
            { name: 'CSV格式', format: 'csv', func: () => formatCSV(courses, pageTitle, totalDurationText, courseCount, includeUrls) }
        ];

        formats.forEach(fmt => {
            const btn = document.createElement('button');
            btn.textContent = fmt.name;
            btn.style.cssText = `
                padding: 8px 12px;
                background-color: #00a1d6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            `;
            btn.onclick = () => {
                const output = fmt.func();
                copyToClipboard(output, fmt.name);
                dialog.remove();
                overlay.remove();
            };
            buttonContainer.appendChild(btn);
        });

        // 预览区域
        const preview = document.createElement('div');
        preview.style.cssText = `
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
            max-height: 300px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-all;
        `;
        preview.textContent = formatSimple(courses, pageTitle, totalDurationText, courseCount, false);

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            padding: 8px 12px;
            background-color: #ccc;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        `;
        closeBtn.onclick = () => {
            dialog.remove();
            overlay.remove();
        };

        dialog.appendChild(title);
        dialog.appendChild(buttonContainer);
        dialog.appendChild(preview);
        dialog.appendChild(closeBtn);

        document.body.appendChild(overlay);
        document.body.appendChild(dialog);
    }

    // 简洁文本格式
    function formatSimple(courses, pageTitle, totalDurationText, courseCount, includeUrl) {
        const lines = [];
        if (pageTitle) {
            lines.push(`课程标题：${pageTitle}`);
        }
        lines.push(`课程总数：${courseCount}`);
        lines.push(`总时长：${totalDurationText}`);
        lines.push('');
        lines.push(...courses.map((c, i) => {
            const urlPart = includeUrl && c.地址 ? ` ${c.地址}` : '';
            return `${i + 1}. ${c.课程名称} (${c.时长})${urlPart}`;
        }));
        return lines.join('\n');
    }

    // 表格格式
    function formatTable(courses, pageTitle, totalDurationText, courseCount, includeUrl) {
        let result = '';
        if (pageTitle) {
            result += `课程标题：${pageTitle}\n`;
        }
        result += `课程总数：${courseCount}\n`;
        result += `总时长：${totalDurationText}\n\n`;
        result += '序号\t课程名称\t时长';
        if (includeUrl) {
            result += '\t地址';
        }
        result += '\n';
        result += ''.padEnd(80, '-') + '\n';
        courses.forEach((c, i) => {
            result += `${i + 1}\t${c.课程名称}\t${c.时长}`;
            if (includeUrl) {
                result += `\t${c.地址 || ''}`;
            }
            result += '\n';
        });
        return result;
    }

    // JSON格式
    function formatJSON(courses, pageTitle, totalDurationText, courseCount, includeUrl) {
        const data = {
            title: pageTitle,
            courseCount,
            totalDuration: totalDurationText,
            courses: courses.map(c => {
                const item = {
                    序号: c.序号,
                    课程名称: c.课程名称,
                    时长: c.时长
                };
                if (includeUrl && c.地址) {
                    item.地址 = c.地址;
                }
                return item;
            })
        };
        return JSON.stringify(data, null, 2);
    }

    // Markdown格式
    function formatMarkdown(courses, pageTitle, totalDurationText, courseCount, includeUrl) {
        const lines = [];
        if (pageTitle) {
            lines.push(`# ${pageTitle}`);
            lines.push('');
        }
        lines.push(`**课程总数：** ${courseCount}`);
        lines.push(`**总时长：** ${totalDurationText}`);
        lines.push('');
        const header = ['序号', '课程名称', '时长'];
        if (includeUrl) {
            header.push('地址');
        }
        lines.push(`| ${header.join(' | ')} |`);
        lines.push(`| ${header.map(() => '----').join(' | ')} |`);
        courses.forEach((c, i) => {
            const name = c.课程名称.replace(/\|/g, '\\|');
            const duration = c.时长.replace(/\|/g, '\\|');
            const row = [`${i + 1}`, name, duration];
            if (includeUrl) {
                row.push(c.地址 ? c.地址.replace(/\|/g, '\\|') : '');
            }
            lines.push(`| ${row.join(' | ')} |`);
        });
        return lines.join('\n');
    }

    // CSV格式
    function formatCSV(courses, pageTitle, totalDurationText, courseCount, includeUrl) {
        let result = '';
        if (pageTitle) {
            result += `课程标题,${pageTitle.replace(/"/g, '""')}\n`;
        }
        result += `课程总数,${courseCount}\n`;
        result += `总时长,${totalDurationText}\n`;
        result += '序号,课程名称,时长';
        if (includeUrl) {
            result += ',地址';
        }
        result += '\n';
        courses.forEach((c, i) => {
            result += `${i + 1},"${c.课程名称.replace(/"/g, '""')}","${c.时长.replace(/"/g, '""')}"`;
            if (includeUrl) {
                result += `,"${(c.地址 || '').replace(/"/g, '""')}"`;
            }
            result += '\n';
        });
        return result;
    }

    function parseDurationToSeconds(durationText) {
        const parts = durationText.split(':').map(part => parseInt(part.trim(), 10));
        if (parts.some(isNaN)) {
            return 0;
        }
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return parts[0] || 0;
    }

    function formatSecondsToTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // 复制到剪贴板
    function copyToClipboard(text, format) {
        try {
            GM_setClipboard(text);
            showNotification(`已复制 ${format} 格式到剪贴板！`, 'success');
        } catch (e) {
            // 备用方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showNotification(`已复制 ${format} 格式到剪贴板！`, 'success');
        }
    }

    // 通知提示
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background-color: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 4px;
            z-index: 10002;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // 检查是否是B站视频页面
    function isValidPage() {
        const url = window.location.href;
        return url.startsWith('https://www.bilibili.com/video');
    }

    // 使用观察者模式持续监听DOM变化
    function setupObserver() {
        const observer = new MutationObserver(() => {
            if (!document.getElementById('extract-course-btn')) {
                createExtractButton();
            }
        });

        // 观察body的所有变化
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });

        console.log('✅ DOM观察器已启动');
    }

})();
