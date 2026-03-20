import * as tool from '../models/tool.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import common from '../../../lib/common/common.js';
import puppeteer from '../../../lib/puppeteer/puppeteer.js';
import axios from 'axios'; //tooljs遇到聊天记录会下载两遍图

let user_tags = {};
let laidianNub = 10;
const maxAttempts = 10;
let faceFile = "./data/San/face/userface.json";

export class San_AddFace extends plugin {
    constructor() {
        super({
            name: 'San-plugin表情功能',
            dsc: 'San-plugin表情功能',
            event: 'message',
            priority: '-114514',
            rule: [
                { reg: '^#(全局)?(批量|连续|多个|持续)?添加.*$', fnc: 'add' },
                { reg: '^#?(散|san|San)?表情列表$', fnc: 'facelist' },
                { reg: '^#?(散|san|San)设置表情添加(开启|关闭)$', fnc: 'addswitch' },
                { reg: '^#?(散|san|San)?表情(删除|删去|去除)(全部项(.*?))?$', fnc: 'deleteface' },
                { reg: '^#?(散|san|San)?来点(.*)$', fnc: 'laidian' },
                { reg: '^(.*)$', fnc: 'facereply', log: false },
                { reg: '^#?(散|san|San)?合并(表情|数据)?$', fnc: 'mergeFace' },
            ]
        });
    }

    async addnext(e) {
        try {
            const tag = user_tags[this.e.user_id].tag;
            const iscontinous = user_tags[this.e.user_id]["iscontinous"];
            let msg = await tool.getText(this.e);
            const stoplist = ['结束添加', '终止添加', '停止添加', '放弃添加', '终止', '停止', '放弃', '#结束添加', '#终止添加', '#停止添加', '#放弃添加', '#终止', '#停止', '#放弃'];

            if (iscontinous) {
                if (stoplist.includes(msg)) {
                    e.reply(`- ${tag} - 连续添加已结束`);
                    delete user_tags[e.user_id];
                    this.finish('addnext');
                    return;
                }
            } else {
                if (stoplist.includes(msg)) {
                    e.reply('已放弃本次添加');
                    delete user_tags[e.user_id];
                    this.finish('addnext');
                    return;
                }
            }

            await HandelFace(this.e, tag, user_tags[this.e.user_id]["isglobal"]);
            if (!iscontinous) { this.finish('addnext'); }
        } catch (error) {
            e.reply("出错辣");
            logger.error(error);
            this.finish('addnext');
        }
    }

    async add(e) {
        if (!(await isAddOpen())) {
            e.reply("表情添加已关闭,请发送#san设置表情添加开启");
            return;
        }
        if ((await isAddOnlyOpen())) {
            if (!(await tool.ismaster(e.user_id))) {
                e.reply('你不是我的主人哦');
                return false;
            }
        }
        let msg = await tool.getText(e);
        let reg = /^#(全局)?(批量|连续|多个|持续)?添加\s*(.*)$/;
        let match = msg.match(reg);
        if (!match || match[3] == '') {
            e.reply("tag禁止为空!");
            return;
        }
        if (!user_tags[e.user_id]) { user_tags[e.user_id] = {}; }
        user_tags[e.user_id]["tag"] = match[3];
        user_tags[e.user_id]["iscontinous"] = !!match[2];
        user_tags[e.user_id]["isglobal"] = !!match[1];

        if (await tool.getsource(e)) {
            let source = await tool.getsource(e);
            source.reply = e.reply;
            source.isGroup = e.isGroup;
            await HandelFace(source, match[3]);
        } else {
            this.setContext('addnext');
            e.reply("请发送添加内容");
        }
    }

    async addswitch(e) {
        if (!(await tool.ismaster(e.user_id))) { e.reply('你不是我的主人哦'); return false; }
        let reg = /^#?(散|san|San)设置表情添加(开启|关闭)$/;
        let str = await tool.getText(e);
        const match = str.match(reg);
        const state = match[2];
        let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml');
        Cfg.add_face = (state == "开启");
        const updateCfg = yaml.dump(Cfg);
        fs.writeFileSync('./plugins/San-plugin/config/config.yaml', updateCfg, 'utf8');
        e.reply(`已${state},手动重启后生效`);
    }

    async facelist(e) {
        let facelist = await getFaceData();
        let keys = Object.keys(facelist);
        let msg = "";
        let t = 1;
        if (!(await isAddOpen())) { msg += `注意: 表情添加已关闭 开启-> \n#san设置表情添加开启 \n`; }
        for (let i of keys) {
            msg += `${t}.  - ${i} - :  ${facelist[i].list.length}项\n`;
            t++;
        }
        let rawList = [`总计${keys.length}个表情`, msg];
        let replymsg = await common.makeForwardMsg(e, rawList, "-表情列表-");
        await sendForwardMsgWithFallback(e, replymsg, rawList, "表情列表");
    }

    async deleteface(e) {
        let reg = /^#?(散|san|San)?表情(删除|删去|去除)(全部项(.*?))?$/;
        const str = await tool.getText(e);
        const match = str.match(reg);
        let isall = !!match[3];
        let facetag = match[4];
        let facelist = await getFaceData();
        let keys = Object.keys(facelist);

        const cleanInnerImages = (msgData) => {
            if (!msgData) return;
            let strData = JSON.stringify(msgData);
            let regex = /data\/San\/face\/images\/[^"'\\]+\.gif/g;
            let fileMatch;
            let deletedCount = 0;
            while ((fileMatch = regex.exec(strData)) !== null) {
                let relativePath = "./" + fileMatch[0];
                let absPath = path.resolve(relativePath);
                if (fs.existsSync(absPath)) {
                    try { 
                        fs.unlinkSync(absPath); 
                        logger.mark(`[San-Plugin] 🗡️已物理超度本地图片: ${absPath}`);
                        deletedCount++;
                    } catch (err) { logger.error(`[San-Plugin] 删除图片失败: ${absPath}`, err); }
                }
            }
            if (deletedCount === 0) {
                logger.mark(`[San-Plugin] 扫描完毕，未发现内部遗留图片需要清理。`);
            }
        };

        if (isall) {
            if (!tool.ismaster(e.user_id)) { e.reply("非主人无法删除全部项"); return; }
            if (facetag == '') { e.reply("需要删除的表情tag为空!"); return; }
            if (!(keys.includes(facetag))) { e.reply(`表情- ${facetag} - 不存在!`); return; }
            
            logger.mark(`[San-Plugin] 启动全部删除指令，目标标签: ${facetag}`);
            for (let i of facelist[facetag].list) {
                if (i?.imageFile) {
                    let regex = /data\/San\/face\/images\/[^"'\\]+\.gif/g;
                    let m = regex.exec(i.imageFile);
                    if (m) {
                        let absPath = path.resolve("./" + m[0]);
                        if (fs.existsSync(absPath)) {
                            try { fs.unlinkSync(absPath); logger.mark(`[San-Plugin] 🗡️已物理超度封面大图: ${absPath}`); } catch (err) {}
                        }
                    }
                }
                if (i?.msg) cleanInnerImages(i.msg);
            }
            
            delete facelist[facetag];
            await tool.JsonWrite(facelist, faceFile);
            e.reply(`已删除- ${facetag} -包含的全部项及所有本地图片`);
        } else {
            let source = e.getReply ? await e.getReply() : (e.source ? (e.isGroup ? (await e.group.getChatHistory(e.source.seq, 1)).pop() : (await e.friend.getChatHistory(e.source.time, 1)).pop()) : null);
            if (!source) { e.reply("请引用消息来删除"); return; }
            let targetRand = source.real_id ? source.message_id : source.rand;
            
            logger.mark(`[San-Plugin] 尝试引用删除，目标 Rand/ID: ${targetRand}`);
            let obj = await tool.readFromJsonFile(faceFile);
            let found = false;
            
            for (let key in obj) {
                if (obj[key].list) {
                    obj[key].list = obj[key].list.filter(item => {
                        if (item.rand && item.rand.includes(targetRand)) {
                            found = true;
                            logger.mark(`[San-Plugin] 🎯命中表情记录！开始执行毁灭打击...`);
                            if (item?.imageFile) {
                                let regex = /data\/San\/face\/images\/[^"'\\]+\.gif/g;
                                let m = regex.exec(item.imageFile);
                                if (m) {
                                    let absPath = path.resolve("./" + m[0]);
                                    if (fs.existsSync(absPath)) {
                                        try { fs.unlinkSync(absPath); logger.mark(`[San-Plugin] 🗡️已物理超度封面大图: ${absPath}`); } catch (err) {}
                                    }
                                }
                            }
                            if (item?.msg) cleanInnerImages(item.msg);
                            return false;
                        }
                        return true;
                    });
                    if (obj[key].list.length === 0) delete obj[key];
                }
            }
            if (!found) { 
                e.reply("没有找到该表情（请确保引用的是最新版生成的图或回执）"); 
                logger.mark(`[San-Plugin] ❌未在记录库中找到该 Rand/ID，已被删除或匹配失效。`);
            } 
            else { await tool.JsonWrite(obj, faceFile); e.reply('已删除该项表情及相关的本地图片'); }
        }
    }

    async laidian(e) {
        let sendNub = laidianNub;
        const msg = await tool.getText(e);
        const reg = /^#?(散|san|San)?来点(.*)$/;
        let match = msg.match(reg);
        if (!match || match[2] == "") { e.reply("表情名称为空!"); return; }
        let obj = await tool.readFromJsonFile(faceFile);
        let facelist = obj[match[2]]?.list;
        if (!facelist) { e.reply("未找到该表情哦"); return; }
        if (facelist.length < 10) { sendNub = facelist.length; }
        let replymsg = [];
        let tempFacelist = [...facelist];
        for (let i = 0; i < sendNub; i++) {
            const randomIndex = Math.floor(Math.random() * tempFacelist.length);
            let face = tempFacelist.splice(randomIndex, 1)[0];
            if (face.type == "image") replymsg.push(segment.image(face.imageFile));
            if (face.type == "other") replymsg.push(JSON.parse(JSON.stringify(face.msg)));
            if (face.type == "text") replymsg.push(face.content);
            if (face.type == "face") replymsg.push(segment.face(face.id));
            if (face.type == "forward") {
                let pristineMsg = JSON.parse(JSON.stringify(face.msg));
                let pristineArr = Array.isArray(pristineMsg) ? pristineMsg : [pristineMsg];
                let hasNested = pristineArr.some(n => {
                    let msgs = Array.isArray(n.message) ? n.message : [n.message];
                    return msgs.some(m => m && (m.type === 'forward' || m.type === 'node'));
                });
                
                if (hasNested) {
                    let imgSeg = await fallbackToImage(e, pristineArr, `嵌套记录片段`, null, true);
                    replymsg.push({ message: [segment.image(imgSeg)], nickname: 'San-Plugin', user_id: e.self_id });
                } else {
                    replymsg.push(...pristineArr);
                }
            }
        }
        let sendmsg = await common.makeForwardMsg(e, replymsg, `-${match[2]}-`);
        await sendForwardMsgWithFallback(e, sendmsg, replymsg, `-${match[2]}-`);
    }

    async facereply(e) {
        if (!fs.existsSync(faceFile) || !(await isAddOpen())) return false;
        let msg = await tool.getText(e);
        const obj = await tool.readFromJsonFile(faceFile);
        let keys = Object.keys(obj);
        if (!keys.includes(msg)) {
            let match = (msg || "").match(/^#(.*)$/);
            if (match && keys.includes(match[1])) { msg = match[1]; } else { return false; }
        }
        logger.info(`San-plugin表情回复 匹配到 ${msg}`);
        let indexArr = [];
        let list = obj[msg].list;
        if (await isFaceGroupApart()) {
            if (e.isGroup) {
                list.forEach((item, i) => { if (!item.belong || item.belong.length == 0 || item.belong.includes(e.group_id)) indexArr.push(i); });
            } else {
                if (!(await tool.ismaster(e.user_id))) { logger.info(`群组分离开启,非主人禁止私聊`); return false; }
                list.forEach((_, i) => indexArr.push(i));
            }
        } else { list.forEach((_, i) => indexArr.push(i)); }

        if (indexArr.length < 1) return false;
        let face = list[indexArr[Math.floor(Math.random() * indexArr.length)]];
        let addTime = face?.time || null;

        let sendmsg;
        if (face.type == "image") sendmsg = await e.reply([segment.image(face.imageFile)]);
        if (face.type == "other") {
            let pristineMsg = face.msg; 
            let clonedMsg = JSON.parse(JSON.stringify(pristineMsg)); 
            let rawMsg = Array.isArray(clonedMsg) ? clonedMsg : [clonedMsg];
            let pristineArr = Array.isArray(pristineMsg) ? pristineMsg : [pristineMsg];
            sendmsg = await sendForwardMsgWithFallback(e, rawMsg, pristineArr, msg, addTime);
        }
        if (face.type == "forward") {
            let pristineMsg = face.msg;
            let pristineArr = Array.isArray(pristineMsg) ? pristineMsg : [pristineMsg];
            
            let hasNested = pristineArr.some(n => {
                let msgs = Array.isArray(n.message) ? n.message : [n.message];
                return msgs.some(m => m && (m.type === 'forward' || m.type === 'node'));
            });

            if (hasNested) {
                e.reply(`[San-Plugin] 检测到套娃，为绕开腾讯服务器，已接管进行强制渲染！`);
                sendmsg = await fallbackToImage(e, pristineArr, msg, addTime);
            } else {
                let clonedMsg = JSON.parse(JSON.stringify(pristineMsg));
                let Msg = e.isGroup ? await e.group.makeForwardMsg(clonedMsg) : await e.friend.makeForwardMsg(clonedMsg);
                sendmsg = await sendForwardMsgWithFallback(e, Msg, pristineArr, msg, addTime);
            }
        }
        if (face.type == "text") sendmsg = await e.reply(face.content);
        if (face.type == "face") sendmsg = await e.reply(segment.face(face.id));

        let Rand = sendmsg?.data?.message_id || sendmsg?.message_id || sendmsg?.rand;
        if (Rand) {
            if (!face.rand) face.rand = [];
            face.rand.push(Rand);
            if (face.rand.length > 5) face.rand.shift();
            tool.JsonWrite(obj, faceFile);
        } else {
            logger.warn(`[San-Plugin] 未能获取到成功发送消息的回执 Rand，本次发送将无法引用删除。`);
        }
        return false;
    }
}

// **** 辅助方法保持不变 ****
async function isAddOpen() { let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml'); return !!Cfg.add_face; }
async function isAddOnlyOpen() { let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml'); return !!Cfg.add_onlyMaster; }
async function isFaceGroupApart() { let Cfg = await tool.readyaml('./plugins/San-plugin/config/config.yaml'); return !!Cfg.face_groupApart; }
async function getFaceData() { return await tool.readFromJsonFile(faceFile); }

async function safeDownloadImage(url, targetPath) {
    try {
        const response = await axios({ url, method: 'get', responseType: 'arraybuffer' });
        fs.writeFileSync(targetPath, response.data);
    } catch (error) {
        throw new Error(`下载异常: ${error.message}`);
    }
}

async function extractAndDownloadMsg(e) {
    let rawMsg = e.message || [];
    let isForward = false;
    
    const getUid = (node) => Number(node.sender?.user_id || node.user_id || node.sender?.uin || node.uin || node.qq) || 10000;
    
    if (rawMsg.length > 0) {
        let first = rawMsg[0];
        let outerContent = first.content || first.data?.content;
        let outerResid = first.id || first.data?.id;

        if (first.type === 'forward' && Array.isArray(outerContent)) {
            isForward = true;
            let normalizedNodes = [];
            for (let item of outerContent) {
                normalizedNodes.push({
                    message: item.message,
                    nickname: item.sender?.nickname || item.nickname || '转发',
                    user_id: getUid(item),
                    time: item.time
                });
            }
            rawMsg = normalizedNodes;
        } else if ((first.type === 'forward' && outerResid) || (first.type === 'json' && typeof first.data === 'string' && first.data.includes('com.tencent.multimsg'))) {
            isForward = true;
            let resid = outerResid;
            if (!resid) {
                try { resid = JSON.parse(first.data)?.meta?.detail?.resid; } catch (err) {}
            }
            if (resid) {
                let forwardData;
                if (e.isGroup && e.group?.getForwardMsg) forwardData = await e.group.getForwardMsg(resid);
                else if (e.friend?.getForwardMsg) forwardData = await e.friend.getForwardMsg(resid);
                
                if (forwardData && Array.isArray(forwardData)) {
                    let normalizedNodes = [];
                    for (let item of forwardData) {
                        normalizedNodes.push({
                            message: item.message,
                            nickname: item.nickname || '转发',
                            user_id: getUid(item),
                            time: item.time
                        });
                    }
                    rawMsg = normalizedNodes;
                }
            }
        }
    }

    let downloadCache = new Map();

    async function processElements(elements) {
        let result = [];
        for (let item of elements) {
            if (!item) continue;
            let clonedItem = JSON.parse(JSON.stringify(item));
            
            if (clonedItem.raw_message) delete clonedItem.raw_message;

            if (clonedItem.type === 'image') {
                let targetHttpUrl = null;
                let targetBase64 = null;
                let getStr = (obj, key) => (obj && typeof obj[key] === 'string') ? obj[key] : null;
                let possibleVals = [
                    getStr(clonedItem, 'url'), getStr(clonedItem, 'file'), getStr(clonedItem, 'base64'),
                    getStr(clonedItem.data, 'url'), getStr(clonedItem.data, 'file'), getStr(clonedItem.data, 'base64')
                ];
                
                for (let val of possibleVals) {
                    if (!val) continue;
                    if (val.startsWith('http')) targetHttpUrl = val;
                    else if (val.startsWith('base64://') || val.startsWith('data:image') || val.length > 200) targetBase64 = val;
                }

                let imageFile, isSaved = false;
                let imgAbsDir = path.resolve('./data/San/face/images');
                if (!fs.existsSync(imgAbsDir)) fs.mkdirSync(imgAbsDir, { recursive: true });

                if (targetHttpUrl) {
                    let uniqueId = targetHttpUrl.replace(/&rkey=[^&]+/, '');
                    if (downloadCache.has(uniqueId)) {
                        imageFile = downloadCache.get(uniqueId);
                        isSaved = true;
                    } else {
                        imageFile = path.join(imgAbsDir, `${tool.getId()}.gif`);
                        try {
                            await safeDownloadImage(targetHttpUrl, imageFile);
                            downloadCache.set(uniqueId, imageFile);
                            isSaved = true;
                        } catch (err) {}
                    }
                } else if (targetBase64) {
                    imageFile = path.join(imgAbsDir, `${tool.getId()}.gif`);
                    try {
                        let b64Data = targetBase64.replace(/^base64:\/\//i, '').replace(/^data:image\/[a-z]+;base64,/i, '').replace(/\s+/g, '');
                        fs.writeFileSync(imageFile, Buffer.from(b64Data, 'base64'));
                        isSaved = true;
                    } catch (err) {}
                }

                if (isSaved) {
                    let cleanHugeStrings = (obj) => {
                        if (!obj) return;
                        for (let k in obj) { if (typeof obj[k] === 'string' && obj[k].length > 200) delete obj[k]; }
                    };
                    cleanHugeStrings(clonedItem);
                    cleanHugeStrings(clonedItem.data);

                    let finalRelativePath = `./data/San/face/images/${path.basename(imageFile)}`;
                    if (clonedItem.data) {
                        clonedItem.data.file = finalRelativePath; delete clonedItem.data.url; delete clonedItem.data.base64;
                    } else {
                        clonedItem.file = finalRelativePath; delete clonedItem.url; delete clonedItem.base64;
                    }
                }
                result.push(clonedItem);
            } 
            else if (clonedItem.type === 'forward') {
                let nestedContent = clonedItem.content || clonedItem.data?.content;
                let resid = clonedItem.id || clonedItem.data?.id;
                let forwardData = null;

                if (Array.isArray(nestedContent)) {
                    forwardData = nestedContent;
                } else if (resid) {
                    if (e.isGroup && e.group?.getForwardMsg) forwardData = await e.group.getForwardMsg(resid);
                    else if (e.friend?.getForwardMsg) forwardData = await e.friend.getForwardMsg(resid);
                }

                if (forwardData && Array.isArray(forwardData)) {
                    let normalizedNodes = [];
                    for (let n of forwardData) {
                        normalizedNodes.push({
                            message: n.message,
                            nickname: n.sender?.nickname || n.nickname || '转发',
                            user_id: getUid(n), 
                            time: n.time
                        });
                    }
                    let processedInner = await processElements(normalizedNodes);
                    clonedItem = {
                        type: 'forward',
                        data: { content: processedInner }
                    };
                    result.push(clonedItem);
                } else {
                    result.push(clonedItem);
                }
            }
            else if (clonedItem.message || clonedItem.data?.message) {
                let innerMsg = clonedItem.message || clonedItem.data?.message;
                let innerArray = Array.isArray(innerMsg) ? innerMsg : [innerMsg];
                let processedInner = await processElements(innerArray);
                
                if (clonedItem.data && clonedItem.data.message) clonedItem.data.message = processedInner;
                else if (clonedItem.message) clonedItem.message = processedInner;
                
                result.push(clonedItem);
            }
            else {
                result.push(clonedItem);
            }
        }
        return result;
    }

    let processed = await processElements(rawMsg);
    
    let type = 'other';
    if (isForward || processed.some(i => i.nickname && i.message)) {
        type = 'forward';
    } else if (processed.length === 1 && processed[0].type === 'image') {
        type = 'image';
    }
    
    return { type, msg: processed };
}

async function HandelFace(e, tag, isglobal) {
    let Rand = e.real_id ? e.message_id : e.rand;
    let date = await tool.readFromJsonFile(faceFile);
    let BascialDate = { 'user_id': e.user_id, 'time': tool.convertTime(Date.now(), 0), 'belong': (e.isGroup && !isglobal) ? [e.group_id] : [], 'rand': [Rand] };

    let extracted = await extractAndDownloadMsg(e);
    BascialDate.type = extracted.type;
    
    if (extracted.type === 'image') {
        BascialDate.imageFile = extracted.msg[0].file || extracted.msg[0].data?.file;
    } else {
        BascialDate.msg = extracted.msg;
    }

    if (!date[tag]) date[tag] = { list: [] };
    date[tag].list.push(BascialDate);
    tool.JsonWrite(date, faceFile);
    e.reply(`- ${tag} -添加成功`);
}

async function sendForwardMsgWithFallback(e, forwardMsg, rawList, title, addTime = null) {
    let code, isFailed = false;
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SEND_TIMEOUT')), 10000));
        code = await Promise.race([e.reply(forwardMsg), timeoutPromise]);
        if (!code || code.errMsg || code.error) isFailed = true;
    } catch (error) {
        isFailed = true;
        e.reply(`[San-Plugin] 发送合并转发${error.message === 'SEND_TIMEOUT' ? '超时(10s)' : '异常'}，准备触发转图兜底`);
    }

    if (isFailed) {
        try { return await fallbackToImage(e, rawList, title, addTime); }
        catch (err) { 
            e.reply(`[San-Plugin] 降级转图失败: ${err.message || err}`); 
            return await e.reply("发送被风控拦截且转图失败。"); 
        }
    }
    return code;
}

async function fallbackToImage(e, rawList, title, addTime = null, returnSegment = false) {
 
    const formatTime = (ts) => {
        if (!ts) return '';
        const date = new Date(ts * 1000);
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        const h = date.getHours().toString().padStart(2, '0');
        const min = date.getMinutes().toString().padStart(2, '0');
        return `${m}-${d} ${h}:${min}`;
    };

    const strToColor = (str) => {
        let hash = 0;
        for (let i = 0; i < (str?.length || 0); i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
        return `hsl(${Math.abs(hash) % 360}, 45%, 75%)`;
    };

    const recursiveRenderNodes = (elements, depth = 0) => {
        let content = '';
        if (!elements) return content;
        
        let nodesArray = Array.isArray(elements) ? elements : [elements];
        for (let item of nodesArray) {
            if (!item) continue;
            const fakeAvatarIds = [10000, 1094950020];

            if (typeof item === 'string' || item.type === 'text') {
                let txt = typeof item === 'string' ? item : (item.text || item.data?.text || '');
                content += `<div style="white-space: pre-wrap; margin: 0; padding: 0;">${txt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
            } 
            else if (item.type === 'image') {
                let url = item.file || item.data?.file || item.url || item.data?.url;
                if (url) {
                    if (url.startsWith('base64://')) { url = url.replace('base64://', 'data:image/png;base64,'); } 
                    else if (!url.startsWith('http')) {
                        let absPath = path.resolve(url).replace(/\\/g, '/');
                        if (!absPath.startsWith('/')) absPath = '/' + absPath;
                        url = encodeURI(`file://${absPath}`);
                    }
                    content += `<img src="${url}" style="max-width:250px; border-radius:6px; margin: 4px 0; display:block;"/>`;
                }
            }
            else if (item.type === 'json' && item.data) {
                try {
                    let p = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
                    if (p.app === 'com.tencent.multimsg' && p.meta?.detail?.news) {
                        let newsHtml = p.meta.detail.news.map(n => `<div style="color:#666; font-size:12px; margin-bottom:2px;">• ${n.text}</div>`).join('');
                        content += `<div style="background:rgba(0,0,0,0.03); padding:8px; border-radius:4px; margin:4px 0; border:1px dashed #ccc;">${newsHtml}</div>`;
                    } else {
                        content += `<div style="color:#999; font-size:12px;">[卡片消息: ${p.desc || p.app || '未知'}]</div>`;
                    }
                } catch (err) { content += `<div style="color:#999; font-size:12px;">[卡片消息解析失败]</div>`; }
            }
            else if (item.type === 'forward' || item.type === 'node' || item.message || item.data?.message) {
                let innerElements = item.type === 'forward' ? (item.content || item.data?.content) : (item.message || item.data?.message);
                let senderName = item.nickname || item.data?.nickname || item.name || item.data?.name || item.sender?.nickname || (item.type === 'forward' ? '[嵌套的聊天记录]' : '转发消息');
                
                // 提取userId
                let userId = Number(item.user_id || item.data?.user_id || item.uin || item.sender?.user_id) || 10000;
                // 提取精确时间
                let msgTime = item.time || item.data?.time || null;

                if (innerElements) {
                    let innerContent = recursiveRenderNodes(innerElements, depth + 1);
                    
                    // 视觉递进色阶
                    let bgColors = ['#f4f5f7', '#e6e8eb', '#dee2e6', '#d6dadd', '#ced4da'];
                    let borderColors = ['#c0c4cc', '#adb5bd', '#9ca3af', '#868e96', '#727981'];
                    let bg = bgColors[depth % bgColors.length];
                    let border = borderColors[depth % borderColors.length];
                    
                    let avatarSize = Math.max(20, 28 - depth * 2);
                    let avatarHtml = '';
                    if (senderName !== '[嵌套的聊天记录]') {
                        if (fakeAvatarIds.includes(userId)) {
                            const nameArray = senderName ? [...senderName] : ['?'];
                            const firstChar = nameArray[0];
                            const bgColor = strToColor(senderName);
                            avatarHtml = `<div style="width:${avatarSize}px; height:${avatarSize}px; border-radius:50%; margin-right:8px; background:${bgColor}; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:${Math.max(10, avatarSize*0.6)}px; border:1px solid rgba(0,0,0,0.1);">${firstChar}</div>`;
                        } else {
                            avatarHtml = `<img src="https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=100" style="width:${avatarSize}px; height:${avatarSize}px; border-radius:50%; margin-right:8px; border:1px solid rgba(0,0,0,0.1);" />`;
                        }
                    }

                    content += `<div style="margin:0; padding:8px 12px; background:${bg}; border-radius:0; border-left:3px solid ${border}; display:flex; flex-direction:row; align-items:flex-start;">
                        <div style="display:flex; align-items:center; height:100%;">${avatarHtml}</div>
                        <div style="flex:1; min-width:0;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="color:#666; font-size:${Math.max(11, 13-depth)}px; font-weight:bold;">${senderName}</span>
                                <span style="color:#adb5bd; font-size:11px; margin-left:8px; font-weight:normal;">${formatTime(msgTime)}</span>
                            </div>
                            <div style="margin:0; padding:0;">${innerContent}</div>
                        </div>
                    </div>`;
                }
            }
        }
        return content;
    };

    let fullContent = rawList.map(item => recursiveRenderNodes(item, 0)).join('');
    let htmlBody = `<div style="background:#f4f5f7; border-radius:12px; overflow:hidden; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.05);">${fullContent}</div>`;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; background: #f0f2f5; padding: 20px; width: 620px; margin:0;}
        .box { background: #fff; border-radius: 18px; padding: 15px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
        .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 15px; }
        .t { font-size: 22px; font-weight: bold; color: #111; margin: 0; }
        .add-time { font-size: 13px; color: #adb5bd; }
    </style></head><body><div class="box">
        <div class="header-container"><div class="t">${title}</div>${addTime ? `<div class="add-time">添加日期：${addTime}</div>` : ''}</div>
        ${htmlBody}
    </div></body></html>`;

    // 使用唯一文件名，解决缓存和文件冲突问题
    const tempId = Date.now() + Math.floor(Math.random() * 1000);
    const tplPath = path.resolve(`./data/San/face/temp_render_${tempId}.html`);
    
    const dir = path.dirname(tplPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(tplPath, html, 'utf8');

    let img;
    try {
        img = await puppeteer.screenshot('SanFace', { tplFile: tplPath });
    } finally {
        if (fs.existsSync(tplPath)) {
            try { fs.unlinkSync(tplPath); } catch (e) {}
        }
    }

    return returnSegment ? img : await e.reply(img);
}