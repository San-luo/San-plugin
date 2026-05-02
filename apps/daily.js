import * as tool from '../models/tool.js';
import fs from 'fs';
import path from 'path';

const cfg_priority = await tool.set_priority("daily_paper")
const configPath = path.join(process.cwd(), 'plugins/San-plugin/data/daily_cron.json');
const dailyConfigPath = path.join(process.cwd(), 'plugins/San-plugin/config/config.yaml');

const DAILY_APIS = {
    cdn: 'https://daily.kuro.ltd/api/v1/dayNews',
    tencent: 'http://43.139.184.14:55608/api/v1/dayNews'
}

let currentDailyApiSource = 'cdn'

function normalizeDailyApiSource(source) {
    if (source === 'api1') return 'cdn'
    if (source === 'api2') return 'tencent'
    return ['cdn', 'tencent'].includes(source) ? source : 'cdn'
}

async function reloadDailyApiSourceFromFile() {
    const cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
    const nextSource = normalizeDailyApiSource(cfg?.daily_api_source)
    if (nextSource !== currentDailyApiSource) {
        currentDailyApiSource = nextSource
        logger.info(`[日报] 热加载API源: ${currentDailyApiSource}`)
    }
}

async function getDailyApiSource() {
    return currentDailyApiSource
}

async function setDailyApiSource(source) {
    const nextSource = normalizeDailyApiSource(source)
    const prevSource = currentDailyApiSource
    currentDailyApiSource = nextSource

    try {
        const cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml')
        cfg.daily_api_source = nextSource
        await tool.objectToYamlFile(cfg, './plugins/San-plugin/config/config.yaml')
    } catch (error) {
        currentDailyApiSource = prevSource
        throw error
    }
}

await reloadDailyApiSourceFromFile()

async function fetchDailyData() {
    const source = await getDailyApiSource()
    const current = { name: source, url: DAILY_APIS[source] }
    const fallbackName = source === 'cdn' ? 'tencent' : 'cdn'
    const fallback = { name: fallbackName, url: DAILY_APIS[fallbackName] }

    let lastError = null

    for (const api of [current, fallback]) {
        try {
            logger.info(`[日报] 尝试API(${api.name}): ${api.url}`)
            const response = await fetch(api.url)
            if (!response.ok) throw new Error(`HTTP错误: ${response.status}`)

            const data = await response.json()
            if (!data.data || !data.data.base64) {
                throw new Error('API返回数据格式错误')
            }

            return { apiName: api.name, data }
        } catch (error) {
            lastError = error
            logger.error(`[日报] API(${api.name})请求失败: ${error.message}`)
        }
    }

    throw lastError || new Error('所有日报API均不可用')
}

// 白名单群列表（从文件读取）
const Whitelist = [];
const whiteListPath = path.join(process.cwd(), 'plugins/San-plugin/data/daily_whitelist.json');

// 初始化白名单文件（不存在则生成默认空白名单）
function initWhiteListFile() {
    try {
        if (!fs.existsSync(whiteListPath)) {
            const dir = path.dirname(whiteListPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(whiteListPath, JSON.stringify({ groups: [] }, null, 2));
            logger.info(`[日报白名单] 未检测到白名单文件，已生成: ${whiteListPath}`);
        }
    } catch (e) {
        logger.error('[日报白名单] 初始化白名单文件失败:', e);
    }
}

initWhiteListFile();

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
                    reg: '^#(?:日报api(?:切换)?|切换日报api)\\s*(1|2|cdn|腾讯云|tencent)$',
                    fnc: 'switchDailyApi',
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
            fnc: this.cronDaily.bind(this),
            cron: '0 * * * * ?'
        }

        // 监听配置文件变化
        this.watchConfigFile()
    }

    // 监听配置文件变化
    watchConfigFile() {
        try {
            // 确保目录存在
            const cronDir = path.dirname(configPath)
            if (!fs.existsSync(cronDir)) {
                fs.mkdirSync(cronDir, { recursive: true })
            }

            const whiteListDir = path.dirname(whiteListPath)
            if (!fs.existsSync(whiteListDir)) {
                fs.mkdirSync(whiteListDir, { recursive: true })
            }

            const dailyCfgDir = path.dirname(dailyConfigPath)
            if (!fs.existsSync(dailyCfgDir)) {
                fs.mkdirSync(dailyCfgDir, { recursive: true })
            }

            // 监听定时配置文件
            fs.watch(configPath, (eventType) => {
                if (eventType === 'change') {
                    logger.info('[日报定时] 检测到配置文件变化，已重新加载')
                }
            })

            // 监听白名单文件
            fs.watch(whiteListPath, (eventType) => {
                if (eventType === 'change') {
                    logger.info('[日报白名单] 检测到白名单文件变化，已重新加载')
                }
            })

            // 监听日报API配置文件（热加载）
            fs.watch(dailyConfigPath, async (eventType) => {
                if (eventType === 'change') {
                    try {
                        await reloadDailyApiSourceFromFile()
                    } catch (err) {
                        logger.error('[日报] 热加载API配置失败:', err)
                    }
                }
            })
        } catch (e) {
            logger.error('[日报] 文件监听启动失败:', e)
        }
    }
    async daily(e) {
        try {
            const { apiName, data } = await fetchDailyData()
            let base64 = data.data.base64
            logger.info(`[日报] 使用API(${apiName})获取到base64，长度: ${base64.length}`)
            await e.reply(segment.image(`base64://${base64}`))
            logger.info(`[日报] 图片发送完成`)
        } catch(error) {
            logger.error(`[日报] 请求异常: ${error}`)
            e.reply(`日报请求异常: ${error.message}`)
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
            const { apiName, data } = await fetchDailyData()
            let base64 = data.data.base64
            logger.info(`[日报定时] 使用API(${apiName})获取到base64，长度: ${base64.length}`)

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

    async switchDailyApi(e) {
        const match = e.msg.match(/^#(?:日报api(?:切换)?|切换日报api)\s*(1|2|cdn|腾讯云|tencent)$/)
        if (!match) {
            await e.reply('格式错误：#切换日报api 1/2 或 #日报api切换 cdn|腾讯云')
            return true
        }

        const input = match[1]
        const source = (input === '2' || input === '腾讯云' || input === 'tencent') ? 'tencent' : 'cdn'
        await setDailyApiSource(source)
        await e.reply(`✅ 日报API已切换为${source === 'cdn' ? 'CDN' : '腾讯云'}`)
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