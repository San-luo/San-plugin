import * as tool from '../models/tool.js';
import fs from 'fs';
import path from 'path';

const cfg_priority = await tool.set_priority("daily_paper")
const daily_url = await tool.set_otherCfg("daily_url")
const configPath = path.join(process.cwd(), 'plugins/San-plugin/data/daily_cron.json');

// 白名单群列表（从文件读取）
const Whitelist = [];
const whiteListPath = path.join(process.cwd(), 'plugins/San-plugin/data/daily_whitelist.json');

// 加载白名单
function loadWhiteList() {
    try {
        if (fs.existsSync(whiteListPath)) {
            const data = JSON.parse(fs.readFileSync(whiteListPath, 'utf8'));
            return data.groups || [];
        }
    } catch (e) {}
    return [];
}

// 保存白名单
function saveWhiteList(groups) {
    try {
        const dir = path.dirname(whiteListPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(whiteListPath, JSON.stringify({ groups }, null, 2));
    } catch (e) {}
}

// 获取保存的cron配置
function getCronTime() {
    try {
        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return data.time || '7:00';
        }
    } catch (e) {}
    return '7:00';
}

// 保存cron配置
function saveCronTime(time) {
    try {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify({ time }, null, 2));
    } catch (e) {}
}

export class daily extends plugin {
    constructor() {
        super({
            name: 'daily-paper',
            dsc: '日报',
            event: 'message',
            priority: cfg_priority,
            rule: [
                {
                    reg: '^#日报$',
                    fnc: 'daily'
                },
                {
                    reg: '^#绫华日报定时(.+)$',
                    fnc: 'setCron',
                    permission: 'master'
                },
                {
                    reg: '^#日报开启白名单$',
                    fnc: 'enableWhiteList',
                    permission: 'master'
                },
                {
                    reg: '^#日报关闭白名单$',
                    fnc: 'disableWhiteList',
                    permission: 'master'
                }
            ]
        });

        // 定时任务：每分钟检查一次
        this.task = {
            name: '绫华日报定时',
            fnc: () => this.cronDaily(),
            cron: '0 * * * * ?'
        }
    }
    async daily(e) {
        const groups = loadWhiteList();
        if (groups.length > 0 && !groups.includes(e.group_id)) {
            return false;
        }

        try {
            const response = await fetch(daily_url)
            if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
            const data = await response.json()
            let base64 = data[`data`].base64
            e.reply(segment.image(`base64://${base64}`))
        } catch(error) {
            logger.error(`请求异常:${error}`)
            e.reply(`日报请求异常`)
        }
        return true;
    }

    async cronDaily() {
        // 检查是否到达设定时间
        const now = new Date();
        const cronTime = getCronTime();
        const [hour, minute] = cronTime.split(':').map(Number);

        if (now.getHours() !== hour || now.getMinutes() !== minute) {
            return false;
        }

        const groups = loadWhiteList();
        if (groups.length === 0) return false;

        try {
            const response = await fetch(daily_url)
            if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
            const data = await response.json()
            let base64 = data[`data`].base64

            // 向所有白名单群发送
            for (const groupId of groups) {
                try {
                    await Bot.pickGroup(groupId).sendMsg(segment.image(`base64://${base64}`))
                    logger.info(`[日报定时] 成功发送到群 ${groupId}`)
                } catch (err) {
                    logger.error(`[日报定时] 发送到群 ${groupId} 失败: ${err}`)
                }
            }
        } catch(error) {
            logger.error(`日报定时推送异常:${error}`)
        }
    }

    async setCron(e) {
        const groups = loadWhiteList();
        if (groups.length > 0 && !groups.includes(e.group_id)) {
            return false;
        }

        const match = e.msg.match(/^#绫华日报定时(.+)$/)
        if (!match) return false

        const time = match[1].trim()
        saveCronTime(time)
        await e.reply(`✅ 日报已更改成${time}推送`)
        return true
    }

    async enableWhiteList(e) {
        const groups = loadWhiteList()
        if (!groups.includes(e.group_id)) {
            groups.push(e.group_id)
            saveWhiteList(groups)
        }
        await e.reply(`✅ 日报白名单已开启（当前${groups.length}个群）`)
        return true
    }

    async disableWhiteList(e) {
        const groups = loadWhiteList()
        const idx = groups.indexOf(e.group_id)
        if (idx > -1) {
            groups.splice(idx, 1)
            saveWhiteList(groups)
        }
        await e.reply(`✅ 日报白名单已关闭（当前${groups.length}个群）`)
        return true
    }
}