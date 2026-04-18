import * as tool from '../models/tool.js';
import fs from 'fs';
import path from 'path';

const cfg_priority = await tool.set_priority("daily_paper")
const daily_url = await tool.set_otherCfg("daily_url")
const configPath = path.join(process.cwd(), 'plugins/San-plugin/data/daily_cron.json');

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
                    fnc: 'setCron'
                }
            ]
        });

        // 定时任务：每分钟检查一次
        this.task = {
            name: '绫华日报定时',
            fnc: 'daily',
            cron: '0 * * * * ?'
        }
    }
    async daily(e){
        async function get(e) {
            try{
                const response = await fetch(daily_url)
                if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
                const data = await response.json()
                let base64 = data[`data`].base64
                //logger.info(base64)
                e.reply(segment.image(`base64://${base64}`))
            } catch(error) {
                logger.error(`请求异常:${error}`)
                e.reply(`日报请求异常`)
            }
        }

        await get(e)
    }

    async setCron(e) {
        const match = e.msg.match(/^#绫华日报定时(.+)$/)
        if (!match) return false

        const time = match[1].trim()
        // 保存时间
        saveCronTime(time)
        await e.reply(`✅ 日报已更改成${time}推送`)
        return true
        return true
    }
    
    async daily(e) {
        // 检查是否到达设定时间
        const now = new Date();
        const cronTime = getCronTime();
        const [hour, minute] = cronTime.split(':').map(Number);
        
        if (now.getHours() !== hour || now.getMinutes() !== minute) {
            return false; // 不是设定时间，不发送
        }

        async function get(e) {
            try{
                const response = await fetch(daily_url)
                if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
                const data = await response.json()
                let base64 = data[`data`].base64
                //logger.info(base64)
                e.reply(segment.image(`base64://${base64}`))
            } catch(error) {
                logger.error(`请求异常:${error}`)
                e.reply(`日报请求异常`)
            }
        }

        await get(e)
    }
    
}